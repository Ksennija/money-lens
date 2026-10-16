import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";

const TEST_EMAIL = "newuser@example.com";

describe("POST /api/register", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a valid, unused email with a valid password", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/register")
      .send({ email: TEST_EMAIL, password: "ValidPass123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ code: "registered", message: "The registration is succeeded" });

    const storedUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(storedUser).not.toBeNull();
  });

  it("rejects an email without @ with 400 invalid-email", async () => {
    const res = await request(createApp())
      .post("/api/register")
      .send({ email: "not-an-email", password: "ValidPass123" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "invalid-email", message: "Invalid email" });
  });

  it("rejects a short password with 400 invalid-password", async () => {
    const res = await request(createApp())
      .post("/api/register")
      .send({ email: TEST_EMAIL, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "invalid-password", message: "Invalid password" });
  });

  it("rejects an already registered email with 409 email-taken", async () => {
    const app = createApp();
    await request(app).post("/api/register").send({ email: TEST_EMAIL, password: "ValidPass123" });

    const res = await request(app)
      .post("/api/register")
      .send({ email: TEST_EMAIL, password: "ValidPass123" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "email-taken", message: "Email already registered" });
  });
});
