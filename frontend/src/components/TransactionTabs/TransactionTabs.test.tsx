import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionTabs, { type TransactionType } from "./TransactionTabs";

function renderTabs(value: TransactionType = "all") {
  const onChange = jest.fn();
  render(<TransactionTabs value={value} onChange={onChange} />);
  return onChange;
}

const tab = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("TransactionTabs", () => {
  it("is a group named Transaction type with the tabs All, Income and Expenses in that order", () => {
    renderTabs();

    const group = screen.getByRole("group", { name: "Transaction type" });
    expect(within(group).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "All",
      "Income",
      "Expenses",
    ]);
  });

  it.each([
    ["all", "All"],
    ["income", "Income"],
    ["expense", "Expenses"],
  ] as const)("announces only the selected tab as pressed: %s", (value, selected) => {
    renderTabs(value);

    for (const name of ["All", "Income", "Expenses"]) {
      expect(tab(name).getAttribute("aria-pressed")).toBe(name === selected ? "true" : "false");
    }
  });

  it("reports the type of the tab that was pressed", async () => {
    const onChange = renderTabs("all");

    await userEvent.click(tab("Income"));
    await userEvent.click(tab("Expenses"));
    await userEvent.click(tab("All"));

    expect(onChange.mock.calls).toEqual([["income"], ["expense"], ["all"]]);
  });

  it("works from the keyboard", async () => {
    const onChange = renderTabs("all");

    tab("Expenses").focus();
    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("expense");
  });

  it("only reports the choice and does not select a tab itself", async () => {
    renderTabs("all");

    await userEvent.click(tab("Income"));

    expect(tab("All").getAttribute("aria-pressed")).toBe("true");
    expect(tab("Income").getAttribute("aria-pressed")).toBe("false");
  });
});
