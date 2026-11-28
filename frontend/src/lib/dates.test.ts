import { formatDate } from "./dates";

describe("formatDate", () => {
  it("turns an ISO date into DD.MM.YYYY", () => {
    expect(formatDate("2026-09-30")).toBe("30.09.2026");
  });

  it("keeps the first and last day of a year as they are", () => {
    expect(formatDate("2026-01-01")).toBe("01.01.2026");
    expect(formatDate("2026-12-31")).toBe("31.12.2026");
  });
});
