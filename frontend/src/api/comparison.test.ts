import { jest } from "@jest/globals";
import { getComparison } from "./comparison";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const BODY = {
  code: "comparison",
  month: "2026-09",
  previousMonth: "2026-08",
  currency: "EUR",
  current: { spendingCents: 296000, incomeCents: 320000, netCents: 24000 },
  previous: { spendingCents: 259000, incomeCents: 310000, netCents: 51000 },
  change: {
    spendingCents: 37000,
    incomeCents: 10000,
    netCents: -27000,
    spendingPercent: 14.3,
    incomePercent: 3.2,
  },
};

describe("getComparison", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requests /api/comparison without a month, so the server picks the latest month", async () => {
    const fetchMock = mockFetchResponse(200, BODY);

    await getComparison();

    expect(fetchMock).toHaveBeenCalledWith("/api/comparison");
  });

  it("requests the given month", async () => {
    const fetchMock = mockFetchResponse(200, BODY);

    await getComparison("2026-08");

    expect(fetchMock).toHaveBeenCalledWith("/api/comparison?month=2026-08");
  });

  it("returns the months, currency, totals and change in cents", async () => {
    mockFetchResponse(200, BODY);

    const result = await getComparison();

    expect(result).toEqual({
      ok: true,
      comparison: {
        month: "2026-09",
        previousMonth: "2026-08",
        currency: "EUR",
        current: { spendingCents: 296000, incomeCents: 320000, netCents: 24000 },
        previous: { spendingCents: 259000, incomeCents: 310000, netCents: 51000 },
        change: { spendingCents: 37000, incomeCents: 10000, netCents: -27000 },
      },
    });
  });

  it("returns the code and message of a rates-unavailable error", async () => {
    mockFetchResponse(502, { code: "rates-unavailable", message: "Exchange rates are currently unavailable" });

    expect(await getComparison()).toEqual({
      ok: false,
      code: "rates-unavailable",
      message: "Exchange rates are currently unavailable",
    });
  });

  it("returns a generic server error when a success body is missing fields", async () => {
    mockFetchResponse(200, { code: "comparison", month: "2026-09" });

    expect(await getComparison()).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });

  it("returns a generic server error when an error body has no code and message", async () => {
    mockFetchResponse(500, {});

    expect(await getComparison()).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });

  it("returns a generic server error when the request fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    expect(await getComparison()).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });
});
