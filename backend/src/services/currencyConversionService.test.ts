import { prisma } from '../db/client.js';
import { pool } from '../db/pool.js';
import {
  getRate,
  getRates,
  getRatesWithFallback,
  convertCents,
  InvalidCurrencyError,
  RateServiceError,
} from './currencyConversionService.js';
import type { FetchRates } from './frankfurterClient.js';

// Rates for an unusual pair so the tests never touch real cached data.
const FROM = 'ZZA';
const TO = 'ZZB';

function fakeApi(rates: Record<string, number>) {
  const calls: [string, string, string, string][] = [];
  const fetchRates: FetchRates = async (base, quote, from, to) => {
    calls.push([base, quote, from, to]);
    return Object.entries(rates)
      .filter(([date]) => date >= from && date <= to)
      .map(([date, rate]) => ({ date, rate }));
  };
  return { fetchRates, calls };
}

const failingApi: FetchRates = async () => {
  throw new RateServiceError('Rate API is down');
};

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe('currency conversion service', () => {
  beforeEach(async () => {
    await prisma.exchangeRate.deleteMany({ where: { base: FROM } });
  });

  afterAll(async () => {
    await prisma.exchangeRate.deleteMany({ where: { base: FROM } });
    await prisma.$disconnect();
    await pool.end();
  });

  it('fetches a rate once and serves later requests from the database', async () => {
    const api = fakeApi({ '2026-08-03': 0.9 });

    expect(await getRate(FROM, TO, '2026-08-03', api.fetchRates)).toBe(0.9);
    expect(await getRate(FROM, TO, '2026-08-03', api.fetchRates)).toBe(0.9);

    expect(api.calls).toHaveLength(1);
    expect(await prisma.exchangeRate.count({ where: { base: FROM } })).toBe(1);
  });

  it('fetches all missing days in one request and only the missing ones afterwards', async () => {
    const api = fakeApi({ '2026-08-01': 0.9, '2026-08-02': 0.91, '2026-08-03': 0.92, '2026-08-04': 0.93 });

    const first = await getRates(FROM, TO, ['2026-08-01', '2026-08-03', '2026-08-02'], api.fetchRates);
    const second = await getRates(FROM, TO, ['2026-08-02', '2026-08-04'], api.fetchRates);

    expect([...first.entries()]).toEqual([['2026-08-01', 0.9], ['2026-08-02', 0.91], ['2026-08-03', 0.92]]);
    expect(second.get('2026-08-04')).toBe(0.93);
    expect(api.calls).toEqual([
      [FROM, TO, '2026-08-01', '2026-08-03'],
      [FROM, TO, '2026-08-04', '2026-08-04'],
    ]);
  });

  it('does not call the API for the same currency', async () => {
    const api = fakeApi({});

    expect(await convertCents(1234, 'eur', 'EUR', '2026-08-03', api.fetchRates)).toBe(1234);
    expect(api.calls).toHaveLength(0);
  });

  it('converts cents and treats currency codes case-insensitively', async () => {
    const api = fakeApi({ '2026-08-03': 0.9 });

    expect(await convertCents(-1000, FROM.toLowerCase(), TO, '2026-08-03', api.fetchRates)).toBe(-900);
  });

  it('does not cache today\'s rate', async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const api = fakeApi({ [todayIso]: 0.9 });

    await getRate(FROM, TO, todayIso, api.fetchRates);
    await getRate(FROM, TO, todayIso, api.fetchRates);

    expect(api.calls).toHaveLength(2);
    expect(await prisma.exchangeRate.count({ where: { base: FROM } })).toBe(0);
  });

  it('fails and caches nothing when the API has no rate for a requested day', async () => {
    const api = fakeApi({ '2026-08-01': 0.9 });

    await expect(getRates(FROM, TO, ['2026-08-01', '2026-08-02'], api.fetchRates)).rejects.toThrow(RateServiceError);
    expect(await prisma.exchangeRate.count({ where: { base: FROM } })).toBe(0);
  });

  it('rejects malformed currency codes without calling the API', async () => {
    const api = fakeApi({});

    await expect(getRate('EURO', 'USD', '2026-08-03', api.fetchRates)).rejects.toThrow(InvalidCurrencyError);
    expect(api.calls).toHaveLength(0);
  });

  it('uses yesterday\'s cached rate for today when the API is down, and marks today approximate (Criterion 1)', async () => {
    const today = daysAgo(0);
    await prisma.exchangeRate.create({ data: { base: FROM, quote: TO, date: new Date(`${daysAgo(1)}T00:00:00Z`), rate: 0.9 } });

    const result = await getRatesWithFallback(FROM, TO, [today], failingApi);

    expect(result.rates.get(today)).toBe(0.9);
    expect([...result.approximateDays]).toEqual([today]);
  });

  it('marks no day approximate when the API has every rate (Criterion 2)', async () => {
    const api = fakeApi({ '2026-08-03': 0.9 });

    const result = await getRatesWithFallback(FROM, TO, ['2026-08-03'], api.fetchRates);

    expect(result.rates.get('2026-08-03')).toBe(0.9);
    expect(result.approximateDays.size).toBe(0);
  });

  it('uses a cached rate that is 7 days older but not one that is 8 days older (Criterion 3)', async () => {
    const today = daysAgo(0);
    await prisma.exchangeRate.create({ data: { base: FROM, quote: TO, date: new Date(`${daysAgo(7)}T00:00:00Z`), rate: 0.9 } });
    expect((await getRatesWithFallback(FROM, TO, [today], failingApi)).rates.get(today)).toBe(0.9);

    await prisma.exchangeRate.deleteMany({ where: { base: FROM } });
    await prisma.exchangeRate.create({ data: { base: FROM, quote: TO, date: new Date(`${daysAgo(8)}T00:00:00Z`), rate: 0.9 } });
    await expect(getRatesWithFallback(FROM, TO, [today], failingApi)).rejects.toThrow(RateServiceError);
  });

  it('fails when no rate of the pair is cached (Criterion 4)', async () => {
    await expect(getRatesWithFallback(FROM, TO, [daysAgo(0)], failingApi)).rejects.toThrow(RateServiceError);
  });

  it('does not store a fallback rate, so the real rate is cached later (Criterion 5)', async () => {
    await prisma.exchangeRate.create({ data: { base: FROM, quote: TO, date: new Date('2026-08-01T00:00:00Z'), rate: 0.9 } });

    const fallback = await getRatesWithFallback(FROM, TO, ['2026-08-03'], failingApi);

    expect(fallback.rates.get('2026-08-03')).toBe(0.9);
    expect(await prisma.exchangeRate.count({ where: { base: FROM } })).toBe(1);

    const api = fakeApi({ '2026-08-03': 0.95 });
    const real = await getRatesWithFallback(FROM, TO, ['2026-08-03'], api.fetchRates);

    expect(real.rates.get('2026-08-03')).toBe(0.95);
    expect(real.approximateDays.size).toBe(0);
    expect(await prisma.exchangeRate.count({ where: { base: FROM } })).toBe(2);
  });

  it('keeps and stores the rates the API returned and falls back only for the missing day (Criterion 6)', async () => {
    await prisma.exchangeRate.create({ data: { base: FROM, quote: TO, date: new Date('2026-08-01T00:00:00Z'), rate: 0.9 } });
    const api = fakeApi({ '2026-08-02': 0.91 });

    const result = await getRatesWithFallback(FROM, TO, ['2026-08-02', '2026-08-03'], api.fetchRates);

    expect(result.rates.get('2026-08-02')).toBe(0.91);
    expect(result.rates.get('2026-08-03')).toBe(0.91);
    expect([...result.approximateDays]).toEqual(['2026-08-03']);
    expect(await prisma.exchangeRate.count({ where: { base: FROM, date: new Date('2026-08-02T00:00:00Z') } })).toBe(1);
  });

  it('does not hide an invalid currency behind a fallback', async () => {
    await prisma.exchangeRate.create({ data: { base: FROM, quote: TO, date: new Date(`${daysAgo(1)}T00:00:00Z`), rate: 0.9 } });
    const rejectingApi: FetchRates = async () => {
      throw new InvalidCurrencyError('Unknown currency');
    };

    await expect(getRatesWithFallback(FROM, TO, [daysAgo(0)], rejectingApi)).rejects.toThrow(InvalidCurrencyError);
    await expect(getRatesWithFallback('EURO', 'USD', ['2026-08-03'], failingApi)).rejects.toThrow(InvalidCurrencyError);
  });
});
