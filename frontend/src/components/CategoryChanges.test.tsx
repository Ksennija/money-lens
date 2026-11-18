import { render, screen, within } from "@testing-library/react";
import CategoryChanges from "./CategoryChanges";

// The changes of spec/samples/bank-export-sample.csv, September against August (Test Case 1).
const CHANGES = [
  { category: "shopping", direction: "up" as const, amountCents: 5995 },
  { category: "groceries", direction: "up" as const, amountCents: 2968 },
  { category: "other", direction: "down" as const, amountCents: 2500 },
  { category: "entertainment", direction: "up" as const, amountCents: 2400 },
  { category: "health", direction: "down" as const, amountCents: 1425 },
  { category: "eating-out", direction: "up" as const, amountCents: 1220 },
  { category: "fees", direction: "up" as const, amountCents: 490 },
  { category: "transport", direction: "up" as const, amountCents: 270 },
];

describe("CategoryChanges", () => {
  it("shows the headline and a Category / Change table in the given order (Test Case 1)", () => {
    render(<CategoryChanges changes={CHANGES} currency="EUR" />);

    expect(screen.getByRole("heading", { name: "🔎 8 things changed this month" })).toBeTruthy();

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(["Category", "Change"]);

    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
    expect(rows).toEqual([
      ["Shopping", "↑ €60"],
      ["Groceries", "↑ €30"],
      ["Other", "↓ €25"],
      ["Entertainment", "↑ €24"],
      ["Health", "↓ €14"],
      ["Eating out", "↑ €12"],
      ["Fees", "↑ €5"],
      ["Transport", "↑ €3"],
    ]);
  });

  it("says '1 thing changed' for a single row (Test Case 10)", () => {
    render(<CategoryChanges changes={[CHANGES[0]]} currency="EUR" />);

    expect(screen.getByRole("heading", { name: "🔎 1 thing changed this month" })).toBeTruthy();
  });
});
