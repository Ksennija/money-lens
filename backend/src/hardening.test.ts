import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

describe("API hardening", () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("answers an invalid JSON body with a JSON 400, not an HTML error page", async () => {
    const response = await request(createApp())
      .post("/api/login")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body.code).toBe("invalid-json");
  });

  it("answers an unknown API route with a JSON 404", async () => {
    const response = await request(createApp()).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("not-found");
  });

  it("sets security headers", async () => {
    const response = await request(createApp()).get("/api/does-not-exist");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("limits login attempts per client and answers 429 after the limit", async () => {
    const app = createApp({ authRateLimit: 3 });
    const attempt = () =>
      request(app).post("/api/login").send({ email: "nobody@example.com", password: "wrong" });

    for (let i = 0; i < 3; i++) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("too-many-requests");
  });

  it("limits registration attempts too", async () => {
    const app = createApp({ authRateLimit: 2 });
    const attempt = () =>
      request(app).post("/api/register").send({ email: "not-an-email", password: "x" });

    expect((await attempt()).status).toBe(400);
    expect((await attempt()).status).toBe(400);
    expect((await attempt()).status).toBe(429);
  });
});
