import { prisma } from "./client.js";
import { pool } from "./pool.js";
import {
  findLatestTransactionDate,
  findTransactionsInRange,
  importTransactions,
} from "./transactionRepository.js";
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

describe("findTransactionsInRange", () => {
  let userId: string;
  let otherUserId: string;

  const row = (date: string, amountCents: number, currency = "EUR"): ParsedRow => ({
    date,
    amountCents,
    currency,
    counterparty: `Shop ${date}`,
    details: `Test ${amountCents}`,
  });

  beforeEach(async () => {
    userId = await createTestUser(USER_EMAIL);
    otherUserId = await createTestUser(OTHER_USER_EMAIL);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, OTHER_USER_EMAIL] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns every field of the transactions in the range, newest first", async () => {
    await importTransactions(userId, [SALARY, COFFEE, row("2026-08-20", -1000)]);

    const found = await findTransactionsInRange(userId, "2026-08-01", "2026-09-01");

    expect(found.map((t) => t.date)).toEqual(["2026-08-20", "2026-08-03", "2026-08-01"]);
    expect(found[1]).toEqual({
      id: expect.any(String),
      date: "2026-08-03",
      counterparty: "Café Luna",
      details: "Card payment coffee",
      amountCents: -380,
      currency: "EUR",
    });
  });

  it("includes the start date and excludes the end date", async () => {
    await importTransactions(userId, [
      row("2026-07-31", -100),
      row("2026-08-01", -200),
      row("2026-08-31", -300),
      row("2026-09-01", -400),
    ]);

    const found = await findTransactionsInRange(userId, "2026-08-01", "2026-09-01");

    expect(found.map((t) => t.date)).toEqual(["2026-08-31", "2026-08-01"]);
  });

  it("returns every transaction of a day when several share the same date", async () => {
    await importTransactions(userId, [row("2026-08-10", -100), row("2026-08-10", -200)]);

    const found = await findTransactionsInRange(userId, "2026-08-01", "2026-09-01");

    expect(found.map((t) => t.amountCents).sort((x, y) => x - y)).toEqual([-200, -100]);
  });

  it("keeps the signed amount and the original currency of each transaction", async () => {
    await importTransactions(userId, [row("2026-08-05", -1000, "USD"), row("2026-08-06", 2500, "EUR")]);

    const found = await findTransactionsInRange(userId, "2026-08-01", "2026-09-01");

    expect(found.map((t) => [t.amountCents, t.currency])).toEqual([
      [2500, "EUR"],
      [-1000, "USD"],
    ]);
  });

  it("returns an empty list when nothing is in the range", async () => {
    await importTransactions(userId, [SALARY]);

    expect(await findTransactionsInRange(userId, "2026-09-01", "2026-10-01")).toEqual([]);
  });

  it("never returns another user's transactions", async () => {
    await importTransactions(userId, [SALARY]);
    await importTransactions(otherUserId, [{ ...COFFEE, date: "2026-08-15" }]);

    const found = await findTransactionsInRange(userId, "2026-08-01", "2026-09-01");

    expect(found.map((t) => t.date)).toEqual(["2026-08-01"]);
  });
});

describe("findLatestTransactionDate", () => {
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    userId = await createTestUser(USER_EMAIL);
    otherUserId = await createTestUser(OTHER_USER_EMAIL);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, OTHER_USER_EMAIL] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("returns the date of the user's most recent transaction", async () => {
    await importTransactions(userId, [SALARY, COFFEE, { ...COFFEE, date: "2026-07-15", amountCents: -100 }]);

    expect(await findLatestTransactionDate(userId)).toBe("2026-08-03");
  });

  it("returns null when the user has no transactions", async () => {
    expect(await findLatestTransactionDate(userId)).toBeNull();
  });

  it("ignores another user's more recent transactions", async () => {
    await importTransactions(userId, [SALARY]);
    await importTransactions(otherUserId, [{ ...COFFEE, date: "2026-09-20" }]);

    expect(await findLatestTransactionDate(userId)).toBe("2026-08-01");
  });
});
