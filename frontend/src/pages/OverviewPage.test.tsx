import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewPage from "./OverviewPage";

type Totals = { spendingCents: number; incomeCents: number; netCents: number };

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

function totals(incomeCents: number, spendingCents: number): Totals {
  return { incomeCents, spendingCents, netCents: incomeCents - spendingCents };
}

function comparison(month: string, previousMonth: string, current: Totals, previous: Totals, currency = "EUR") {
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
        spendingPercent: null,
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

function row(name: string): HTMLElement {
  return within(screen.getByRole("table")).getByRole("row", { name: new RegExp(`^${name}`, "i") });
}

describe("OverviewPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a loading status, then the latest month with income, spent and saved", async () => {
    const fetchMock = mockApi({ "/api/comparison": [SEPTEMBER] });

    render(<OverviewPage />);

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    expect(await screen.findByRole("heading", { name: "September 2026 · EUR" })).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(row("Income").textContent).toContain("€3,200.00");
    expect(row("Spent").textContent).toContain("€2,960.00");
    expect(row("Saved").textContent).toContain("€240.00");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows the change of every value vs the previous month with direction, amount and month name", async () => {
    mockApi({ "/api/comparison": [SEPTEMBER] });

    render(<OverviewPage />);
    await screen.findByRole("table");

    expect(row("Income").textContent).toContain("↑ €100.00 vs August");
    expect(row("Spent").textContent).toContain("↑ €370.00 vs August");
    expect(row("Saved").textContent).toContain("↓ €270.00 vs August");
  });

  it("shows 'no change' when a value did not change", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(320000, 296000), totals(320000, 250000))],
    });

    render(<OverviewPage />);
    await screen.findByRole("table");

    expect(row("Income").textContent).toContain("no change vs August");
  });

  it("shows a negative saved amount with a minus sign", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(100000, 112000), totals(100000, 90000))],
    });

    render(<OverviewPage />);
    await screen.findByRole("table");

    expect(row("Saved").textContent).toContain("-€120.00");
  });

  it("formats amounts in the currency reported by the server", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(1000, 400), totals(0, 0), "USD")],
    });

    render(<OverviewPage />);

    expect(await screen.findByRole("heading", { name: "September 2026 · USD" })).not.toBeNull();
    expect(row("Income").textContent).toContain("$10.00");
  });

  it("says there are no transactions in the previous month instead of showing a change", async () => {
    mockApi({
      "/api/comparison": [comparison("2026-09", "2026-08", totals(320000, 296000), totals(0, 0))],
    });

    render(<OverviewPage />);
    await screen.findByRole("table");

    for (const name of ["Income", "Spent", "Saved"]) {
      expect(row(name).textContent).toContain("no transactions in August");
      expect(row(name).textContent).not.toMatch(/[↑↓]/);
    }
  });

  it("shows an empty state pointing to the import, and no table, when the user has no transactions", async () => {
    mockApi({ "/api/comparison": [EMPTY] });

    render(<OverviewPage />);

    const message = await screen.findByText(/no transactions yet/i);
    expect(message.textContent).toMatch(/import/i);
    expect(screen.queryByRole("table")).toBeNull();
  });

  describe("month navigation", () => {
    it("goes to the previous month and shows its table", async () => {
      const fetchMock = mockApi({ "/api/comparison": [SEPTEMBER], "/api/comparison?month=2026-08": [AUGUST] });

      render(<OverviewPage />);
      await screen.findByRole("table");
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect(await screen.findByRole("heading", { name: "August 2026 · EUR" })).not.toBeNull();
      expect(row("Saved").textContent).toContain("€510.00");
      expect(row("Saved").textContent).toContain("vs July");
      expect(fetchMock).toHaveBeenLastCalledWith("/api/comparison?month=2026-08");
    });

    it("disables 'next month' on the latest month and enables it after going back", async () => {
      mockApi({ "/api/comparison": [SEPTEMBER], "/api/comparison?month=2026-08": [AUGUST] });

      render(<OverviewPage />);
      await screen.findByRole("table");
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

      render(<OverviewPage />);
      await screen.findByRole("table");
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));
      await screen.findByRole("heading", { name: "August 2026 · EUR" });
      await userEvent.click(screen.getByRole("button", { name: /next month/i }));

      expect(await screen.findByRole("heading", { name: "September 2026 · EUR" })).not.toBeNull();
      expect(fetchMock).toHaveBeenLastCalledWith("/api/comparison?month=2026-09");
      expect((screen.getByRole("button", { name: /next month/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("moves back across a year boundary", async () => {
      const january = comparison("2027-01", "2026-12", totals(100000, 50000), totals(100000, 40000));
      const december = comparison("2026-12", "2026-11", totals(100000, 40000), totals(100000, 30000));
      mockApi({ "/api/comparison": [january], "/api/comparison?month=2026-12": [december] });

      render(<OverviewPage />);
      await screen.findByRole("table");
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect(await screen.findByRole("heading", { name: "December 2026 · EUR" })).not.toBeNull();
    });

    it("shows zeros for an earlier month without transactions, not the empty state", async () => {
      const july = comparison("2026-07", "2026-06", totals(0, 0), totals(0, 0));
      mockApi({ "/api/comparison": [AUGUST], "/api/comparison?month=2026-07": [july] });

      render(<OverviewPage />);
      await screen.findByRole("table");
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect(await screen.findByRole("heading", { name: "July 2026 · EUR" })).not.toBeNull();
      expect(row("Income").textContent).toContain("€0.00");
      expect(screen.queryByText(/no transactions yet/i)).toBeNull();
    });
  });

  describe("errors", () => {
    it("shows an alert and no numbers when exchange rates are unavailable, and retries on request", async () => {
      const fetchMock = mockApi({ "/api/comparison": [RATES_UNAVAILABLE, SEPTEMBER] });

      render(<OverviewPage />);

      expect((await screen.findByRole("alert")).textContent).toMatch(/exchange rates/i);
      expect(screen.queryByRole("table")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(await screen.findByRole("table")).not.toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("shows a generic alert for any other server error", async () => {
      mockApi({ "/api/comparison": [{ status: 500, body: { code: "server-error", message: "Something went wrong" } }] });

      render(<OverviewPage />);

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
      expect(screen.getByRole("button", { name: /retry/i })).not.toBeNull();
    });

    it("shows a generic alert when the request fails", async () => {
      globalThis.fetch = jest.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch;

      render(<OverviewPage />);

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
    });

    it("keeps the current month's table when moving to another month fails, and shows the error", async () => {
      mockApi({
        "/api/comparison": [SEPTEMBER],
        "/api/comparison?month=2026-08": [RATES_UNAVAILABLE],
      });

      render(<OverviewPage />);
      await screen.findByRole("table");
      await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

      expect((await screen.findByRole("alert")).textContent).toMatch(/exchange rates/i);
      expect(screen.queryByRole("table")).toBeNull();
    });
  });
});
