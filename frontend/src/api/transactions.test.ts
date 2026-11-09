import { jest } from "@jest/globals";
import { getTransactions } from "./transactions";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const ITEM = {
  id: "t1",
  date: "2026-09-30",
  counterparty: "Bank",
  details: "Account fee",
  amountCents: -490,
  currency: "EUR",
};
const BODY = { code: "transactions", month: "2026-09", transactions: [ITEM] };
const SERVER_ERROR = { ok: false, code: "server-error", message: "Something went wrong" };

describe("getTransactions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requests /api/transactions without a month, so the server picks the latest month", async () => {
    const fetchMock = mockFetchResponse(200, BODY);

    await getTransactions();

    expect(fetchMock).toHaveBeenCalledWith("/api/transactions");
  });

  it("requests the given month", async () => {
    const fetchMock = mockFetchResponse(200, BODY);

    await getTransactions("2026-08");

    expect(fetchMock).toHaveBeenCalledWith("/api/transactions?month=2026-08");
  });

  it("returns the month and the transactions with their amounts in cents", async () => {
    mockFetchResponse(200, BODY);

    const result = await getTransactions();

    expect(result).toEqual({ ok: true, month: "2026-09", transactions: [ITEM] });
  });

  it("returns an empty list for a month without transactions", async () => {
    mockFetchResponse(200, { code: "transactions", month: "2026-07", transactions: [] });

    expect(await getTransactions("2026-07")).toEqual({ ok: true, month: "2026-07", transactions: [] });
  });

  it("returns the code and message of an error response", async () => {
    mockFetchResponse(400, { code: "invalid-month", message: "Month must look like 2026-08" });

    expect(await getTransactions("abc")).toEqual({
      ok: false,
      code: "invalid-month",
      message: "Month must look like 2026-08",
    });
  });

  it("returns a generic server error when a success body is missing fields", async () => {
    mockFetchResponse(200, { code: "transactions", month: "2026-09" });

    expect(await getTransactions()).toEqual(SERVER_ERROR);
  });

  it("returns a generic server error when a transaction has the wrong shape", async () => {
    mockFetchResponse(200, { ...BODY, transactions: [{ ...ITEM, amountCents: "-490" }] });

    expect(await getTransactions()).toEqual(SERVER_ERROR);
  });

  it("returns a generic server error when an error body has no code and message", async () => {
    mockFetchResponse(500, { oops: true });

    expect(await getTransactions()).toEqual(SERVER_ERROR);
  });

  it("returns a generic server error when the request fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    expect(await getTransactions()).toEqual(SERVER_ERROR);
  });
});
