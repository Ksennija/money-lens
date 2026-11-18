import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InsightsPage from "./InsightsPage";

// Routes fetch calls by URL; each route returns the next queued response.
function mockApi(routes: Record<string, { status: number; body: unknown }[]>) {
  const fetchMock = jest.fn(async (url: string) => {
    const response = routes[url]?.shift();
    if (!response) throw new Error(`Unexpected request: ${url}`);
    return { ok: response.status < 400, status: response.status, json: async () => response.body };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const NO_TRANSACTIONS = {
  status: 200,
  body: { code: "category-changes", month: "2026-11", currency: "EUR", hasTransactions: false, changes: [] },
};

const WITH_CHANGES = {
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
};

const NO_CHANGES = {
  status: 200,
  body: { code: "category-changes", month: "2026-09", currency: "EUR", hasTransactions: true, changes: [] },
};

describe("InsightsPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows only 'No transactions yet this month.' when the user has no transactions (Test Case 15)", async () => {
    const fetchMock = mockApi({ "/api/category-changes": [NO_TRANSACTIONS] });

    render(<InsightsPage />);

    expect(await screen.findByText("No transactions yet this month.")).not.toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { name: /changed this month/ })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows Loading… first, then the headline and the table (Test Cases 19 and 1)", async () => {
    mockApi({ "/api/category-changes": [WITH_CHANGES] });

    render(<InsightsPage />);

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    expect(await screen.findByRole("heading", { name: "🔎 2 things changed this month" })).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("cell", { name: "Shopping" })).not.toBeNull();
    expect(screen.getByRole("cell", { name: "↑ €60" })).not.toBeNull();
    expect(screen.getByRole("cell", { name: "↓ €25" })).not.toBeNull();
  });

  it("shows 'No spending changes…' when no category changed by 1 euro or more (Test Case 16)", async () => {
    mockApi({ "/api/category-changes": [NO_CHANGES] });

    render(<InsightsPage />);

    expect(
      await screen.findByText("No spending changes compared to the same days last month.")
    ).not.toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { name: /changed this month/ })).toBeNull();
  });

  it("shows an alert with Retry after an error, and the table after a successful retry (Test Case 20)", async () => {
    const fetchMock = mockApi({
      "/api/category-changes": [
        { status: 500, body: { code: "server-error", message: "Something went wrong" } },
        WITH_CHANGES,
      ],
    });

    render(<InsightsPage />);

    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "🔎 2 things changed this month" })).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a friendly message when exchange rates are unavailable", async () => {
    mockApi({
      "/api/category-changes": [
        { status: 502, body: { code: "rates-unavailable", message: "Exchange rates are currently unavailable" } },
      ],
    });

    render(<InsightsPage />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Exchange rates are currently unavailable. Try again in a moment."
    );
  });
});
