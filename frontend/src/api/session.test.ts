import { jest } from "@jest/globals";
import { getCurrentUser, logoutUser } from "./session";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("getCurrentUser", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requests /api/me and returns the user when logged in", async () => {
    const fetchMock = mockFetchResponse(200, { email: "user@example.com" });

    const user = await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledWith("/api/me");
    expect(user).toEqual({ email: "user@example.com" });
  });

  it("returns null when not logged in", async () => {
    mockFetchResponse(401, { code: "unauthenticated", message: "Not logged in" });

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null when the response is not the agreed JSON shape", async () => {
    mockFetchResponse(200, { unexpected: true });

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null when the request itself fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    expect(await getCurrentUser()).toBeNull();
  });
});

describe("logoutUser", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts to /api/logout and returns true on success", async () => {
    const fetchMock = mockFetchResponse(200, { code: "logged-out", message: "Logged out" });

    const ok = await logoutUser();

    expect(fetchMock).toHaveBeenCalledWith("/api/logout", { method: "POST" });
    expect(ok).toBe(true);
  });

  it("returns false when the server reports an error", async () => {
    mockFetchResponse(500, { code: "server-error", message: "Something went wrong" });

    expect(await logoutUser()).toBe(false);
  });

  it("returns false when the request itself fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    expect(await logoutUser()).toBe(false);
  });
});
