import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const TEST_EMAIL = "logoutuser@example.com";
const TEST_PASSWORD = "ValidPass123";

async function sessionCountForTestUser() {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  return prisma.session.count({ where: { sess: { path: ["userId"], equals: user?.id } } });
}

async function loginAgent() {
  const agent = request.agent(createApp());
  await agent.post("/api/register").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  await agent.post("/api/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  return agent;
}

describe("POST /api/logout", () => {
  afterEach(async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.session.deleteMany({ where: { sess: { path: ["userId"], equals: user.id } } });
    }
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("ends the active session and clears the cookie", async () => {
    const agent = await loginAgent();
    expect(await sessionCountForTestUser()).toBe(1);

    const res = await agent.post("/api/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "logged-out", message: "Logged out" });
    expect(await sessionCountForTestUser()).toBe(0);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("connect.sid=;"))).toBe(true);
  });

  it("does not accept the old session cookie after logout", async () => {
    const agent = await loginAgent();
    const loginCookie = (
      await agent.post("/api/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD })
    ).headers["set-cookie"];
    await agent.post("/api/logout");

    const replay = await request(createApp()).post("/api/logout").set("Cookie", loginCookie);

    expect(replay.status).toBe(200);
    expect(await sessionCountForTestUser()).toBe(0);
  });

  it("succeeds when there is no active session", async () => {
    const res = await request(createApp()).post("/api/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "logged-out", message: "Logged out" });
  });
});
