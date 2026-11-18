import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
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
});
