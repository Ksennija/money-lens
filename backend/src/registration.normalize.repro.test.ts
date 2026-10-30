import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";

const EMAILS = [
  "repro.user@example.com",
  "Repro.User@Example.com",
  "repro.user2@example.com",
  "  repro.user2@example.com ",
  "repro.user3@example.com",
  "Repro.User3@Example.com",
];

describe("email normalization repro", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects the same email in a different case with 409", async () => {
    const app = createApp();
    await request(app)
      .post("/api/register")
      .send({ email: "Repro.User@Example.com", password: "ValidPass123" });

    const res = await request(app)
      .post("/api/register")
      .send({ email: "repro.user@example.com", password: "ValidPass123" });

    expect(res.status).toBe(409);
  });

  it("stores the email trimmed", async () => {
    await request(createApp())
      .post("/api/register")
      .send({ email: "  repro.user2@example.com ", password: "ValidPass123" });

    const stored = await prisma.user.findUnique({ where: { email: "repro.user2@example.com" } });
    expect(stored).not.toBeNull();
  });

  it("logs in with a different case than was registered", async () => {
    const app = createApp();
    await request(app)
      .post("/api/register")
      .send({ email: "Repro.User3@Example.com", password: "ValidPass123" });

    const res = await request(app)
      .post("/api/login")
      .send({ email: "repro.user3@example.com", password: "ValidPass123" });

    expect(res.status).toBe(200);
  });
});
