import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const USER_EMAIL = "category-changes-a@example.com";
const PASSWORD = "ValidPass123";

// An unusual code, so the test never touches real cached rates or the rate API.
const HOME = "ZXC";

function tx(date: string, amountCents: number, counterparty: string) {
  return { date: new Date(`${date}T00:00:00Z`), amountCents, currency: HOME, counterparty, details: "Test" };
}

async function loggedInAgent(email: string) {
  const agent = request.agent(createApp());
  await agent.post("/api/register").send({ email, password: PASSWORD });
  await agent.post("/api/login").send({ email, password: PASSWORD });
  const user = await prisma.user.findUnique({ where: { email } });
  return { agent, userId: user!.id };
}

describe("GET /api/category-changes", () => {
  afterEach(async () => {
    const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
    if (user) {
      await prisma.session.deleteMany({ where: { sess: { path: ["userId"], equals: user.id } } });
    }
    // Transactions are removed with their user (cascade delete).
    await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("lists the categories that changed in the latest month against the same days of the month before", async () => {
    const { agent, userId } = await loggedInAgent(USER_EMAIL);
    await prisma.transaction.createMany({
      data: [
        tx("2026-08-05", -10000, "REWE Markt"),
        tx("2026-08-25", -10000, "REWE Markt"), // after day 10, so not compared
        tx("2026-09-10", -15000, "REWE Markt"),
      ].map((t) => ({ ...t, userId })),
    });

    const res = await agent.get("/api/category-changes");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: "category-changes",
      month: "2026-09",
      currency: HOME,
      hasTransactions: true,
      changes: [{ category: "groceries", direction: "up", amountCents: 5000 }],
    });
  });

  it("rejects a request without a session with 401 unauthenticated (Test Case 21)", async () => {
    const res = await request(createApp()).get("/api/category-changes");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: "unauthenticated", message: "Not logged in" });
  });
});
