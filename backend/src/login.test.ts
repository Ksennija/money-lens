import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const TEST_EMAIL = "loginuser@example.com";
const TEST_PASSWORD = "ValidPass123";
const INVALID_CREDENTIALS = { code: "invalid-credentials", message: "Invalid email or password" };

describe("POST /api/login", () => {
  beforeEach(async () => {
    await request(createApp())
      .post("/api/register")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.session.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("logs in with correct credentials", async () => {
    const res = await request(createApp())
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "logged-in", message: "Logged in" });
  });

  it("starts a server-side session and sets an HttpOnly session cookie on success", async () => {
    const res = await request(createApp())
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) =>
      c.startsWith("connect.sid="),
    );
    expect(cookie).toContain("HttpOnly");

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    const sessions = await prisma.session.findMany();
    expect(sessions.some((s) => (s.sess as { userId?: string }).userId === user?.id)).toBe(true);
  });

  it("does not start a session when login fails", async () => {
    const res = await request(createApp())
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: "WrongPassword123" });

    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects a wrong password with 401 invalid-credentials", async () => {
    const res = await request(createApp())
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: "WrongPassword123" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID_CREDENTIALS);
  });

  it("rejects an unknown email with the same response as a wrong password", async () => {
    const res = await request(createApp())
      .post("/api/login")
      .send({ email: "unknown@example.com", password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID_CREDENTIALS);
  });

  it("rejects a missing password with 400 invalid-credentials", async () => {
    const res = await request(createApp()).post("/api/login").send({ email: TEST_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(INVALID_CREDENTIALS);
  });

  it("does not lock the account after repeated failures", async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 10; attempt++) {
      await request(app).post("/api/login").send({ email: TEST_EMAIL, password: "WrongPassword123" });
    }

    const res = await request(app)
      .post("/api/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
  });
});
