import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { createApp } from "./app.js";
import { prisma } from "./db/client.js";
import { pool } from "./db/pool.js";

const USER_EMAIL = "importuser-a@example.com";
const OTHER_USER_EMAIL = "importuser-b@example.com";
const PASSWORD = "ValidPass123";
const HEADER = "Booking date;Value date;Counterparty;Details;Amount;Currency;Balance";
const VALID_ROW = "01.08.2026;01.08.2026;Acme GmbH;Salary;3200,00;EUR;0";

const sampleCsv = readFileSync(
  path.resolve(process.cwd(), "../spec/samples/bank-export-sample.csv")
);

async function loggedInAgent(email: string) {
  const agent = request.agent(createApp());
  await agent.post("/api/register").send({ email, password: PASSWORD });
  await agent.post("/api/login").send({ email, password: PASSWORD });
  return agent;
}

function upload(agent: ReturnType<typeof request.agent>, content: Buffer | string, filename = "export.csv") {
  return agent
    .post("/api/transactions/import")
    .attach("file", Buffer.isBuffer(content) ? content : Buffer.from(content), filename);
}

async function transactionCount(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  return user ? prisma.transaction.count({ where: { userId: user.id } }) : 0;
}

describe("POST /api/transactions/import", () => {
  afterEach(async () => {
    for (const email of [USER_EMAIL, OTHER_USER_EMAIL]) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.session.deleteMany({ where: { sess: { path: ["userId"], equals: user.id } } });
      }
    }
    // Transactions are removed with their user (cascade delete).
    await prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, OTHER_USER_EMAIL] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("imports the sample file: 36 imported, none rejected", async () => {
    const agent = await loggedInAgent(USER_EMAIL);

    const res = await upload(agent, sampleCsv);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "imported", imported: 36, duplicates: 0, rejected: [] });
    expect(await transactionCount(USER_EMAIL)).toBe(36);
  });

  it("imports nothing when the same file is uploaded again", async () => {
    const agent = await loggedInAgent(USER_EMAIL);
    await upload(agent, sampleCsv);

    const res = await upload(agent, sampleCsv);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "imported", imported: 0, duplicates: 36, rejected: [] });
    expect(await transactionCount(USER_EMAIL)).toBe(36);
  });

  it("keeps transactions per user: another user importing the same file gets their own rows", async () => {
    const userA = await loggedInAgent(USER_EMAIL);
    const userB = await loggedInAgent(OTHER_USER_EMAIL);
    await upload(userA, sampleCsv);

    const res = await upload(userB, sampleCsv);

    expect(res.body).toMatchObject({ imported: 36, duplicates: 0 });
    expect(await transactionCount(USER_EMAIL)).toBe(36);
    expect(await transactionCount(OTHER_USER_EMAIL)).toBe(36);
  });

  it("imports the valid rows and reports the rejected ones with row numbers", async () => {
    const agent = await loggedInAgent(USER_EMAIL);
    const file = [
      HEADER,
      VALID_ROW,
      "31.02.2026;01.08.2026;A;x;-1,00;EUR;0",
      "01.08.2026;01.08.2026;A;x;abc;EUR;0",
      "01.08.2026;01.08.2026;;;-1,00;EUR;0",
      "02.08.2026;02.08.2026;REWE;Groceries;-9,99;EUR;0",
    ].join("\n");

    const res = await upload(agent, file);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: "imported",
      imported: 2,
      duplicates: 0,
      rejected: [
        { row: 3, reason: "invalid-date" },
        { row: 4, reason: "invalid-amount" },
        { row: 5, reason: "empty-description" },
      ],
    });
    expect(await transactionCount(USER_EMAIL)).toBe(2);
  });

  it("accepts a file with only a header", async () => {
    const agent = await loggedInAgent(USER_EMAIL);

    const res = await upload(agent, HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: "imported", imported: 0, duplicates: 0, rejected: [] });
  });

  it("rejects a file missing a required column with 400 missing-columns and stores nothing", async () => {
    const agent = await loggedInAgent(USER_EMAIL);
    const file = "Booking date;Counterparty;Details;Currency\n01.08.2026;A;x;EUR";

    const res = await upload(agent, file);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: "missing-columns",
      message: "Missing required columns: Amount",
      missingColumns: ["Amount"],
    });
    expect(await transactionCount(USER_EMAIL)).toBe(0);
  });

  it("rejects a request without a file with 400 invalid-file", async () => {
    const agent = await loggedInAgent(USER_EMAIL);

    const res = await agent.post("/api/transactions/import");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: "invalid-file", message: "Upload a CSV file" });
  });

  it("rejects a file that is not a CSV with 400 invalid-file", async () => {
    const agent = await loggedInAgent(USER_EMAIL);

    const res = await upload(agent, Buffer.from([0x89, 0x50, 0x4e, 0x47]), "photo.png");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid-file");
  });

  it("rejects a CSV that cannot be read with 400 invalid-file", async () => {
    const agent = await loggedInAgent(USER_EMAIL);

    const res = await upload(agent, `${HEADER}\n01.08.2026;01.08.2026;"unclosed;x;-1,00;EUR;0`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid-file");
  });

  it("rejects a file over 2 MB with 413 file-too-large", async () => {
    const agent = await loggedInAgent(USER_EMAIL);

    const res = await upload(agent, Buffer.alloc(2 * 1024 * 1024 + 1, "a"));

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ code: "file-too-large", message: "The file is too large" });
    expect(await transactionCount(USER_EMAIL)).toBe(0);
  });

  it("rejects a file with more than 5,000 rows with 413 file-too-large", async () => {
    const agent = await loggedInAgent(USER_EMAIL);
    const rows = Array.from({ length: 5001 }, () => VALID_ROW);

    const res = await upload(agent, [HEADER, ...rows].join("\n"));

    expect(res.status).toBe(413);
    expect(res.body.code).toBe("file-too-large");
    expect(await transactionCount(USER_EMAIL)).toBe(0);
  });

  it("accepts a file with exactly 5,000 rows", async () => {
    const agent = await loggedInAgent(USER_EMAIL);
    const rows = Array.from({ length: 5000 }, () => VALID_ROW);

    const res = await upload(agent, [HEADER, ...rows].join("\n"));

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(5000);
  });

  it("rejects a request without a session with 401 unauthenticated and stores nothing", async () => {
    const res = await upload(request.agent(createApp()), sampleCsv);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: "unauthenticated", message: "Not logged in" });
  });
});
