import { prisma } from '../db/client.js';
import { pool } from '../db/pool.js';
import { createUser, findUserByEmail } from '../db/userRepository.js';
import { getCategoryChanges } from './categoryChangesService.js';
import type { FetchRates } from './frankfurterClient.js';

const EMAIL = 'category-changes-service@example.com';
// An unusual code so the test never touches real cached rates.
const HOME = 'ZYB';

function tx(userId: string, date: string, amountCents: number, counterparty: string) {
  return { userId, date: new Date(`${date}T00:00:00Z`), amountCents, currency: HOME, counterparty, details: 'Test' };
}

const noRates: FetchRates = async () => [];

describe('getCategoryChanges', () => {
  let userId: string;

  beforeEach(async () => {
    await createUser(EMAIL, 'hashed-password');
    userId = (await findUserByEmail(EMAIL))!.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
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
});
