import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TransactionsPage from "./TransactionsPage";

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

function tx(
  date: string,
  amountCents: number,
  counterparty: string,
  details: string,
  currency = "EUR",
  category = "other"
) {
  return { id: `${date}-${counterparty}-${amountCents}`, date, counterparty, details, amountCents, currency, category };
}

function list(month: string, transactions: ReturnType<typeof tx>[]) {
  return { status: 200, body: { code: "transactions", month, transactions } };
}

const SEPTEMBER = list("2026-09", [
  tx("2026-09-30", -490, "Bank", "Account fee"),
  tx("2026-09-20", 12000, "Acme GmbH", "Expense reimbursement"),
  tx("2026-09-02", -7218, "REWE Markt", "Card payment groceries"),
]);
const AUGUST = list("2026-08", [tx("2026-08-29", -1425, "Pharmacy Apotheke", "Card payment")]);
const MIXED_SEPTEMBER = list("2026-09", [
  tx("2026-09-30", -490, "Bank", "Account fee", "EUR", "fees"),
  tx("2026-09-12", -3100, "Lidl", "Card payment groceries", "EUR", "groceries"),
  tx("2026-09-02", -7218, "REWE Markt", "Card payment groceries", "EUR", "groceries"),
]);
const MIXED_AUGUST = list("2026-08", [
  tx("2026-08-29", -1425, "Pharmacy Apotheke", "Card payment", "EUR", "health"),
  tx("2026-08-20", -2310, "Lidl", "Card payment groceries", "EUR", "groceries"),
]);
const EMPTY_JULY = list("2026-07", []);
const NOTHING_AT_ALL = list("2026-11", []);
const SERVER_ERROR = { status: 500, body: { code: "server-error", message: "Something went wrong" } };

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionsPage />
    </MemoryRouter>
  );
}

function bodyRows() {
  return screen.getAllByRole("row").slice(1); // the first row holds the column headings
}

const button = (name: RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("TransactionsPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a loading status, then the latest month with its transactions", async () => {
    const fetchMock = mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();

    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
    expect(await screen.findByRole("heading", { name: "September 2026" })).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(bodyRows()).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith("/api/transactions");
  });

  it("has a Transactions heading and the columns Date, Counterparty, Details and Amount", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findByRole("table");

    expect(screen.getByRole("heading", { level: 1, name: "Transactions" })).not.toBeNull();
    const headings = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headings).toEqual(["Date", "Counterparty", "Details", "Amount"]);
  });

  describe("category filter", () => {
    // The filter button is the only button that says whether it is expanded.
    const filterButton = () =>
      (screen.queryByRole("button", { expanded: false }) ?? screen.getByRole("button", { expanded: true })) as HTMLButtonElement;
    const counterparties = () => bodyRows().map((row) => within(row).getAllByRole("cell")[1].textContent);
    async function toggleCategory(name: string) {
      if (screen.queryAllByRole("checkbox").length === 0) await userEvent.click(filterButton());
      await userEvent.click(screen.getByRole("checkbox", { name }));
    }

    it("starts on All categories with the panel closed and every row shown", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });

      renderPage();
      await screen.findByRole("table");

      expect(filterButton().textContent).toBe("All categories");
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
    });

    it("shows only the transactions of a checked category, in the same order", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findByRole("table");

      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("Groceries");
    });

    it("shows the union of two checked categories in the original order", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findByRole("table");

      await toggleCategory("Fees");
      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("Groceries, Fees");
    });

    it("shows everything again when the last category is unchecked", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findByRole("table");
      await toggleCategory("Groceries");

      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("All categories");
    });

    it("shows everything again after Clear", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findByRole("table");
      await toggleCategory("Groceries");
      await toggleCategory("Fees");

      await userEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("All categories");
    });

    it("does not request the transactions again when the filter changes", async () => {
      const fetchMock = mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findByRole("table");

      await toggleCategory("Fees");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("shows a transaction with an unknown category only while nothing is checked", async () => {
      mockApi({
        "/api/transactions": [
          list("2026-09", [
            tx("2026-09-03", -500, "Vet", "Checkup", "EUR", "pet-care"),
            tx("2026-09-02", -700, "Lidl", "Card payment", "EUR", "groceries"),
          ]),
        ],
      });
      renderPage();
      await screen.findByRole("table");
      expect(counterparties()).toEqual(["Vet", "Lidl"]);

      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Lidl"]);
    });

    it("names the checked categories when none matches, and keeps the filter and the month buttons", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findByRole("table");

      await toggleCategory("Other");
      expect(screen.getByText("No transactions in Other in September 2026.")).not.toBeNull();

      await toggleCategory("Health");
      expect(screen.getByText("No transactions in Health and Other in September 2026.")).not.toBeNull();
      expect(screen.queryByRole("table")).toBeNull();
      expect(filterButton().textContent).toBe("Health, Other");
      expect(button(/previous month/i)).not.toBeNull();
    });

    it("keeps the checked categories when going to the previous and the next month", async () => {
      mockApi({
        "/api/transactions": [MIXED_SEPTEMBER],
        "/api/transactions?month=2026-08": [MIXED_AUGUST],
      });
      renderPage();
      await screen.findByRole("table");
      await toggleCategory("Groceries");
      await toggleCategory("Health");

      await userEvent.click(button(/previous month/i));
      await screen.findByRole("heading", { name: "August 2026" });
      expect(filterButton().textContent).toBe("Groceries, Health");
      expect(counterparties()).toEqual(["Pharmacy Apotheke", "Lidl"]);

      mockApi({ "/api/transactions?month=2026-09": [MIXED_SEPTEMBER] });
      await userEvent.click(button(/next month/i));
      await screen.findByRole("heading", { name: "September 2026" });
      expect(filterButton().textContent).toBe("Groceries, Health");
      expect(counterparties()).toEqual(["Lidl", "REWE Markt"]);
    });

    it("says there are no transactions in the category when the other month has none", async () => {
      mockApi({
        "/api/transactions": [MIXED_SEPTEMBER],
        "/api/transactions?month=2026-08": [MIXED_AUGUST],
      });
      renderPage();
      await screen.findByRole("table");
      await toggleCategory("Fees");

      await userEvent.click(button(/previous month/i));

      expect(await screen.findByText("No transactions in Fees in August 2026.")).not.toBeNull();
      expect(filterButton().textContent).toBe("Fees");
    });

    it("keeps the filter and the checked categories while the next month loads", async () => {
      let release: (value: unknown) => void = () => {};
      const pending = new Promise((resolve) => {
        release = resolve;
      });
      globalThis.fetch = jest.fn(async (url: string) => {
        if (url === "/api/transactions") return { ok: true, status: 200, json: async () => MIXED_SEPTEMBER.body };
        await pending;
        return { ok: true, status: 200, json: async () => MIXED_AUGUST.body };
      }) as unknown as typeof fetch;
      renderPage();
      await screen.findByRole("table");
      await toggleCategory("Groceries");

      await userEvent.click(button(/previous month/i));

      expect(screen.getByRole("status").textContent).toMatch(/loading/i);
      expect(filterButton().textContent).toBe("Groceries");
      release(undefined);
      await screen.findByRole("heading", { name: "August 2026" });
      expect(counterparties()).toEqual(["Lidl"]);
    });

    it("keeps the checked categories after an error and Retry", async () => {
      mockApi({
        "/api/transactions": [MIXED_SEPTEMBER],
        "/api/transactions?month=2026-08": [SERVER_ERROR, MIXED_AUGUST],
      });
      renderPage();
      await screen.findByRole("table");
      await toggleCategory("Groceries");
      await userEvent.click(button(/previous month/i));
      await screen.findByRole("alert");

      await userEvent.click(button(/retry/i));

      await screen.findByRole("heading", { name: "August 2026" });
      expect(filterButton().textContent).toBe("Groceries");
      expect(counterparties()).toEqual(["Lidl"]);
    });

    it("is not shown when the user has no transactions at all", async () => {
      mockApi({ "/api/transactions": [NOTHING_AT_ALL] });

      renderPage();
      await screen.findByText(/no transactions yet/i);

      expect(screen.queryByRole("button", { expanded: false })).toBeNull();
    });
  });

  it("shows dates as DD.MM.YYYY and keeps the order the server sent", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findByRole("table");

    const cells = bodyRows().map((row) => within(row).getAllByRole("cell").map((c) => c.textContent));
    expect(cells[0]).toEqual(["30.09.2026", "Bank", "Account fee", "-€4.90"]);
    expect(cells[1][0]).toBe("20.09.2026");
    expect(cells[2][0]).toBe("02.09.2026");
  });

  it("shows money out with a minus sign and money in without one", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findByRole("table");

    const amounts = bodyRows().map((row) => within(row).getAllByRole("cell")[3].textContent);
    expect(amounts).toEqual(["-€4.90", "€120.00", "-€72.18"]);
  });

  it("shows every transaction in the currency it was imported in", async () => {
    mockApi({
      "/api/transactions": [
        list("2026-08", [tx("2026-08-06", -1000, "A", "x", "EUR"), tx("2026-08-05", -1000, "B", "y", "USD")]),
      ],
    });

    renderPage();
    await screen.findByRole("table");

    const amounts = bodyRows().map((row) => within(row).getAllByRole("cell")[3].textContent);
    expect(amounts).toEqual(["-€10.00", "-$10.00"]);
  });

  it("shows text from the CSV as text, never as HTML", async () => {
    mockApi({
      "/api/transactions": [list("2026-08", [tx("2026-08-05", -100, "<b>Evil</b>", "<img src=x onerror=alert(1)>")])],
    });

    renderPage();
    const table = await screen.findByRole("table");

    expect(within(table).getByText("<b>Evil</b>")).not.toBeNull();
    expect(table.querySelector("b")).toBeNull();
    expect(table.querySelector("img")).toBeNull();
  });

  describe("month navigation", () => {
    it("disables 'next month' on the latest month and enables it after going back", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER], "/api/transactions?month=2026-08": [AUGUST] });

      renderPage();
      await screen.findByRole("heading", { name: "September 2026" });
      expect(button(/next month/i).disabled).toBe(true);

      await userEvent.click(button(/previous month/i));

      expect(await screen.findByRole("heading", { name: "August 2026" })).not.toBeNull();
      expect(bodyRows()).toHaveLength(1);
      expect(button(/next month/i).disabled).toBe(false);
    });

    it("goes forward again to the latest month", async () => {
      mockApi({
        "/api/transactions": [SEPTEMBER],
        "/api/transactions?month=2026-08": [AUGUST],
        "/api/transactions?month=2026-09": [SEPTEMBER],
      });

      renderPage();
      await screen.findByRole("heading", { name: "September 2026" });
      await userEvent.click(button(/previous month/i));
      await screen.findByRole("heading", { name: "August 2026" });
      await userEvent.click(button(/next month/i));

      expect(await screen.findByRole("heading", { name: "September 2026" })).not.toBeNull();
      expect(button(/next month/i).disabled).toBe(true);
    });

    it("keeps the previous month on screen and disables the buttons while loading", async () => {
      let release: (value: unknown) => void = () => {};
      const pending = new Promise((resolve) => {
        release = resolve;
      });
      globalThis.fetch = jest.fn(async (url: string) => {
        if (url === "/api/transactions") return { ok: true, status: 200, json: async () => SEPTEMBER.body };
        await pending;
        return { ok: true, status: 200, json: async () => AUGUST.body };
      }) as unknown as typeof fetch;

      renderPage();
      await screen.findByRole("heading", { name: "September 2026" });
      await userEvent.click(button(/previous month/i));

      expect(screen.getByRole("status").textContent).toMatch(/loading/i);
      expect(screen.getByRole("heading", { name: "September 2026" })).not.toBeNull();
      expect(button(/previous month/i).disabled).toBe(true);
      expect(button(/next month/i).disabled).toBe(true);

      release(undefined);
      expect(await screen.findByRole("heading", { name: "August 2026" })).not.toBeNull();
    });

    it("moves back across a year boundary", async () => {
      mockApi({
        "/api/transactions": [list("2027-01", [tx("2027-01-05", -100, "Shop", "x")])],
        "/api/transactions?month=2026-12": [list("2026-12", [tx("2026-12-24", -200, "Shop", "y")])],
      });

      renderPage();
      await screen.findByRole("heading", { name: "January 2027" });
      await userEvent.click(button(/previous month/i));

      expect(await screen.findByRole("heading", { name: "December 2026" })).not.toBeNull();
    });
  });

  describe("empty states", () => {
    it("points to the import, with no table and no month buttons, when the user has no transactions at all", async () => {
      mockApi({ "/api/transactions": [NOTHING_AT_ALL] });

      renderPage();

      expect(await screen.findByText(/no transactions yet/i)).not.toBeNull();
      expect(screen.getByRole("link", { name: /overview page/i }).getAttribute("href")).toBe("/overview");
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.queryByRole("button", { name: /month/i })).toBeNull();
    });

    it("says there are no transactions in an earlier month, and keeps the month buttons", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER], "/api/transactions?month=2026-08": [EMPTY_JULY] });

      renderPage();
      await screen.findByRole("heading", { name: "September 2026" });
      await userEvent.click(button(/previous month/i));

      expect(await screen.findByText("No transactions in July 2026.")).not.toBeNull();
      expect(screen.queryByText(/no transactions yet/i)).toBeNull();
      expect(screen.queryByRole("table")).toBeNull();
      expect(button(/next month/i).disabled).toBe(false);
    });
  });

  describe("errors", () => {
    it("shows an alert and no table when the request fails, and retries on request", async () => {
      const fetchMock = mockApi({ "/api/transactions": [SERVER_ERROR, SEPTEMBER] });

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
      expect(screen.queryByRole("table")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(await screen.findByRole("table")).not.toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("shows a generic alert when the network is down", async () => {
      globalThis.fetch = jest.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch;

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
    });

    it("shows the error instead of the table when moving to another month fails, and retries that month", async () => {
      mockApi({
        "/api/transactions": [SEPTEMBER],
        "/api/transactions?month=2026-08": [SERVER_ERROR, AUGUST],
      });

      renderPage();
      await screen.findByRole("table");
      await userEvent.click(button(/previous month/i));

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
      expect(screen.queryByRole("table")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(await screen.findByRole("heading", { name: "August 2026" })).not.toBeNull();
    });
  });
});
