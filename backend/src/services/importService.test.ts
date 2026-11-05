import { prisma } from '../db/client.js';
import { pool } from '../db/pool.js';
import { createUser, findUserByEmail } from '../db/userRepository.js';
import { importBankCsv, MAX_DATA_ROWS } from './importService.js';

const EMAIL = 'import-service@example.com';
const HEADER = 'Booking date;Counterparty;Details;Amount;Currency';

function csv(...lines: string[]): string {
  return [HEADER, ...lines].join('\n');
}

describe('importBankCsv', () => {
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

  it('imports valid rows and reports rejected ones', async () => {
    const result = await importBankCsv(
      userId,
      csv('01.07.2026;Shop;Groceries;-12,50;EUR', 'not-a-date;Shop;Broken;-1,00;EUR'),
    );

    expect(result).toEqual({
      kind: 'imported',
      imported: 1,
      duplicates: 0,
      rejected: [{ row: 3, reason: 'invalid-date' }],
    });
    expect(await prisma.transaction.count({ where: { userId } })).toBe(1);
  });

  it('counts rows already imported as duplicates', async () => {
    const file = csv('01.07.2026;Shop;Groceries;-12,50;EUR');
    await importBankCsv(userId, file);

    expect(await importBankCsv(userId, file)).toMatchObject({
      kind: 'imported',
      imported: 0,
      duplicates: 1,
    });
  });

  it('reports a file with missing columns and stores nothing', async () => {
    const result = await importBankCsv(userId, 'Booking date;Amount\n01.07.2026;-1,00');

    expect(result.kind).toBe('missing-columns');
    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);
  });

  it('rejects a file with more than the maximum number of rows and stores nothing', async () => {
    const rows = Array.from({ length: MAX_DATA_ROWS + 1 }, () => '01.07.2026;Shop;Groceries;-1,00;EUR');

    expect(await importBankCsv(userId, csv(...rows))).toEqual({ kind: 'too-many-rows' });
    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);
  });

  it('imports nothing from a file where every row is rejected', async () => {
    const result = await importBankCsv(userId, csv('bad;Shop;Groceries;-1,00;EUR'));

    expect(result).toMatchObject({ kind: 'imported', imported: 0, duplicates: 0 });
  });
});
