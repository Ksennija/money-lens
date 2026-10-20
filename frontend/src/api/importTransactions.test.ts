import { jest } from "@jest/globals";
import { importTransactions } from "./importTransactions";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const FILE = new File(["Booking date;Amount"], "export.csv", { type: "text/csv" });

describe("importTransactions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts the file as multipart form data under the field name file", async () => {
    const fetchMock = mockFetchResponse(200, { code: "imported", imported: 1, duplicates: 0, rejected: [] });

    await importTransactions(FILE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/transactions/import");
    expect(init?.method).toBe("POST");
    const body = init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("file")).toBeInstanceOf(File);
    // The browser must set the multipart Content-Type (with its boundary) itself.
    expect(init?.headers).toBeUndefined();
  });

  it("returns the counts and rejected rows on success", async () => {
    mockFetchResponse(200, {
      code: "imported",
      imported: 2,
      duplicates: 1,
      rejected: [{ row: 3, reason: "invalid-date" }],
    });

    const result = await importTransactions(FILE);

    expect(result).toEqual({
      ok: true,
      imported: 2,
      duplicates: 1,
      rejected: [{ row: 3, reason: "invalid-date" }],
    });
  });

  it("returns the server's code and message for a whole-file error", async () => {
    mockFetchResponse(400, {
      code: "missing-columns",
      message: "Missing required columns: Amount",
      missingColumns: ["Amount"],
    });

    const result = await importTransactions(FILE);

    expect(result).toEqual({
      ok: false,
      code: "missing-columns",
      message: "Missing required columns: Amount",
    });
  });

  it("returns a server-error result when a success response is not the agreed shape", async () => {
    mockFetchResponse(200, { code: "imported" });

    const result = await importTransactions(FILE);

    expect(result).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });

  it("returns a server-error result when the response is not JSON", async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    })) as unknown as typeof fetch;

    const result = await importTransactions(FILE);

    expect(result).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });

  it("returns a server-error result when the request itself fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const result = await importTransactions(FILE);

    expect(result).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });
});
