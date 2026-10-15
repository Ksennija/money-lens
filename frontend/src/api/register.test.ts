import { jest } from "@jest/globals";
import { registerUser } from "./register";

function mockFetchResponse(status: number, body: { message: string }) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("registerUser", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("posts the email and password as JSON to /api/register", async () => {
    const fetchMock = mockFetchResponse(201, { message: "The registration is succeeded" });

    await registerUser("newuser@example.com", "ValidPass123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/register",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "newuser@example.com", password: "ValidPass123" }),
      })
    );
  });

  it("returns the success message from the server", async () => {
    mockFetchResponse(201, { message: "The registration is succeeded" });

    const result = await registerUser("newuser@example.com", "ValidPass123");

    expect(result).toEqual({ message: "The registration is succeeded" });
  });

  it("returns the server message when the email is already registered", async () => {
    mockFetchResponse(409, { message: "Email already registered" });

    const result = await registerUser("taken@example.com", "ValidPass123");

    expect(result).toEqual({ message: "Email already registered" });
  });
});
