import { prisma } from '../db/client.js';
import { pool } from '../db/pool.js';
import { createUser, findUserByEmail } from '../db/userRepository.js';
import { getCategoryChanges } from './categoryChangesService.js';
import { RateServiceError } from './currencyConversionService.js';
import type { FetchRates } from './frankfurterClient.js';

const EMAIL = 'category-changes-service@example.com';
// Unusual codes so the tests never touch real cached rates.
const HOME = 'ZYB';
const FOREIGN = 'ZYC';

function tx(userId: string, date: string, amountCents: number, counterparty: string, currency = HOME) {
  return { userId, date: new Date(`${date}T00:00:00Z`), amountCents, currency, counterparty, details: 'Test' };
}

const noRates: FetchRates = async () => [];

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

describe('getCategoryChanges', () => {
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
    await pool.end();
  });

  it('compares the latest month up to its last transaction day with the same days of the month before (Test Case 12)', async () => {
    await prisma.transaction.createMany({
      data: [
        tx(userId, '2026-08-05', -10000, 'REWE Markt'),
        tx(userId, '2026-08-25', -10000, 'REWE Markt'), // after day 10, so not compared
        tx(userId, '2026-09-10', -15000, 'REWE Markt'),
      ],
    });

    const result = await getCategoryChanges(userId, HOME, noRates);

    expect(result).toEqual({
      month: '2026-09',
      currency: HOME,
      hasTransactions: true,
      changes: [{ category: 'groceries', direction: 'up', amountCents: 5000 }],
    });
  });

  it('reports no transactions without calling the rate API', async () => {
    const api = fakeApi({});

    const result = await getCategoryChanges(userId, HOME, api.fetchRates);

    expect(result).toMatchObject({ currency: HOME, hasTransactions: false, changes: [] });
    expect(api.calls).toHaveLength(0);
  });

  it('defaults to EUR when the user has no transactions and asks for no currency', async () => {
    const result = await getCategoryChanges(userId, undefined, noRates);

    expect(result.currency).toBe('EUR');
  });

  it('converts each foreign transaction at the rate of its own day (Test Case 18)', async () => {
    await prisma.transaction.createMany({
      data: [
        tx(userId, '2026-08-05', -10000, 'REWE Markt', FOREIGN), // 2.0 -> -20000
        tx(userId, '2026-09-10', -15000, 'REWE Markt', FOREIGN), // 3.0 -> -45000
      ],
    });
    const api = fakeApi({ '2026-08-05': 2, '2026-09-10': 3 });

    const result = await getCategoryChanges(userId, HOME, api.fetchRates);

    expect(result.changes).toEqual([{ category: 'groceries', direction: 'up', amountCents: 25000 }]);
    expect(api.calls).toEqual([[FOREIGN, HOME, '2026-08-05', '2026-09-10']]);
  });

  it('fails when a rate is unavailable, rather than reporting incomplete changes', async () => {
    await prisma.transaction.createMany({
      data: [tx(userId, '2026-09-10', -15000, 'REWE Markt', FOREIGN)],
    });

    await expect(getCategoryChanges(userId, HOME, noRates)).rejects.toThrow(RateServiceError);
  });

  it('lets a refund reduce the spending of its category (Test Case 6)', async () => {
    await prisma.transaction.createMany({
      data: [
        tx(userId, '2026-08-12', -4899, 'Amazon'),
        tx(userId, '2026-08-14', 1899, 'Amazon'), // refund: August shopping is 30.00 net
        tx(userId, '2026-09-14', -8995, 'Zara'),
      ],
    });

    const result = await getCategoryChanges(userId, HOME, noRates);

    expect(result.changes).toEqual([{ category: 'shopping', direction: 'up', amountCents: 5995 }]);
  });

  it('leaves income out of the changes (Test Case 17)', async () => {
    await prisma.transaction.createMany({
      data: [
        tx(userId, '2026-08-01', 320000, 'Acme GmbH'),
        tx(userId, '2026-09-01', 320000, 'Acme GmbH'),
        tx(userId, '2026-09-10', 12000, 'Acme GmbH'),
      ],
    });

    const result = await getCategoryChanges(userId, HOME, noRates);

    expect(result).toMatchObject({ hasTransactions: true, changes: [] });
  });

  it('shows everything as an increase when there is no earlier month (Test Case 14)', async () => {
    await prisma.transaction.createMany({
      data: [tx(userId, '2026-09-02', -110000, 'Sunrise Estates'), tx(userId, '2026-09-10', -5000, 'REWE Markt')],
    });

    const result = await getCategoryChanges(userId, HOME, noRates);

    expect(result.changes).toEqual([
      { category: 'housing', direction: 'up', amountCents: 110000 },
      { category: 'groceries', direction: 'up', amountCents: 5000 },
    ]);
  });
});
