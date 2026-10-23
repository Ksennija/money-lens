import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const USER_EMAIL = "comparison-a@example.com";
const OTHER_USER_EMAIL = "comparison-b@example.com";
const PASSWORD = "ValidPass123";
const UNAUTHENTICATED = { code: "unauthenticated", message: "Not logged in" };

// ZXB is the home currency and ZXA a foreign one, so the tests never touch real cached rates.
// ZXA -> ZXB is seeded in the cache, which means no test calls the rate API.
const HOME = "ZXB";
const FOREIGN = "ZXA";

function tx(date: string, amountCents: number, currency = HOME) {
  return { date: new Date(`${date}T00:00:00Z`), amountCents, currency, counterparty: "Shop", details: "Test" };
}

async function loggedInAgent(email: string) {
  const agent = request.agent(createApp());
  await agent.post("/api/register").send({ email, password: PASSWORD });
  await agent.post("/api/login").send({ email, password: PASSWORD });
  const user = await prisma.user.findUnique({ where: { email } });
  return { agent, userId: user!.id };
}

describe("GET /api/comparison", () => {
  beforeEach(async () => {
    await prisma.exchangeRate.createMany({
      data: [
        { date: new Date("2026-07-10T00:00:00Z"), base: FOREIGN, quote: HOME, rate: 2 },
        { date: new Date("2026-08-10T00:00:00Z"), base: FOREIGN, quote: HOME, rate: 3 },
      ],
    });
  });

  afterEach(async () => {
    for (const email of [USER_EMAIL, OTHER_USER_EMAIL]) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.session.deleteMany({ where: { sess: { path: ["userId"], equals: user.id } } });
      }
    }
    // Transactions are removed with their user (cascade delete).
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, OTHER_USER_EMAIL] } } });
    await prisma.exchangeRate.deleteMany({ where: { base: FOREIGN } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  async function seedTwoMonths(userId: string) {
    await prisma.transaction.createMany({
      data: [
        tx("2026-06-30", -9999), // before the previous month
        tx("2026-07-01", 30000), // first day of the previous month
        tx("2026-07-05", -1000),
        tx("2026-07-10", -500, FOREIGN), // 2.0 -> -1000
        tx("2026-08-01", 30000),
        tx("2026-08-03", -1500),
        tx("2026-08-10", -1000, FOREIGN), // 3.0 -> -3000
        tx("2026-08-10", 100, FOREIGN), // 3.0 -> 300
        tx("2026-08-31", -100), // last day of the month
        tx("2026-09-01", -9999), // after the month
      ].map((t) => ({ ...t, userId })),
    });
  }

  it("compares the month with the previous one in the most common currency", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await seedTwoMonths(userId);

    const res = await agent.get("/api/comparison?month=2026-08");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: "comparison",
      month: "2026-08",
      previousMonth: "2026-07",
      currency: HOME,
      current: { spendingCents: 4600, incomeCents: 30300, netCents: 25700 },
      previous: { spendingCents: 2000, incomeCents: 30000, netCents: 28000 },
      change: { spendingCents: 2600, incomeCents: 300, netCents: -2300, spendingPercent: 130, incomePercent: 1 },
    });
  });

  describe("without a month", () => {
    it("reports the month of the user's most recent transaction", async () => {
      const { agent, userId } = await loggedInAgent(USER_EMAIL);
      const other = await loggedInAgent(OTHER_USER_EMAIL);
      await prisma.transaction.createMany({
        data: [
          tx("2026-07-05", -1000),
          tx("2026-08-03", -1500),
          tx("2026-08-20", 30000),
        ].map((t) => ({ ...t, userId })),
      });
      // Another user's later transaction must not move this user's default month.
      await prisma.transaction.createMany({ data: [{ ...tx("2026-09-10", -100), userId: other.userId }] });

      const res = await agent.get("/api/comparison");

      expect(res.status).toBe(200);
      expect(res.body.month).toBe("2026-08");
      expect(res.body.previousMonth).toBe("2026-07");
      expect(res.body.current).toEqual({ spendingCents: 1500, incomeCents: 30000, netCents: 28500 });
      expect(res.body.previous).toEqual({ spendingCents: 1000, incomeCents: 0, netCents: -1000 });
    });

    it("falls back to the current month when the user has no transactions", async () => {
      const { agent } = await loggedInAgent(USER_EMAIL);

      const res = await agent.get("/api/comparison");

      expect(res.status).toBe(200);
      expect(res.body.month).toBe(new Date().toISOString().slice(0, 7));
      expect(res.body.current).toEqual({ spendingCents: 0, incomeCents: 0, netCents: 0 });
    });

    it("still uses an explicit month even when newer transactions exist", async () => {
      const { agent, userId } = await loggedInAgent(USER_EMAIL);
      await prisma.transaction.createMany({
        data: [tx("2026-07-05", -1000), tx("2026-08-03", -1500)].map((t) => ({ ...t, userId })),
      });

      const res = await agent.get("/api/comparison?month=2026-07");

      expect(res.body.month).toBe("2026-07");
      expect(res.body.current.spendingCents).toBe(1000);
    });
  });

  it("uses the currency from the query when given, case-insensitively", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await prisma.transaction.createMany({
      data: [tx("2026-07-10", -500, FOREIGN), tx("2026-08-10", -1000, FOREIGN)].map((t) => ({ ...t, userId })),
    });

    const res = await agent.get(`/api/comparison?month=2026-08&currency=${HOME.toLowerCase()}`);

    expect(res.status).toBe(200);
    expect(res.body.currency).toBe(HOME);
    expect(res.body.current.spendingCents).toBe(3000);
    expect(res.body.previous.spendingCents).toBe(1000);
  });

  it("reports zeros and no percentage for months without transactions", async () => {
    const { agent } = await loggedInAgent(USER_EMAIL);

    const res = await agent.get("/api/comparison?month=2026-08");

    expect(res.status).toBe(200);
    expect(res.body.current).toEqual({ spendingCents: 0, incomeCents: 0, netCents: 0 });
    expect(res.body.change.spendingPercent).toBeNull();
  });

  it("never includes another user's transactions", async () => {
    const { agent } = await loggedInAgent(USER_EMAIL);
    const other = await loggedInAgent(OTHER_USER_EMAIL);
    await seedTwoMonths(other.userId);

    const res = await agent.get("/api/comparison?month=2026-08");

    expect(res.body.current).toEqual({ spendingCents: 0, incomeCents: 0, netCents: 0 });
  });

  it("rejects a malformed month with 400 invalid-month", async () => {
    const { agent } = await loggedInAgent(USER_EMAIL);

    const res = await agent.get("/api/comparison?month=2026-13");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid-month");
  });

  it("rejects a malformed currency with 400 invalid-currency", async () => {
    const { agent } = await loggedInAgent(USER_EMAIL);

    const res = await agent.get("/api/comparison?month=2026-08&currency=EURO");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid-currency");
  });

  it("rejects a request without a session with 401 unauthenticated", async () => {
    const res = await request(createApp()).get("/api/comparison?month=2026-08");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });
});
