import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const TEST_EMAIL = "meuser@example.com";
const TEST_PASSWORD = "ValidPass123";
const UNAUTHENTICATED = { code: "unauthenticated", message: "Not logged in" };

describe("GET /api/me", () => {
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

  it("returns the email of the logged-in user and no password hash", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/register").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    await agent.post("/api/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const res = await agent.get("/api/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: TEST_EMAIL });
  });

  it("rejects a request without a session with 401 unauthenticated", async () => {
    const res = await request(createApp()).get("/api/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it("rejects the old session cookie after logout", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/register").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const login = await agent.post("/api/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const oldCookie = login.headers["set-cookie"];
    await agent.post("/api/logout");

    const res = await request(createApp()).get("/api/me").set("Cookie", oldCookie);

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  it("rejects a session whose user no longer exists", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/register").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    await agent.post("/api/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    await prisma.user.delete({ where: { email: TEST_EMAIL } });

    const res = await agent.get("/api/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
    await prisma.session.deleteMany({ where: { sess: { path: ["userId"], equals: user?.id } } });
  });
});
