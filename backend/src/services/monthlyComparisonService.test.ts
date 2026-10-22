import { prisma } from '../db/client.js';
import { createUser, findUserByEmail } from '../db/userRepository.js';
import { RateServiceError } from './currencyConversionService.js';
import type { FetchRates } from './frankfurterClient.js';
import { getMonthlyComparison } from './monthlyComparisonService.js';

const EMAIL = 'comparison-service@example.com';
// Unusual codes so the tests never touch real cached rates.
const HOME = 'ZYB';
const FOREIGN = 'ZYA';

function tx(userId: string, date: string, amountCents: number, currency: string) {
  return { userId, date: new Date(`${date}T00:00:00Z`), amountCents, currency, counterparty: 'Shop', details: 'Test' };
}

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

describe('getMonthlyComparison', () => {
  let userId: string;

  beforeEach(async () => {
    await createUser(EMAIL, 'hashed-password');
    userId = (await findUserByEmail(EMAIL))!.id;
    await prisma.exchangeRate.deleteMany({ where: { base: FOREIGN } });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.exchangeRate.deleteMany({ where: { base: FOREIGN } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('converts each foreign transaction at its own day with one API request for both months', async () => {
    await prisma.transaction.createMany({
      data: [
        tx(userId, '2026-07-10', -500, FOREIGN),
        tx(userId, '2026-08-12', -1000, FOREIGN),
        tx(userId, '2026-08-01', -100, HOME),
      ],
    });
    const api = fakeApi({ '2026-07-10': 2, '2026-08-12': 3 });

    const result = await getMonthlyComparison(userId, '2026-08', HOME, api.fetchRates);

    expect(result.previous.spendingCents).toBe(1000);
    expect(result.current.spendingCents).toBe(3100);
    expect(api.calls).toEqual([[FOREIGN, HOME, '2026-07-10', '2026-08-12']]);
  });

  it('does not call the API again once the rates are cached', async () => {
    await prisma.transaction.createMany({ data: [tx(userId, '2026-08-12', -1000, FOREIGN)] });
    const api = fakeApi({ '2026-08-12': 3 });

    await getMonthlyComparison(userId, '2026-08', HOME, api.fetchRates);
    await getMonthlyComparison(userId, '2026-08', HOME, api.fetchRates);

    expect(api.calls).toHaveLength(1);
  });

  it('defaults to EUR when the user has no transactions', async () => {
    const result = await getMonthlyComparison(userId, '2026-08', undefined, fakeApi({}).fetchRates);

    expect(result.currency).toBe('EUR');
  });

  it('fails when a rate is unavailable, rather than reporting incomplete totals', async () => {
    await prisma.transaction.createMany({ data: [tx(userId, '2026-08-12', -1000, FOREIGN)] });

    await expect(getMonthlyComparison(userId, '2026-08', HOME, fakeApi({}).fetchRates)).rejects.toThrow(
      RateServiceError,
    );
  });
});
