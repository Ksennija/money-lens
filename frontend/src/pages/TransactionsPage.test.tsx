import { jest } from "@jest/globals";
import { act, render, screen, within } from "@testing-library/react";
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

// Every transaction is one list item: the counterparty and the "Category · date" line on the
// left, the signed amount on the right.
function bodyRows() {
  return screen.getAllByRole("listitem");
}
const counterpartyOf = (row: HTMLElement) => row.querySelector("strong")?.textContent;
const amountOf = (row: HTMLElement) => row.querySelectorAll("strong")[1]?.textContent;
const detailLineOf = (row: HTMLElement) => row.querySelector("span")?.textContent;

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

  it("has the heading Transactions with its subtitle, and the list in a card named All transactions", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(screen.getByRole("heading", { level: 1, name: "Transactions" })).not.toBeNull();
    expect(screen.getByText("Manage and track your money")).not.toBeNull();
    const card = screen.getByRole("region", { name: "All transactions" });
    expect(within(card).getAllByRole("listitem")).toHaveLength(3);
    expect(within(card).getByRole("searchbox", { name: "Search transactions" })).not.toBeNull();
  });

  it("shows no table and no column headings", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
  });

  describe("category filter", () => {
    // The filter button is the only button that says whether it is expanded.
    const filterButton = () =>
      (screen.queryByRole("button", { expanded: false }) ?? screen.getByRole("button", { expanded: true })) as HTMLButtonElement;
    const counterparties = () => bodyRows().map(counterpartyOf);
    async function toggleCategory(name: string) {
      if (screen.queryAllByRole("checkbox").length === 0) await userEvent.click(filterButton());
      await userEvent.click(screen.getByRole("checkbox", { name }));
    }

    it("starts on All categories with the panel closed and every row shown", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });

      renderPage();
      await screen.findAllByRole("listitem");

      expect(filterButton().textContent).toBe("All categories");
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
    });

    it("shows only the transactions of a checked category, in the same order", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("Groceries");
    });

    it("shows the union of two checked categories in the original order", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await toggleCategory("Fees");
      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("Groceries, Fees");
    });

    it("shows everything again when the last category is unchecked", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");
      await toggleCategory("Groceries");

      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("All categories");
    });

    it("shows everything again after Clear", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");
      await toggleCategory("Groceries");
      await toggleCategory("Fees");

      await userEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(counterparties()).toEqual(["Bank", "Lidl", "REWE Markt"]);
      expect(filterButton().textContent).toBe("All categories");
    });

    it("does not request the transactions again when the filter changes", async () => {
      const fetchMock = mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

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
      await screen.findAllByRole("listitem");
      expect(counterparties()).toEqual(["Vet", "Lidl"]);

      await toggleCategory("Groceries");

      expect(counterparties()).toEqual(["Lidl"]);
    });

    it("names the checked categories when none matches, and keeps the filter and the month buttons", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await toggleCategory("Other");
      expect(screen.getByText("No transactions in Other in September 2026.")).not.toBeNull();

      await toggleCategory("Health");
      expect(screen.getByText("No transactions in Health and Other in September 2026.")).not.toBeNull();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      expect(filterButton().textContent).toBe("Health, Other");
      expect(button(/previous month/i)).not.toBeNull();
    });

    it("keeps the checked categories when going to the previous and the next month", async () => {
      mockApi({
        "/api/transactions": [MIXED_SEPTEMBER],
        "/api/transactions?month=2026-08": [MIXED_AUGUST],
      });
      renderPage();
      await screen.findAllByRole("listitem");
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
      await screen.findAllByRole("listitem");
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
      await screen.findAllByRole("listitem");
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
      await screen.findAllByRole("listitem");
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

  describe("search", () => {
    const SEARCH_DELAY = 300;
    const searchBox = () => screen.getByRole("searchbox", { name: "Search transactions" }) as HTMLInputElement;
    const counterparties = () => bodyRows().map(counterpartyOf);
    const MUELLER = list("2026-09", [
      tx("2026-09-30", -490, "Bank", "Account fee"),
      tx("2026-09-10", -500, "MÜLLER Bäckerei", "Brötchen"),
    ]);

    // Types the text with a clock the test controls, so the pause can be measured. It is a real
    // clock again afterwards, so the page can load data as usual.
    async function typeInSearch(text: string, { wait = true } = {}) {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.type(searchBox(), text);
      if (wait) act(() => void jest.advanceTimersByTime(SEARCH_DELAY));
      jest.useRealTimers();
    }

    async function clearSearch() {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.clear(searchBox());
      jest.useRealTimers();
    }

    afterEach(() => {
      jest.useRealTimers();
    });

    it("shows a search box named Search transactions, empty, with every row", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });

      renderPage();
      await screen.findAllByRole("listitem");

      expect(searchBox().value).toBe("");
      expect(searchBox().getAttribute("placeholder")).toBe("Search merchant or description…");
      expect(counterparties()).toEqual(["Bank", "Acme GmbH", "REWE Markt"]);
    });

    it("filters 300 ms after the last keystroke, and not before", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.type(searchBox(), "rewe");
      expect(searchBox().value).toBe("rewe");
      act(() => void jest.advanceTimersByTime(SEARCH_DELAY - 1));
      expect(counterparties()).toEqual(["Bank", "Acme GmbH", "REWE Markt"]);

      act(() => void jest.advanceTimersByTime(1));
      expect(counterparties()).toEqual(["REWE Markt"]);
    });

    it.each([
      ["rewe", ["REWE Markt"]],
      ["REWE", ["REWE Markt"]],
      ["  ReWe  ", ["REWE Markt"]],
      ["account fee", ["Bank"]],
      ["EXPENSE REIMBURSEMENT", ["Acme GmbH"]],
      ["card payment", ["REWE Markt"]],
    ])("finds %j in the counterparty or the details, whatever the letter case", async (text, expected) => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch(text);

      expect(counterparties()).toEqual(expected);
    });

    it("ignores letter case for letters outside ASCII too", async () => {
      mockApi({ "/api/transactions": [MUELLER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch("müller");

      expect(counterparties()).toEqual(["MÜLLER Bäckerei"]);
    });

    it.each([["fees"], ["2026"], ["4.90"], ["groceries"]])(
      "does not search the category name, the date or the amount: %j",
      async (text) => {
        mockApi({
          "/api/transactions": [
            list("2026-09", [tx("2026-09-30", -490, "Bank", "Account fee", "EUR", "fees")]),
          ],
        });
        renderPage();
        await screen.findAllByRole("listitem");

        await typeInSearch(text);

        expect(screen.queryAllByRole("listitem")).toHaveLength(0);
        expect(screen.getByText(`No transactions match "${text}" in September 2026.`)).not.toBeNull();
      }
    );

    it("keeps the order the server sent", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch("a");

      expect(counterparties()).toEqual(["Bank", "Acme GmbH", "REWE Markt"]);
    });

    it("sends no request when the text changes", async () => {
      const fetchMock = mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch("rewe");

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("shows every row again at once when the box is cleared, without waiting", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");
      await typeInSearch("rewe");
      expect(counterparties()).toEqual(["REWE Markt"]);

      await clearSearch();

      expect(counterparties()).toEqual(["Bank", "Acme GmbH", "REWE Markt"]);
    });

    it("works together with the category filter: a transaction must match both", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");
      await userEvent.click(screen.getByRole("button", { expanded: false }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Groceries" }));

      await typeInSearch("lidl");
      expect(counterparties()).toEqual(["Lidl"]);

      await clearSearch();
      expect(counterparties()).toEqual(["Lidl", "REWE Markt"]);
    });

    it("names the text when nothing matches, and the checked categories too", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch("zzz");
      expect(screen.getByText('No transactions match "zzz" in September 2026.')).not.toBeNull();

      await userEvent.click(screen.getByRole("button", { expanded: false }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Groceries" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Fees" }));
      expect(screen.getByText('No transactions match "zzz" in Groceries and Fees in September 2026.')).not.toBeNull();
    });

    it("shows the typed text as text, never as HTML", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      const { container } = renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch("<b>x</b>");

      expect(screen.getByText('No transactions match "<b>x</b>" in September 2026.')).not.toBeNull();
      expect(container.querySelector("b")).toBeNull();
    });

    it("keeps the text when going to the previous and the next month", async () => {
      mockApi({
        "/api/transactions": [MIXED_SEPTEMBER],
        "/api/transactions?month=2026-08": [MIXED_AUGUST],
      });
      renderPage();
      await screen.findAllByRole("listitem");
      await typeInSearch("lidl");

      await userEvent.click(button(/previous month/i));
      await screen.findByRole("heading", { name: "August 2026" });
      expect(searchBox().value).toBe("lidl");
      expect(counterparties()).toEqual(["Lidl"]);

      mockApi({ "/api/transactions?month=2026-09": [MIXED_SEPTEMBER] });
      await userEvent.click(button(/next month/i));
      await screen.findByRole("heading", { name: "September 2026" });
      expect(searchBox().value).toBe("lidl");
      expect(counterparties()).toEqual(["Lidl"]);
    });

    it("keeps the text after an error and Retry", async () => {
      mockApi({
        "/api/transactions": [MIXED_SEPTEMBER],
        "/api/transactions?month=2026-08": [SERVER_ERROR, MIXED_AUGUST],
      });
      renderPage();
      await screen.findAllByRole("listitem");
      await typeInSearch("lidl");
      await userEvent.click(button(/previous month/i));
      await screen.findByRole("alert");
      expect(screen.queryByRole("searchbox")).toBeNull();

      await userEvent.click(button(/retry/i));

      await screen.findByRole("heading", { name: "August 2026" });
      expect(searchBox().value).toBe("lidl");
      expect(counterparties()).toEqual(["Lidl"]);
    });

    it("is not shown when the user has no transactions at all, or on an error", async () => {
      mockApi({ "/api/transactions": [NOTHING_AT_ALL] });
      const first = renderPage();
      await screen.findByText(/no transactions yet/i);
      expect(screen.queryByRole("searchbox")).toBeNull();
      first.unmount();

      mockApi({ "/api/transactions": [SERVER_ERROR] });
      renderPage();
      await screen.findByRole("alert");
      expect(screen.queryByRole("searchbox")).toBeNull();
    });

    it("causes no update or error when the page goes away during the pause", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      mockApi({ "/api/transactions": [SEPTEMBER] });
      const { unmount } = renderPage();
      await screen.findAllByRole("listitem");

      await typeInSearch("rewe", { wait: false });
      jest.useFakeTimers();
      unmount();
      act(() => void jest.advanceTimersByTime(SEARCH_DELAY));
      jest.useRealTimers();

      expect(consoleError).not.toHaveBeenCalled();
    });

    it("narrows the count when the search narrows the list, and widens it when the box is cleared", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");
      expect(screen.getByText("3 transactions")).not.toBeNull();

      await typeInSearch("rewe");
      expect(screen.getByText("1 of 3 transactions")).not.toBeNull();

      await clearSearch();
      expect(screen.getByText("3 transactions")).not.toBeNull();
    });

    it("names the tab, the text and the checked categories when nothing matches", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");
      await userEvent.click(screen.getByRole("button", { name: "Expenses" }));

      await typeInSearch("zzz");

      expect(screen.getByText('No expense transactions match "zzz" in September 2026.')).not.toBeNull();
    });
  });

  describe("count", () => {
    it("says how many transactions the month has", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });

      renderPage();
      await screen.findAllByRole("listitem");

      expect(screen.getByText("3 transactions")).not.toBeNull();
    });

    it("uses the singular for one transaction", async () => {
      mockApi({ "/api/transactions": [list("2026-09", [tx("2026-09-30", -490, "Bank", "Account fee")])] });

      renderPage();
      await screen.findAllByRole("listitem");

      expect(screen.getByText("1 transaction")).not.toBeNull();
    });

    it("says how many of the month's transactions are shown when the categories narrow the list", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await userEvent.click(screen.getByRole("button", { expanded: false }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Groceries" }));

      expect(screen.getByText("2 of 3 transactions")).not.toBeNull();
    });

    it("says how many are shown when a tab narrows the list", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await userEvent.click(screen.getByRole("button", { name: "Income" }));

      expect(screen.getByText("1 of 3 transactions")).not.toBeNull();
    });

    it("is announced politely when it changes", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER] });

      renderPage();
      await screen.findAllByRole("listitem");

      expect(screen.getByText("3 transactions").getAttribute("aria-live")).toBe("polite");
    });

    it("is not shown while loading, when the month is empty, or when the user has no transactions at all", async () => {
      mockApi({ "/api/transactions": [NOTHING_AT_ALL] });
      const first = renderPage();
      await screen.findByText(/no transactions yet/i);
      expect(screen.queryByText(/\d+ (of \d+ )?transactions?$/)).toBeNull();
      first.unmount();

      mockApi({ "/api/transactions": [SEPTEMBER], "/api/transactions?month=2026-08": [list("2026-08", [])] });
      renderPage();
      await screen.findAllByRole("listitem");
      await userEvent.click(button(/previous month/i));
      await screen.findByText("No transactions in August 2026.");
      expect(screen.queryByText(/\d+ (of \d+ )?transactions?$/)).toBeNull();
    });
  });

  describe("tabs", () => {
    const WITH_INCOME = list("2026-09", [
      tx("2026-09-30", -490, "Bank", "Account fee", "EUR", "fees"),
      tx("2026-09-12", -3100, "Lidl", "Card payment groceries", "EUR", "groceries"),
      tx("2026-09-10", 320000, "Employer", "Salary", "EUR", "income"),
    ]);
    const WITH_ZERO = list("2026-09", [
      tx("2026-09-30", -490, "Bank", "Account fee"),
      tx("2026-09-20", 0, "Correction", "Zero booking"),
      tx("2026-09-10", 12000, "Acme GmbH", "Reimbursement"),
    ]);
    const counterparties = () => bodyRows().map(counterpartyOf);
    const tabButton = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

    it("starts on All with every transaction shown", async () => {
      mockApi({ "/api/transactions": [WITH_INCOME] });

      renderPage();
      await screen.findAllByRole("listitem");

      expect(screen.getByRole("group", { name: "Transaction type" })).not.toBeNull();
      expect(tabButton("All").getAttribute("aria-pressed")).toBe("true");
      expect(counterparties()).toEqual(["Bank", "Lidl", "Employer"]);
    });

    it("shows only money in under Income and only money out under Expenses, in the original order", async () => {
      mockApi({ "/api/transactions": [WITH_INCOME] });
      renderPage();
      await screen.findAllByRole("listitem");

      await userEvent.click(tabButton("Income"));
      expect(tabButton("Income").getAttribute("aria-pressed")).toBe("true");
      expect(counterparties()).toEqual(["Employer"]);

      await userEvent.click(tabButton("Expenses"));
      expect(counterparties()).toEqual(["Bank", "Lidl"]);

      await userEvent.click(tabButton("All"));
      expect(counterparties()).toEqual(["Bank", "Lidl", "Employer"]);
    });

    it("shows a transaction of zero only under All", async () => {
      mockApi({ "/api/transactions": [WITH_ZERO] });
      renderPage();
      await screen.findAllByRole("listitem");
      expect(counterparties()).toEqual(["Bank", "Correction", "Acme GmbH"]);

      await userEvent.click(tabButton("Income"));
      expect(counterparties()).toEqual(["Acme GmbH"]);

      await userEvent.click(tabButton("Expenses"));
      expect(counterparties()).toEqual(["Bank"]);
    });

    it("works together with the category filter: a transaction must match both", async () => {
      mockApi({ "/api/transactions": [WITH_INCOME] });
      renderPage();
      await screen.findAllByRole("listitem");
      await userEvent.click(screen.getByRole("button", { expanded: false }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Groceries" }));

      await userEvent.click(tabButton("Expenses"));
      expect(counterparties()).toEqual(["Lidl"]);

      await userEvent.click(tabButton("Income"));
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      expect(screen.getByText("No income transactions in Groceries in September 2026.")).not.toBeNull();
    });

    it("names the tab when it leaves nothing to show", async () => {
      mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });
      renderPage();
      await screen.findAllByRole("listitem");

      await userEvent.click(tabButton("Income"));

      expect(screen.getByText("No income transactions in September 2026.")).not.toBeNull();
      expect(screen.getByText("0 of 3 transactions")).not.toBeNull();
    });

    it("sends no request when the tab changes", async () => {
      const fetchMock = mockApi({ "/api/transactions": [WITH_INCOME] });
      renderPage();
      await screen.findAllByRole("listitem");

      await userEvent.click(tabButton("Expenses"));

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("keeps the tab when going to the previous and the next month", async () => {
      mockApi({
        "/api/transactions": [WITH_INCOME],
        "/api/transactions?month=2026-08": [MIXED_AUGUST],
      });
      renderPage();
      await screen.findAllByRole("listitem");
      await userEvent.click(tabButton("Expenses"));

      await userEvent.click(button(/previous month/i));
      await screen.findByRole("heading", { name: "August 2026" });
      expect(tabButton("Expenses").getAttribute("aria-pressed")).toBe("true");
      expect(counterparties()).toEqual(["Pharmacy Apotheke", "Lidl"]);

      mockApi({ "/api/transactions?month=2026-09": [WITH_INCOME] });
      await userEvent.click(button(/next month/i));
      await screen.findByRole("heading", { name: "September 2026" });
      expect(tabButton("Expenses").getAttribute("aria-pressed")).toBe("true");
      expect(counterparties()).toEqual(["Bank", "Lidl"]);
    });

    it("keeps the tab after an error and Retry", async () => {
      mockApi({
        "/api/transactions": [WITH_INCOME],
        "/api/transactions?month=2026-08": [SERVER_ERROR, MIXED_AUGUST],
      });
      renderPage();
      await screen.findAllByRole("listitem");
      await userEvent.click(tabButton("Expenses"));
      await userEvent.click(button(/previous month/i));
      await screen.findByRole("alert");

      await userEvent.click(button(/retry/i));

      await screen.findByRole("heading", { name: "August 2026" });
      expect(tabButton("Expenses").getAttribute("aria-pressed")).toBe("true");
      expect(counterparties()).toEqual(["Pharmacy Apotheke", "Lidl"]);
    });

    it("is not shown when the user has no transactions at all", async () => {
      mockApi({ "/api/transactions": [NOTHING_AT_ALL] });

      renderPage();
      await screen.findByText(/no transactions yet/i);

      expect(screen.queryByRole("group", { name: "Transaction type" })).toBeNull();
    });
  });

  it("shows the category and the date as DD.MM.YYYY in each row, in the order the server sent", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(bodyRows().map(counterpartyOf)).toEqual(["Bank", "Acme GmbH", "REWE Markt"]);
    expect(bodyRows().map(detailLineOf)).toEqual(["Other · 30.09.2026", "Other · 20.09.2026", "Other · 02.09.2026"]);
  });

  it("names the category of each row", async () => {
    mockApi({ "/api/transactions": [MIXED_SEPTEMBER] });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(bodyRows().map(detailLineOf)).toEqual([
      "Fees · 30.09.2026",
      "Groceries · 12.09.2026",
      "Groceries · 02.09.2026",
    ]);
  });

  it("does not show the details of a transaction", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(screen.queryByText(/account fee/i)).toBeNull();
    expect(screen.queryByText(/expense reimbursement/i)).toBeNull();
  });

  it("shows money out with a minus sign and money in with a plus sign", async () => {
    mockApi({ "/api/transactions": [SEPTEMBER] });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(bodyRows().map(amountOf)).toEqual(["-€4.90", "+€120.00", "-€72.18"]);
  });

  it("shows every transaction in the currency it was imported in", async () => {
    mockApi({
      "/api/transactions": [
        list("2026-08", [tx("2026-08-06", -1000, "A", "x", "EUR"), tx("2026-08-05", -1000, "B", "y", "USD")]),
      ],
    });

    renderPage();
    await screen.findAllByRole("listitem");

    expect(bodyRows().map(amountOf)).toEqual(["-€10.00", "-$10.00"]);
  });

  it("shows text from the CSV as text, never as HTML", async () => {
    mockApi({
      "/api/transactions": [list("2026-08", [tx("2026-08-05", -100, "<b>Evil</b>", "<img src=x onerror=alert(1)>")])],
    });

    const { container } = renderPage();
    await screen.findAllByRole("listitem");

    expect(screen.getByText("<b>Evil</b>")).not.toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
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
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      expect(screen.queryByRole("button", { name: /month/i })).toBeNull();
    });

    it("says there are no transactions in an earlier month, and keeps the month buttons", async () => {
      mockApi({ "/api/transactions": [SEPTEMBER], "/api/transactions?month=2026-08": [EMPTY_JULY] });

      renderPage();
      await screen.findByRole("heading", { name: "September 2026" });
      await userEvent.click(button(/previous month/i));

      expect(await screen.findByText("No transactions in July 2026.")).not.toBeNull();
      expect(screen.queryByText(/no transactions yet/i)).toBeNull();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
      expect(button(/next month/i).disabled).toBe(false);
    });
  });

  describe("errors", () => {
    it("shows an alert and no table when the request fails, and retries on request", async () => {
      const fetchMock = mockApi({ "/api/transactions": [SERVER_ERROR, SEPTEMBER] });

      renderPage();

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(await screen.findAllByRole("listitem")).not.toBeNull();
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
      await screen.findAllByRole("listitem");
      await userEvent.click(button(/previous month/i));

      expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);

      await userEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(await screen.findByRole("heading", { name: "August 2026" })).not.toBeNull();
    });
  });
});
