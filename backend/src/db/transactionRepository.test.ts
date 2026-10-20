import { prisma } from "./client.js";
import { importTransactions } from "./transactionRepository.js";
import { createUser, findUserByEmail } from "./userRepository.js";
import type { ParsedRow } from "../domain/transactions/parseBankCsv.js";

const USER_EMAIL = "txrepo-a@example.com";
const OTHER_USER_EMAIL = "txrepo-b@example.com";

const COFFEE: ParsedRow = {
  date: "2026-08-03",
  amountCents: -380,
  currency: "EUR",
  counterparty: "Café Luna",
  details: "Card payment coffee",
};
const SALARY: ParsedRow = {
  date: "2026-08-01",
  amountCents: 320000,
  currency: "EUR",
  counterparty: "Acme GmbH",
  details: "Salary August",
};

async function createTestUser(email: string) {
  await createUser(email, "hashed-password");
  const user = await findUserByEmail(email);
  return user!.id;
}

describe("importTransactions", () => {
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    userId = await createTestUser(USER_EMAIL);
    otherUserId = await createTestUser(OTHER_USER_EMAIL);
  });

  afterEach(async () => {
    // Transactions are removed with their user (cascade delete).
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, OTHER_USER_EMAIL] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores the rows for the user with exact values", async () => {
    const result = await importTransactions(userId, [SALARY, COFFEE]);

    expect(result).toEqual({ imported: 2, duplicates: 0 });
    const stored = await prisma.transaction.findMany({ where: { userId }, orderBy: { date: "asc" } });
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      amountCents: 320000,
      currency: "EUR",
      counterparty: "Acme GmbH",
      details: "Salary August",
      source: "csv",
      externalId: null,
    });
    expect(stored[0].date.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(stored[1].amountCents).toBe(-380);
  });

  it("skips rows that were already imported", async () => {
    await importTransactions(userId, [SALARY, COFFEE]);

    const result = await importTransactions(userId, [SALARY, COFFEE]);

    expect(result).toEqual({ imported: 0, duplicates: 2 });
    expect(await prisma.transaction.count({ where: { userId } })).toBe(2);
  });

  it("imports identical rows from the same file, and skips both when the file is uploaded again", async () => {
    const first = await importTransactions(userId, [COFFEE, COFFEE]);
    const second = await importTransactions(userId, [COFFEE, COFFEE]);

    expect(first).toEqual({ imported: 2, duplicates: 0 });
    expect(second).toEqual({ imported: 0, duplicates: 2 });
    expect(await prisma.transaction.count({ where: { userId } })).toBe(2);
  });

  it("imports only the new rows of an overlapping file", async () => {
    await importTransactions(userId, [SALARY]);

    const result = await importTransactions(userId, [SALARY, COFFEE]);

    expect(result).toEqual({ imported: 1, duplicates: 1 });
  });

  it("ignores case and extra whitespace when matching duplicates", async () => {
    await importTransactions(userId, [COFFEE]);

    const result = await importTransactions(userId, [
      { ...COFFEE, counterparty: "  CAFÉ   luna ", details: "card payment  COFFEE" },
    ]);

    expect(result).toEqual({ imported: 0, duplicates: 1 });
  });

  it("does not treat a different date or amount as a duplicate", async () => {
    await importTransactions(userId, [COFFEE]);

    const result = await importTransactions(userId, [
      { ...COFFEE, date: "2026-08-04" },
      { ...COFFEE, amountCents: -390 },
    ]);

    expect(result).toEqual({ imported: 2, duplicates: 0 });
  });

  it("keeps each user's transactions separate: another user's rows are not duplicates", async () => {
    await importTransactions(userId, [SALARY, COFFEE]);

    const result = await importTransactions(otherUserId, [SALARY, COFFEE]);

    expect(result).toEqual({ imported: 2, duplicates: 0 });
    expect(await prisma.transaction.count({ where: { userId } })).toBe(2);
    expect(await prisma.transaction.count({ where: { userId: otherUserId } })).toBe(2);
  });

  it("returns zero counts for no rows", async () => {
    expect(await importTransactions(userId, [])).toEqual({ imported: 0, duplicates: 0 });
  });

  it("stores none of the rows when one of them cannot be stored", async () => {
    const tooLargeForColumn = { ...COFFEE, details: "overflow", amountCents: 3_000_000_000 };

    await expect(importTransactions(userId, [SALARY, tooLargeForColumn])).rejects.toThrow();

    expect(await prisma.transaction.count({ where: { userId } })).toBe(0);
  });
});
