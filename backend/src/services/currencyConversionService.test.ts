import { prisma } from '../db/client.js';
import { getRate, getRates, convertCents, InvalidCurrencyError, RateServiceError } from './currencyConversionService.js';
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

describe('currency conversion service', () => {
  beforeEach(async () => {
    await prisma.exchangeRate.deleteMany({ where: { base: FROM } });
  });

  afterAll(async () => {
    await prisma.exchangeRate.deleteMany({ where: { base: FROM } });
    await prisma.$disconnect();
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
});
