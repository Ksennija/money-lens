import { readFileSync } from "node:fs";
import path from "node:path";
import { parseBankCsv } from "./parseBankCsv.js";

const HEADER = "Booking date;Value date;Counterparty;Details;Amount;Currency;Balance";

function csv(...rows: string[]) {
  return [HEADER, ...rows].join("\n");
}

function parseRows(text: string) {
  const result = parseBankCsv(text);
  if (!("rows" in result)) throw new Error(`not parsed: ${JSON.stringify(result)}`);
  return result;
}

describe("parseBankCsv", () => {
  it("parses the sample bank export: 36 rows, none rejected", () => {
    const sample = readFileSync(
      path.resolve(process.cwd(), "../spec/samples/bank-export-sample.csv"),
      "utf-8"
    );

    const { rows, rejected } = parseRows(sample);

    expect(rows).toHaveLength(36);
    expect(rejected).toEqual([]);
    expect(rows[0]).toEqual({
      date: "2026-08-01",
      amountCents: 320000,
      currency: "EUR",
      counterparty: "Acme GmbH",
      details: "Salary August",
    });
    expect(rows[1].amountCents).toBe(-110000);
  });

  it("converts amounts to exact integer cents", () => {
    const { rows } = parseRows(
      csv(
        "01.08.2026;01.08.2026;A;x;-0,10;EUR;0",
        "01.08.2026;01.08.2026;A;x;-0,20;EUR;0",
        "01.08.2026;01.08.2026;A;x;1234,56;EUR;0",
        "01.08.2026;01.08.2026;A;x;5;EUR;0",
        "01.08.2026;01.08.2026;A;x;2,5;EUR;0",
        "01.08.2026;01.08.2026;A;x;-0,00;EUR;0"
      )
    );

    expect(rows.map((r) => r.amountCents)).toEqual([-10, -20, 123456, 500, 250, 0]);
  });

  it("matches header names case-insensitively, in any order, and ignores extra columns", () => {
    const text = [
      "AMOUNT;Notes;currency;details;COUNTERPARTY;booking DATE",
      "-12,50;ignored;eur;Card payment;REWE;03.08.2026",
    ].join("\n");

    const { rows } = parseRows(text);

    expect(rows).toEqual([
      {
        date: "2026-08-03",
        amountCents: -1250,
        currency: "EUR",
        counterparty: "REWE",
        details: "Card payment",
      },
    ]);
  });

  it("accepts a BOM and Windows line endings", () => {
    const text = "﻿" + csv("01.08.2026;01.08.2026;A;x;-1,00;EUR;0").replace(/\n/g, "\r\n") + "\r\n";

    const { rows, rejected } = parseRows(text);

    expect(rows).toHaveLength(1);
    expect(rejected).toEqual([]);
  });

  it("reports every missing required column", () => {
    const text = "Booking date;Counterparty;Details\n01.08.2026;A;x";

    expect(parseBankCsv(text)).toEqual({ missingColumns: ["Amount", "Currency"] });
  });

  it("reports a file that cannot be read as CSV as malformed", () => {
    const text = csv('01.08.2026;01.08.2026;"unclosed;x;-1,00;EUR;0');

    expect(parseBankCsv(text)).toEqual({ malformed: true });
  });

  it("returns no rows for a file with only a header", () => {
    expect(parseRows(HEADER)).toEqual({ rows: [], rejected: [] });
  });

  it("rejects invalid rows with 1-based row numbers that count the header as row 1", () => {
    const { rows, rejected } = parseRows(
      csv(
        "01.08.2026;01.08.2026;A;x;-1,00;EUR;0",
        "31.02.2026;01.08.2026;A;x;-1,00;EUR;0",
        "01.08.2026;01.08.2026;A;x;abc;EUR;0",
        "01.08.2026;01.08.2026;;;-1,00;EUR;0",
        "01.08.2026;01.08.2026;A;x;-1,00;;0",
        "02.08.2026;01.08.2026;B;y;-2,00;EUR;0"
      )
    );

    expect(rows.map((r) => r.counterparty)).toEqual(["A", "B"]);
    expect(rejected).toEqual([
      { row: 3, reason: "invalid-date" },
      { row: 4, reason: "invalid-amount" },
      { row: 5, reason: "empty-description" },
      { row: 6, reason: "invalid-currency" },
    ]);
  });

  it.each([
    ["2026-08-01", "invalid-date"],
    ["1.8.2026", "invalid-date"],
    ["00.08.2026", "invalid-date"],
    ["01.13.2026", "invalid-date"],
    ["29.02.2027", "invalid-date"],
  ])("rejects date %s", (date, reason) => {
    const { rejected } = parseRows(csv(`${date};01.08.2026;A;x;-1,00;EUR;0`));

    expect(rejected).toEqual([{ row: 2, reason }]);
  });

  it("accepts 29 February in a leap year", () => {
    const { rows } = parseRows(csv("29.02.2028;01.08.2026;A;x;-1,00;EUR;0"));

    expect(rows[0].date).toBe("2028-02-29");
  });

  it.each(["-12.50", "12,505", "1.234,56", "--5", "", "12,", ",50", "1 000,00"])(
    "rejects amount %p",
    (amount) => {
      const { rejected } = parseRows(csv(`01.08.2026;01.08.2026;A;x;${amount};EUR;0`));

      expect(rejected).toEqual([{ row: 2, reason: "invalid-amount" }]);
    }
  );

  it("accepts a row with only a counterparty or only details", () => {
    const { rows, rejected } = parseRows(
      csv("01.08.2026;01.08.2026;Shop;;-1,00;EUR;0", "01.08.2026;01.08.2026;;Fee;-1,00;EUR;0")
    );

    expect(rows).toHaveLength(2);
    expect(rejected).toEqual([]);
  });

  it("rejects a row that is shorter than the header instead of crashing", () => {
    const { rows, rejected } = parseRows(csv("01.08.2026;01.08.2026;A"));

    expect(rows).toEqual([]);
    expect(rejected).toEqual([{ row: 2, reason: "invalid-amount" }]);
  });

  it("keeps row numbers aligned with the file when it contains blank lines", () => {
    const text = [HEADER, "01.08.2026;01.08.2026;A;x;-1,00;EUR;0", "", "01.08.2026;01.08.2026;A;x;abc;EUR;0"].join(
      "\n"
    );

    const { rejected } = parseRows(text);

    expect(rejected).toEqual([{ row: 4, reason: "invalid-amount" }]);
  });

  it("trims whitespace around values", () => {
    const { rows } = parseRows(csv("01.08.2026;01.08.2026;  Café Luna ; coffee ; -3,80 ; eur ;0"));

    expect(rows[0]).toEqual({
      date: "2026-08-01",
      amountCents: -380,
      currency: "EUR",
      counterparty: "Café Luna",
      details: "coffee",
    });
  });
});
