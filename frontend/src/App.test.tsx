import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { MemoryRouter } from "react-router-dom";

type MockResponse = { status: number; body: unknown };

// Routes fetch calls by "METHOD /path"; each route returns the next queued response.
function mockApi(routes: Record<string, MockResponse[]>) {
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const response = routes[key]?.shift();
    if (!response) throw new Error(`Unexpected request: ${key}`);
    return {
      ok: response.status < 400,
      status: response.status,
      json: async () => response.body,
    };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const NOT_LOGGED_IN = {
  status: 401,
  body: { code: "unauthenticated", message: "Not logged in" },
};
const LOGGED_IN_ME = { status: 200, body: { email: "user@example.com" } };
const COMPARISON = {
  status: 200,
  body: {
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
      spendingPercent: null,
      incomePercent: null,
    },
  },
};

describe("App", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows Home at / and the Error page at an unknown URL when signed out", async () => {
    mockApi({ "GET /api/me": [NOT_LOGGED_IN, NOT_LOGGED_IN] });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole("heading", { name: "Home" })).not.toBeNull();
    unmount();

    render(
      <MemoryRouter initialEntries={["/xyz"]}>
        <App />
      </MemoryRouter>
    );
    expect(
      await screen.findByRole("heading", { name: "Error page" })
    ).not.toBeNull();
  });

  // re-enable when /signin exists
  it.skip("shows the login page when there is no active session", async () => {
    mockApi({ "GET /api/me": [NOT_LOGGED_IN] });

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /log in/i })
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
  });

  it("shows the authenticated area when a session already exists, e.g. after a reload", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
    });

    render(<App />);

    expect(await screen.findByText(/user@example\.com/)).not.toBeNull();
    expect(screen.getByRole("button", { name: /log out/i })).not.toBeNull();
    expect(
      await screen.findByRole("heading", { name: "September 2026 · EUR" })
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: /import transactions/i })
    ).not.toBeNull();
    expect(screen.queryByRole("heading", { name: /log in/i })).toBeNull();
  });

  // re-enable when /signin exists
  it.skip("shows the authenticated area after logging in", async () => {
    mockApi({
      "GET /api/me": [NOT_LOGGED_IN, LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
      "POST /api/login": [
        { status: 200, body: { code: "logged-in", message: "Logged in" } },
      ],
    });

    render(<App />);
    const loginForm = (
      await screen.findByRole("heading", { name: /log in/i })
    ).closest("form")!;
    await userEvent.type(
      within(loginForm).getByLabelText(/email/i),
      "user@example.com"
    );
    await userEvent.type(
      within(loginForm).getByLabelText(/password/i),
      "ValidPass123"
    );
    await userEvent.click(
      within(loginForm).getByRole("button", { name: /log in/i })
    );

    expect(await screen.findByText(/user@example\.com/)).not.toBeNull();
  });

  // re-enable when /signin exists
  it.skip("returns to the login page after logging out", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
      "POST /api/logout": [
        { status: 200, body: { code: "logged-out", message: "Logged out" } },
      ],
    });

    render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: /log out/i })
    );

    expect(
      await screen.findByRole("heading", { name: /log in/i })
    ).not.toBeNull();
    expect(screen.queryByText(/user@example\.com/)).toBeNull();
  });

  it("stays in the authenticated area and shows an error when logout fails", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
      "POST /api/logout": [
        {
          status: 500,
          body: { code: "server-error", message: "Something went wrong" },
        },
      ],
    });

    render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: /log out/i })
    );

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Something went wrong"
    );
    expect(screen.getByText(/user@example\.com/)).not.toBeNull();
  });
});
