import { formatMonth, formatMonthName, nextMonth, previousMonth } from "./months";

describe("formatMonth", () => {
  it("shows the month name and the year", () => {
    expect(formatMonth("2026-09")).toBe("September 2026");
  });

  it("handles January and December", () => {
    expect(formatMonth("2026-01")).toBe("January 2026");
    expect(formatMonth("2026-12")).toBe("December 2026");
  });
});

describe("formatMonthName", () => {
  it("shows only the month name", () => {
    expect(formatMonthName("2026-08")).toBe("August");
  });
});

describe("nextMonth", () => {
  it("returns the following month", () => {
    expect(nextMonth("2026-08")).toBe("2026-09");
  });

  it("moves across a year boundary", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("keeps the two-digit month format", () => {
    expect(nextMonth("2026-01")).toBe("2026-02");
  });
});

describe("previousMonth", () => {
  it("returns the preceding month", () => {
    expect(previousMonth("2026-09")).toBe("2026-08");
  });

  it("moves across a year boundary", () => {
    expect(previousMonth("2027-01")).toBe("2026-12");
  });

  it("keeps the two-digit month format", () => {
    expect(previousMonth("2026-11")).toBe("2026-10");
  });
});
