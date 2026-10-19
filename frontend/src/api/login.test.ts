import { jest } from "@jest/globals";
import { loginUser } from "./login";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("loginUser", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts the email and password as JSON to /api/login", async () => {
    const fetchMock = mockFetchResponse(200, { code: "logged-in", message: "Logged in" });

    await loginUser("user@example.com", "ValidPass123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "ValidPass123" }),
      })
    );
  });

  it("returns ok when the login succeeds", async () => {
    mockFetchResponse(200, { code: "logged-in", message: "Logged in" });

    const result = await loginUser("user@example.com", "ValidPass123");

    expect(result).toEqual({ ok: true, code: "logged-in", message: "Logged in" });
  });

  it("returns the generic server message when the credentials are wrong", async () => {
    mockFetchResponse(401, { code: "invalid-credentials", message: "Invalid email or password" });

    const result = await loginUser("user@example.com", "WrongPassword123");

    expect(result).toEqual({
      ok: false,
      code: "invalid-credentials",
      message: "Invalid email or password",
    });
  });

  it("returns a server-error result when the response is not the agreed JSON shape", async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    })) as unknown as typeof fetch;

    const result = await loginUser("user@example.com", "ValidPass123");

    expect(result).toEqual({ ok: false, code: "server-error", message: "Something went wrong" });
  });

  it("returns a server-error result when the request itself fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const result = await loginUser("user@example.com", "ValidPass123");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("server-error");
  });
});
