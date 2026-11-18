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
      },
    });
  });
});
