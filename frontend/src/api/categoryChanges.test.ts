import { jest } from "@jest/globals";
import { getCategoryChanges } from "./categoryChanges";

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
  code: "category-changes",
  month: "2026-09",
  currency: "EUR",
  hasTransactions: true,
  changes: [
    { category: "shopping", direction: "up", amountCents: 5995 },
    { category: "other", direction: "down", amountCents: 2500 },
  ],
};

describe("getCategoryChanges", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requests /api/category-changes", async () => {
    const fetchMock = mockFetchResponse(200, BODY);

    await getCategoryChanges();

    expect(fetchMock).toHaveBeenCalledWith("/api/category-changes");
  });

  it("returns the month, currency and the changes in cents", async () => {
    mockFetchResponse(200, BODY);

    const result = await getCategoryChanges();

    expect(result).toEqual({
      ok: true,
      categoryChanges: {
        month: "2026-09",
        currency: "EUR",
        hasTransactions: true,
        changes: [
          { category: "shopping", direction: "up", amountCents: 5995 },
          { category: "other", direction: "down", amountCents: 2500 },
        ],
        ratesApproximate: false,
      },
    });
  });

  it("passes on that the rates are approximate", async () => {
    mockFetchResponse(200, { ...BODY, ratesApproximate: true });

    const result = await getCategoryChanges();

    expect(result).toMatchObject({ ok: true, categoryChanges: { ratesApproximate: true } });
  });

  it("returns the code and message of an error answer", async () => {
    mockFetchResponse(502, { code: "rates-unavailable", message: "Exchange rates are currently unavailable" });

    expect(await getCategoryChanges()).toEqual({
      ok: false,
      code: "rates-unavailable",
      message: "Exchange rates are currently unavailable",
    });
  });

  it("reports a server error when an error answer has no code and message", async () => {
    mockFetchResponse(500, { unexpected: true });

    expect(await getCategoryChanges()).toEqual({
      ok: false,
      code: "server-error",
      message: "Something went wrong",
    });
  });

  it("reports a server error when a success answer is missing a field", async () => {
    mockFetchResponse(200, { code: "category-changes", month: "2026-09", currency: "EUR", changes: [] });

    expect(await getCategoryChanges()).toEqual({
      ok: false,
      code: "server-error",
      message: "Something went wrong",
    });
  });

  it("reports a server error when a change has an unknown direction", async () => {
    mockFetchResponse(200, {
      ...BODY,
      changes: [{ category: "shopping", direction: "sideways", amountCents: 100 }],
    });

    expect(await getCategoryChanges()).toEqual({
      ok: false,
      code: "server-error",
      message: "Something went wrong",
    });
  });

  it("reports a server error when the request itself fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    expect(await getCategoryChanges()).toEqual({
      ok: false,
      code: "server-error",
      message: "Something went wrong",
    });
  });
});
