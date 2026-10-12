import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db.js";

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
    expect(res.body).toEqual({ message: "The registration is succeeded" });

    const storedUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(storedUser).not.toBeNull();
  });
});
