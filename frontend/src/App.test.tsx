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

// The Overview also asks for the recent transactions of the month it shows.
const NO_RECENT_TRANSACTIONS = {
  status: 200,
  body: { code: "transactions", month: "2026-09", transactions: [] },
};

describe("App", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the landing page at / and the Error page at an unknown URL when signed out", async () => {
    mockApi({ "GET /api/me": [NOT_LOGGED_IN, NOT_LOGGED_IN] });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Understand your money. Make smarter decisions.",
      })
    ).not.toBeNull();
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

  it("shows the landing page at / to a signed-in user, under the app navbar", async () => {
    mockApi({ "GET /api/me": [LOGGED_IN_ME] });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Understand your money. Make smarter decisions.",
      })
    ).not.toBeNull();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Overview" })).not.toBeNull();
    expect(within(nav).getByRole("button", { name: "Sign out" })).not.toBeNull();
    expect(within(nav).queryByRole("link", { name: "About" })).toBeNull();
  });

  it("shows the login page when there is no active session", async () => {
    mockApi({ "GET /api/me": [NOT_LOGGED_IN] });

    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: /sign in/i })
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it.each(["/signin", "/signup"])(
    "shows no navbar at %s, but shows it at / when signed out",
    async (path) => {
      mockApi({ "GET /api/me": [NOT_LOGGED_IN, NOT_LOGGED_IN] });

      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      );
      expect(
        await screen.findByRole("link", { name: "SpendWise" })
      ).not.toBeNull();
      expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
      unmount();

      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );
      await screen.findByRole("heading", { level: 1 });
      expect(screen.getByRole("navigation", { name: "Main" })).not.toBeNull();
    }
  );

  it("shows the authenticated area when a session already exists, e.g. after a reload", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
    });

    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/user@example\.com/)).not.toBeNull();
    expect(screen.getByRole("button", { name: /sign out/i })).not.toBeNull();
    expect(
      await screen.findByRole("heading", { name: "September 2026 · EUR" })
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Import transactions" })
    ).not.toBeNull();
    expect(screen.queryByRole("heading", { name: /sign in/i })).toBeNull();
  });

  it("shows the authenticated area after logging in", async () => {
    mockApi({
      "GET /api/me": [NOT_LOGGED_IN, LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
      "POST /api/login": [
        { status: 200, body: { code: "logged-in", message: "Logged in" } },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/signin"]}>
        <App />
      </MemoryRouter>
    );
    const loginForm = (
      await screen.findByRole("heading", { name: /sign in/i })
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
      within(loginForm).getByRole("button", { name: /sign in/i })
    );

    expect(await screen.findByText(/user@example\.com/)).not.toBeNull();
  });

  it("returns to the login page after logging out", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
      "POST /api/logout": [
        { status: 200, body: { code: "logged-out", message: "Logged out" } },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <App />
      </MemoryRouter>
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /sign out/i })
    );

    expect(
      await screen.findByRole("heading", { name: /sign in/i })
    ).not.toBeNull();
    expect(screen.queryByText(/user@example\.com/)).toBeNull();
  });

  it("stays in the authenticated area and shows an error when logout fails", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/comparison": [COMPARISON],
      "GET /api/transactions?month=2026-09": [NO_RECENT_TRANSACTIONS],
      "POST /api/logout": [
        {
          status: 500,
          body: { code: "server-error", message: "Something went wrong" },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <App />
      </MemoryRouter>
    );
    await userEvent.click(
      await screen.findByRole("button", { name: /sign out/i })
    );

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Something went wrong"
    );
    expect(screen.getByText(/user@example\.com/)).not.toBeNull();
  });

  it("redirects a signed-out user opening /overview to the sign in page", async () => {
    mockApi({ "GET /api/me": [NOT_LOGGED_IN] });

    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: /sign in/i })).not.toBeNull();
  });

  it.each(["/signin", "/signup"])("redirects a signed-in user opening %s to the overview", async (path) => {
    mockApi({ "GET /api/me": [LOGGED_IN_ME], "GET /api/comparison": [COMPARISON] });

    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "September 2026 · EUR" })).not.toBeNull();
    expect(screen.queryByRole("heading", { name: /sign in|sign up/i })).toBeNull();
  });

  it("lands on the sign in page after signing up", async () => {
    mockApi({
      "GET /api/me": [NOT_LOGGED_IN],
      "POST /api/register": [{ status: 201, body: { code: "registered", message: "Registered" } }],
    });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <App />
      </MemoryRouter>
    );
    await userEvent.type(await screen.findByLabelText(/email/i), "new@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "ValidPass123");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("heading", { name: /sign in/i })).not.toBeNull();
  });

  it.each(["/transactions", "/insights"])(
    "redirects a signed-out user opening %s to the sign in page",
    async (path) => {
      mockApi({ "GET /api/me": [NOT_LOGGED_IN] });

      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      );

      expect(await screen.findByRole("heading", { name: /sign in/i })).not.toBeNull();
    }
  );

  it.each([
    ["signed-in", LOGGED_IN_ME],
    ["signed-out", NOT_LOGGED_IN],
  ])("shows the Error page at /history to a %s user", async (_who, me) => {
    mockApi({ "GET /api/me": [me] });

    render(
      <MemoryRouter initialEntries={["/history"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Error page" })).not.toBeNull();
  });

  it("shows the category changes on /insights to a signed-in user", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/category-changes": [
        {
          status: 200,
          body: {
            code: "category-changes",
            month: "2026-09",
            currency: "EUR",
            hasTransactions: true,
            changes: [
              { category: "shopping", direction: "up", amountCents: 5995 },
              { category: "other", direction: "down", amountCents: 2500 },
            ],
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/insights"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "🔎 2 things changed this month" })).not.toBeNull();
    expect(screen.getByRole("cell", { name: "Shopping" })).not.toBeNull();
    expect(screen.getByRole("cell", { name: "Decrease €25" })).not.toBeNull();
  });

  it("shows the transactions of the latest month on /transactions to a signed-in user", async () => {
    mockApi({
      "GET /api/me": [LOGGED_IN_ME],
      "GET /api/transactions": [
        {
          status: 200,
          body: {
            code: "transactions",
            month: "2026-09",
            transactions: [
              { id: "1", date: "2026-09-30", counterparty: "Bank", details: "Account fee", amountCents: -490, currency: "EUR", category: "fees" },
            ],
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/transactions"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "September 2026" })).not.toBeNull();
    expect(screen.getByText("Fees · 30.09.2026")).not.toBeNull();
    expect(screen.getByText("-€4.90")).not.toBeNull();
  });

  it.each([
    [
      "/overview",
      "Overview",
      {
        "GET /api/comparison": [COMPARISON],
        "GET /api/transactions?month=2026-09": [NO_RECENT_TRANSACTIONS],
      },
    ],
    [
      "/transactions",
      "Transactions",
      {
        "GET /api/transactions": [
          { status: 200, body: { code: "transactions", month: "2026-09", transactions: [] } },
        ],
      },
    ],
    [
      "/insights",
      "Insights",
      {
        "GET /api/category-changes": [
          {
            status: 200,
            body: {
              code: "category-changes",
              month: "2026-09",
              currency: "EUR",
              hasTransactions: false,
              changes: [],
            },
          },
        ],
      },
    ],
  ])(
    "shows who is signed in above the heading on %s, with one main and one h1",
    async (path, title, routes) => {
      mockApi({ "GET /api/me": [LOGGED_IN_ME], ...routes });

      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      );

      const heading = await screen.findByRole("heading", { level: 1, name: title });
      const user = screen.getByText("Logged in as user@example.com");
      expect(user.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getAllByRole("main")).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    }
  );
});
