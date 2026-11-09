import { jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const USER_EMAIL = "transactions-a@example.com";
const OTHER_USER_EMAIL = "transactions-b@example.com";
const PASSWORD = "ValidPass123";
const UNAUTHENTICATED = { code: "unauthenticated", message: "Not logged in" };

function tx(date: string, amountCents: number, currency = "EUR", counterparty = "Shop") {
  return { date: new Date(`${date}T00:00:00Z`), amountCents, currency, counterparty, details: "Test" };
}

async function loggedInAgent(email: string) {
  const agent = request.agent(createApp());
  await agent.post("/api/register").send({ email, password: PASSWORD });
  await agent.post("/api/login").send({ email, password: PASSWORD });
  const user = await prisma.user.findUnique({ where: { email } });
  return { agent, userId: user!.id };
}

describe("GET /api/transactions", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    for (const email of [USER_EMAIL, OTHER_USER_EMAIL]) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.session.deleteMany({ where: { sess: { path: ["userId"], equals: user.id } } });
      }
    }
    // Transactions are removed with their user (cascade delete).
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, OTHER_USER_EMAIL] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("returns the month's transactions with all fields, newest first", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await prisma.transaction.createMany({
      data: [
        tx("2026-08-01", 30000, "EUR", "Acme"),
        tx("2026-08-15", -1500, "EUR", "Rewe"),
        tx("2026-08-31", -100, "EUR", "Bank"),
      ].map((t) => ({ ...t, userId })),
    });

    const res = await agent.get("/api/transactions?month=2026-08");

    expect(res.status).toBe(200);
    expect(res.body.code).toBe("transactions");
    expect(res.body.month).toBe("2026-08");
    expect(res.body.transactions).toEqual([
      { id: expect.any(String), date: "2026-08-31", counterparty: "Bank", details: "Test", amountCents: -100, currency: "EUR" },
      { id: expect.any(String), date: "2026-08-15", counterparty: "Rewe", details: "Test", amountCents: -1500, currency: "EUR" },
      { id: expect.any(String), date: "2026-08-01", counterparty: "Acme", details: "Test", amountCents: 30000, currency: "EUR" },
    ]);
  });

  it("includes the first and last day of the month and excludes the days around it", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await prisma.transaction.createMany({
      data: [
        tx("2026-07-31", -1),
        tx("2026-08-01", -2),
        tx("2026-08-31", -3),
        tx("2026-09-01", -4),
      ].map((t) => ({ ...t, userId })),
    });

    const res = await agent.get("/api/transactions?month=2026-08");

    expect(res.body.transactions.map((t: { date: string }) => t.date)).toEqual(["2026-08-31", "2026-08-01"]);
  });

  it("keeps the original currency of each transaction, without converting", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await prisma.transaction.createMany({
      data: [tx("2026-08-05", -1000, "USD"), tx("2026-08-06", -1000, "EUR")].map((t) => ({ ...t, userId })),
    });

    const res = await agent.get("/api/transactions?month=2026-08");

    expect(res.status).toBe(200);
    expect(res.body.transactions.map((t: { amountCents: number; currency: string }) => [t.amountCents, t.currency])).toEqual([
      [-1000, "EUR"],
      [-1000, "USD"],
    ]);
  });

  it("returns an empty list for a month without transactions", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await prisma.transaction.createMany({ data: [{ ...tx("2026-08-05", -1000), userId }] });

    const res = await agent.get("/api/transactions?month=2026-07");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "transactions", month: "2026-07", transactions: [] });
  });

  describe("without a month", () => {
    it("uses the month of the user's most recent transaction", async () => {
      const { agent, userId } = await loggedInAgent(USER_EMAIL);
      const other = await loggedInAgent(OTHER_USER_EMAIL);
      await prisma.transaction.createMany({
        data: [tx("2026-07-05", -1000), tx("2026-08-03", -1500), tx("2026-08-20", 30000)].map((t) => ({ ...t, userId })),
      });
      // Another user's later transaction must not move this user's default month.
      await prisma.transaction.createMany({ data: [{ ...tx("2026-09-10", -100), userId: other.userId }] });

      const res = await agent.get("/api/transactions");

      expect(res.status).toBe(200);
      expect(res.body.month).toBe("2026-08");
      expect(res.body.transactions.map((t: { date: string }) => t.date)).toEqual(["2026-08-20", "2026-08-03"]);
    });

    it("falls back to the current month with an empty list when the user has no transactions", async () => {
      const { agent } = await loggedInAgent(USER_EMAIL);

      const res = await agent.get("/api/transactions");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: "transactions",
        month: new Date().toISOString().slice(0, 7),
        transactions: [],
      });
    });

    it("still uses an explicit month even when newer transactions exist", async () => {
      const { agent, userId } = await loggedInAgent(USER_EMAIL);
      await prisma.transaction.createMany({
        data: [tx("2026-07-05", -1000), tx("2026-09-03", -1500)].map((t) => ({ ...t, userId })),
      });

      const res = await agent.get("/api/transactions?month=2026-07");

      expect(res.body.month).toBe("2026-07");
      expect(res.body.transactions).toHaveLength(1);
      expect(res.body.transactions[0].amountCents).toBe(-1000);
    });
  });

  it("never includes another user's transactions", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    const other = await loggedInAgent(OTHER_USER_EMAIL);
    await prisma.transaction.createMany({ data: [{ ...tx("2026-08-05", -1000, "EUR", "Mine"), userId }] });
    await prisma.transaction.createMany({ data: [{ ...tx("2026-08-06", -2000, "EUR", "Theirs"), userId: other.userId }] });

    const res = await agent.get("/api/transactions?month=2026-08");

    expect(res.body.transactions.map((t: { counterparty: string }) => t.counterparty)).toEqual(["Mine"]);
  });

  it.each(["abc", "2026-13", "2026-8", "2026-00", ""])("rejects the malformed month %p with 400 invalid-month", async (month) => {
    const { agent } = await loggedInAgent(USER_EMAIL);

    const res = await agent.get(`/api/transactions?month=${month}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid-month");
  });

  it("rejects a month given twice with 400 invalid-month", async () => {
    const { agent } = await loggedInAgent(USER_EMAIL);

    const res = await agent.get("/api/transactions?month=2026-08&month=2026-09");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid-month");
  });

  it("rejects a request without a session with 401 unauthenticated", async () => {
    const res = await request(createApp()).get("/api/transactions?month=2026-08");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it("answers 500 server-error without details when the database fails", async () => {
    const { agent } = await loggedInAgent(USER_EMAIL);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(prisma.transaction, "findMany").mockRejectedValue(new Error("db down: secret detail"));

    const res = await agent.get("/api/transactions?month=2026-08");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: "server-error", message: "Something went wrong" });
  });
});
