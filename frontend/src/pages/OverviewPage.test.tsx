import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OverviewPage from "./OverviewPage";

type Totals = { spendingCents: number; incomeCents: number; netCents: number };

// Routes fetch calls by URL; each route returns the next queued response. A month of recent
// transactions that a test did not queue is an empty month.
function mockApi(routes: Record<string, { status: number; body: unknown }[]>) {
  const fetchMock = jest.fn(async (url: string) => {
    let response = routes[url]?.shift();
    if (!response && url.startsWith("/api/transactions?month=")) {
      response = {
        status: 200,
        body: { code: "transactions", month: url.split("=")[1], transactions: [] },
      };
    }
    if (!response) throw new Error(`Unexpected request: ${url}`);
    return { ok: response.status < 400, status: response.status, json: async () => response.body };
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderPage() {
  render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>
  );
}

// The comparison requests only: the page also asks for the recent transactions.
function comparisonCalls(fetchMock: { mock: { calls: unknown[][] } }): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith("/api/comparison"));
}

function totals(incomeCents: number, spendingCents: number): Totals {
  return { incomeCents, spendingCents, netCents: incomeCents - spendingCents };
}

function comparison(
  month: string,
  previousMonth: string,
  current: Totals,
  previous: Totals,
  currency = "EUR",
  spendingPercent: number | null = null
) {
  return {
    status: 200,
    body: {
      code: "comparison",
      month,
      previousMonth,
      currency,
      current,
      previous,
      change: {
        spendingCents: current.spendingCents - previous.spendingCents,
        incomeCents: current.incomeCents - previous.incomeCents,
        netCents: current.netCents - previous.netCents,
        spendingPercent,
        incomePercent: null,
      },
    },
  };
}

// The example from the ticket: September income 3,200, spent 2,960, saved 240, and 270 less saved than August.
const SEPTEMBER = comparison("2026-09", "2026-08", totals(320000, 296000), totals(310000, 259000));
const AUGUST = comparison("2026-08", "2026-07", totals(310000, 259000), totals(300000, 250000));
const EMPTY = comparison("2026-10", "2026-09", totals(0, 0), totals(0, 0));
const RATES_UNAVAILABLE = {
  status: 502,
  body: { code: "rates-unavailable", message: "Exchange rates are currently unavailable" },
};

// The three cards and the spending card are articles named by their label.
function card(name: string): HTMLElement {
  return screen.getByRole("article", { name });
}

const INCOME = "Total income";
const SPENT = "Total expenses";
const SAVED = "You saved";

describe("OverviewPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a loading status, then the latest month with income, expenses and saved", async () => {
    const fetchMock = mockApi({ "/api/comparison": [SEPTEMBER] });

    renderPage();

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    expect(await screen.findByRole("heading", { name: "September 2026 · EUR" })).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(card(INCOME).textContent).toContain("€3,200.00");
    expect(card(SPENT).textContent).toContain("€2,960.00");
    expect(card(SAVED).textContent).toContain("€240.00");
    expect(comparisonCalls(fetchMock)).toHaveLength(1);
  });

  it("shows a notice above the cards when some amounts use an older exchange rate (Criterion 8)", async () => {
    mockApi({ "/api/comparison": [{ status: 200, body: { ...SEPTEMBER.body, ratesApproximate: true } }] });

    renderPage();

    expect((await screen.findByRole("note")).textContent).toBe(
      "Some amounts use an older exchange rate because current rates are unavailable."
    );
    expect(card(INCOME)).not.toBeNull();
  });

  it("shows the change of every value vs the previous month with direction, amount and month name", async () => {
    mockApi({ "/api/comparison": [SEPTEMBER] });

    renderPage();
    await screen.findByRole("article", { name: INCOME });

    expect(card(INCOME).textContent).toContain("↑ €100.00 vs August");
    expect(card(SPENT).textContent).toContain("↑ €370.00 vs August");
    expect(card(SAVED).textContent).toContain("↓ €270.00 vs August");
  });

  it("shows 'no change' when a value did not change", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(320000, 296000), totals(320000, 250000))],
    });

    renderPage();
    await screen.findByRole("article", { name: INCOME });

    expect(card(INCOME).textContent).toContain("no change vs August");
  });

  it("shows a negative saved amount with a minus sign", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(100000, 112000), totals(100000, 90000))],
    });

    renderPage();
    await screen.findByRole("article", { name: INCOME });

    expect(card(SAVED).textContent).toContain("-€120.00");
  });

  it("formats amounts in the currency reported by the server", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(1000, 400), totals(0, 0), "USD")],
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "September 2026 · USD" })).not.toBeNull();
    expect(card(INCOME).textContent).toContain("$10.00");
  });

  it("says there are no transactions in the previous month instead of showing a change", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(320000, 296000), totals(0, 0))],
    });

    renderPage();
    await screen.findByRole("article", { name: INCOME });

    for (const name of [INCOME, SPENT, SAVED]) {
      expect(card(name).textContent).toContain("no transactions in August");
      expect(card(name).textContent).not.toMatch(/[↑↓]/);
    }
  });

  it("shows an empty state pointing to the import, and no cards, when the user has no transactions", async () => {
    mockApi({ "/api/comparison": [EMPTY] });

    renderPage();

    const message = await screen.findByText(/no transactions yet/i);
    expect(message.textContent).toMatch(/import/i);
    expect(screen.queryByRole("article")).toBeNull();
  });

  describe("spending card", () => {
    async function showSpending(percent: number | null, previous = totals(310000, 259000)) {
      mockApi({
        "/api/comparison": [comparison("2026-09", "2026-08", totals(320000, 296000), previous, "EUR", percent)],
      });
      renderPage();
      await screen.findByRole("article", { name: INCOME });
      return card("Spending this month");
    }

    it("shows this month's spending and a rise as an up arrow with one decimal", async () => {
      const spending = await showSpending(14.3);

      expect(spending.textContent).toContain("€2,960.00");
      expect(spending.textContent).toContain("vs. August");
      expect(spending.textContent).toContain("↑ 14.3% compared with last month");
    });

    it("shows a fall as a down arrow", async () => {
      const spending = await showSpending(-5);

      expect(spending.textContent).toContain("↓ 5.0% compared with last month");
    });

    it("says there is no change when the percent is 0", async () => {
      const spending = await showSpending(0);

      expect(spending.textContent).toContain("no change compared with last month");
    });

    it("says there was no spending when the previous month only had income", async () => {
      const spending = await showSpending(null, totals(100000, 0));

      expect(spending.textContent).toContain("no spending in August");
      expect(spending.textContent).not.toMatch(/[↑↓]/);
    });

    it("says there were no transactions when the previous month was empty", async () => {
      const spending = await showSpending(null, totals(0, 0));

      expect(spending.textContent).toContain("no transactions in August");
    });
  });

  describe("spending highlight", () => {
    async function showHighlight(percent: number | null) {
      mockApi({
        "/api/comparison": [
          comparison("2026-09", "2026-08", totals(320000, 296000), totals(310000, 259000), "EUR", percent),
        ],
      });
      renderPage();
      await screen.findByRole("article", { name: INCOME });
    }

    it("says how much higher the spending is and links to the insights", async () => {
      await showHighlight(14.3);

      const highlight = screen.getByText(/spending highlight/i).closest("p") as HTMLElement;
      expect(highlight.textContent).toContain("Your spending is 14.3% higher than last month.");
      expect(within(highlight).getByRole("link", { name: "Explore insights" }).getAttribute("href")).toBe("/insights");
    });

    it("says how much lower the spending is", async () => {
      await showHighlight(-5);

      expect(screen.getByText(/spending highlight/i).closest("p")?.textContent).toContain(
        "Your spending is 5.0% lower than last month."
      );
    });

    it("says the spending is the same when the percent is 0", async () => {
      await showHighlight(0);

      expect(screen.getByText(/spending highlight/i).closest("p")?.textContent).toContain(
        "Your spending is the same as last month."
      );
    });

    it("is hidden when there is no percent to show", async () => {
      await showHighlight(null);

      expect(screen.queryByText(/spending highlight/i)).toBeNull();
    });
  });

  describe("recent transactions", () => {
    function transaction(id: string, date: string, counterparty: string, amountCents: number, category: string) {
      return { id, date, counterparty, details: "", amountCents, currency: "EUR", category };
    }
    const SEPTEMBER_TRANSACTIONS = {
      status: 200,
      body: {
        code: "transactions",
        month: "2026-09",
        transactions: [
          transaction("1", "2026-09-30", "REWE", -4250, "groceries"),
          transaction("2", "2026-09-30", "Coffee Fellows", -480, "eating-out"),
          transaction("3", "2026-09-10", "Employer", 320000, "income"),
          transaction("4", "2026-09-05", "Landlord", -85000, "housing"),
        ],
      },
    };

    it("shows the three newest transactions with category, date and signed amount", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER], "/api/transactions?month=2026-09": [SEPTEMBER_TRANSACTIONS] });

      renderPage();
      await screen.findByText("REWE");

      const recent = card("Recent transactions");
      expect(within(recent).getAllByRole("listitem")).toHaveLength(3);
      expect(recent.textContent).toContain("Groceries · 30.09.2026");
      expect(recent.textContent).toContain("-€42.50");
      expect(recent.textContent).toContain("Eating out · 30.09.2026");
      expect(recent.textContent).toContain("+€3,200.00");
      expect(recent.textContent).not.toContain("Landlord");
    });

    it("links to the Transactions page", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });

      expect(screen.getByRole("link", { name: "See all" }).getAttribute("href")).toBe("/transactions");
    });

    it("asks for the shown month, and for the new month after going back", async () => {
      const fetchMock = mockApi({ "/api/comparison": [SEPTEMBER], "/api/comparison?month=2026-08": [AUGUST] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      expect(fetchMock).toHaveBeenCalledWith("/api/transactions?month=2026-09");

      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));
      await screen.findByRole("heading", { name: "August 2026 · EUR" });

      expect(fetchMock).toHaveBeenCalledWith("/api/transactions?month=2026-08");
    });

    it("says so when the month has no transactions", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER] });

      renderPage();

      expect(await screen.findByText("No transactions in this month")).not.toBeNull();
    });

    it("shows an alert in the card, and keeps the cards, when the transactions cannot be loaded", async () => {
      mockApi({
        "/api/comparison": [SEPTEMBER],
        "/api/transactions?month=2026-09": [{ status: 500, body: { code: "server-error", message: "Something went wrong" } }],
      });

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toBe("Recent transactions could not be loaded.");
      expect(card(INCOME)).not.toBeNull();
    });
  });

  describe("import dialog", () => {
    const CSV = new File(["Booking date;Amount"], "export.csv", { type: "text/csv" });
    const IMPORTED = { status: 200, body: { code: "imported", imported: 1, duplicates: 0, rejected: [] } };

    function transactionCalls(fetchMock: { mock: { calls: unknown[][] } }): string[] {
      return fetchMock.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.startsWith("/api/transactions?month="));
    }

    async function openDialog() {
      await userEvent.click(screen.getByRole("button", { name: "Import transactions" }));
    }

    async function importFile() {
      await userEvent.upload(screen.getByLabelText(/csv file/i), CSV);
      await userEvent.click(screen.getByRole("button", { name: "Import" }));
    }

    it("has an Import transactions button in the header that opens the import form in a dialog", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      expect(screen.queryByRole("dialog")).toBeNull();
      await openDialog();

      const dialog = screen.getByRole("dialog", { name: "Import transactions" });
      expect(within(dialog).getByLabelText(/csv file/i)).not.toBeNull();
    });

    it("closes with the Close button and puts the focus back on the button", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await openDialog();
      await userEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Import transactions" }));
    });

    it("loads the totals and the recent transactions again after a successful import", async () => {
      const fetchMock = mockApi({
        "/api/comparison": [SEPTEMBER, SEPTEMBER],
        "/api/transactions/import": [IMPORTED],
      });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await openDialog();
      await importFile();

      expect(await within(screen.getByRole("dialog")).findByRole("status")).not.toBeNull();
      await screen.findByRole("article", { name: INCOME });
      expect(comparisonCalls(fetchMock)).toHaveLength(2);
      expect(transactionCalls(fetchMock)).toHaveLength(2);
    });

    it("does not load anything again when the import fails", async () => {
      const fetchMock = mockApi({
        "/api/comparison": [SEPTEMBER],
        "/api/transactions/import": [{ status: 400, body: { code: "invalid-file", message: "Upload a CSV file" } }],
      });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await openDialog();
      await importFile();

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).not.toBeNull();
      expect(comparisonCalls(fetchMock)).toHaveLength(1);
      expect(transactionCalls(fetchMock)).toHaveLength(1);
    });

    it("is available in the empty state, which points to it, and shows the new data after the first import", async () => {
      mockApi({
        "/api/comparison": [EMPTY, SEPTEMBER],
        "/api/transactions/import": [IMPORTED],
      });

      renderPage();
      expect((await screen.findByText(/no transactions yet/i)).textContent).toMatch(/import transactions/i);
      await openDialog();
      await importFile();

      expect(await screen.findByRole("article", { name: INCOME })).not.toBeNull();
      expect(screen.queryByText(/no transactions yet/i)).toBeNull();
    });
  });

  describe("month navigation", () => {
    it("goes to the previous month and shows its cards", async () => {
      const fetchMock = mockApi({ "/api/comparison": [SEPTEMBER], "/api/comparison?month=2026-08": [AUGUST] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect(await screen.findByRole("heading", { name: "August 2026 · EUR" })).not.toBeNull();
      expect(card(SAVED).textContent).toContain("€510.00");
      expect(card(SAVED).textContent).toContain("vs July");
      expect(comparisonCalls(fetchMock).at(-1)).toBe("/api/comparison?month=2026-08");
    });

    it("disables 'next month' on the latest month and enables it after going back", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER], "/api/comparison?month=2026-08": [AUGUST] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      const next = screen.getByRole("button", { name: /next month/i }) as HTMLButtonElement;
      expect(next.disabled).toBe(true);

      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));
      await screen.findByRole("heading", { name: "August 2026 · EUR" });

      expect(next.disabled).toBe(false);
    });

    it("goes forward again to the latest month", async () => {
      const fetchMock = mockApi({
        "/api/comparison": [SEPTEMBER],
        "/api/comparison?month=2026-08": [AUGUST],
        "/api/comparison?month=2026-09": [SEPTEMBER],
      });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));
      await screen.findByRole("heading", { name: "August 2026 · EUR" });
      await userEvent.click(screen.getByRole("button", { name: /next month/i }));

      expect(await screen.findByRole("heading", { name: "September 2026 · EUR" })).not.toBeNull();
      expect(comparisonCalls(fetchMock).at(-1)).toBe("/api/comparison?month=2026-09");
      expect((screen.getByRole("button", { name: /next month/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("moves back across a year boundary", async () => {
      const january = comparison("2027-01", "2026-12", totals(100000, 50000), totals(100000, 40000));
      const december = comparison("2026-12", "2026-11", totals(100000, 40000), totals(100000, 30000));
      mockApi({ "/api/comparison": [january], "/api/comparison?month=2026-12": [december] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect(await screen.findByRole("heading", { name: "December 2026 · EUR" })).not.toBeNull();
    });

    it("shows zeros for an earlier month without transactions, not the empty state", async () => {
      const july = comparison("2026-07", "2026-06", totals(0, 0), totals(0, 0));
      mockApi({ "/api/comparison": [AUGUST], "/api/comparison?month=2026-07": [july] });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect(await screen.findByRole("heading", { name: "July 2026 · EUR" })).not.toBeNull();
      expect(card(INCOME).textContent).toContain("€0.00");
      expect(screen.queryByText(/no transactions yet/i)).toBeNull();
    });
  });

  describe("errors", () => {
    it("shows an alert and no numbers when exchange rates are unavailable, and retries on request", async () => {
      const fetchMock = mockApi({ "/api/comparison": [RATES_UNAVAILABLE, SEPTEMBER] });

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toMatch(/exchange rates/i);
      expect(screen.queryByRole("article")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(await screen.findByRole("article", { name: INCOME })).not.toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(comparisonCalls(fetchMock)).toHaveLength(2);
    });

    it("shows a generic alert for any other server error", async () => {
      mockApi({ "/api/comparison": [{ status: 500, body: { code: "server-error", message: "Something went wrong" } }] });

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
      expect(screen.getByRole("button", { name: /retry/i })).not.toBeNull();
    });

    it("shows a generic alert when the request fails", async () => {
      globalThis.fetch = jest.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch;

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
    });

    it("shows the error and no cards when moving to another month fails", async () => {
      mockApi({
        "/api/comparison": [SEPTEMBER],
        "/api/comparison?month=2026-08": [RATES_UNAVAILABLE],
      });

      renderPage();
      await screen.findByRole("article", { name: INCOME });
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect((await screen.findByRole("alert")).textContent).toMatch(/exchange rates/i);
      expect(screen.queryByRole("article")).toBeNull();
    });
  });
});
