import request from "supertest";
import { createApp } from "./app.js";

describe("POST /api/register", () => {
  it("registers a valid, unused email with a valid password", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/api/register")
      .send({ email: "newuser@example.com", password: "ValidPass123" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: "The registration is succeeded" });
  });
});
