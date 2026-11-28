import { render, screen, within } from "@testing-library/react";
import TransactionList from "./TransactionList";

function transaction(id: string, date: string, counterparty: string, amountCents: number, category: string, currency = "EUR") {
  return { id, date, counterparty, details: "", amountCents, currency, category };
}

describe("TransactionList", () => {
  it("shows one row per transaction with who, category and date, and the signed amount", () => {
    render(
      <TransactionList
        transactions={[
          transaction("1", "2026-09-30", "REWE", -4250, "groceries"),
          transaction("2", "2026-09-10", "Employer", 320000, "income"),
        ]}
      />
    );

    const [first, second] = screen.getAllByRole("listitem");
    expect(first.textContent).toBe("REWEGroceries · 30.09.2026-€42.50");
    expect(second.textContent).toBe("EmployerIncome · 10.09.2026+€3,200.00");
  });

  it("shows an amount in the currency the transaction was imported in", () => {
    render(<TransactionList transactions={[transaction("1", "2026-09-30", "Shop", -1000, "shopping", "USD")]} />);

    expect(within(screen.getByRole("listitem")).getByText("-$10.00")).not.toBeNull();
  });

  it("shows an amount of zero without a sign", () => {
    render(<TransactionList transactions={[transaction("1", "2026-09-30", "Bank", 0, "other")]} />);

    expect(within(screen.getByRole("listitem")).getByText("€0.00")).not.toBeNull();
  });

  it("shows an unknown category as words", () => {
    render(<TransactionList transactions={[transaction("1", "2026-09-30", "Zoo", -900, "day-trips")]} />);

    expect(screen.getByText("Day trips · 30.09.2026")).not.toBeNull();
  });

  it("shows no rows for no transactions", () => {
    render(<TransactionList transactions={[]} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
