import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryFilter from "./CategoryFilter";

const LABELS = [
  "Income", "Housing", "Utilities", "Groceries", "Eating out", "Subscriptions",
  "Health", "Transport", "Shopping", "Entertainment", "Fees", "Other",
];

function renderFilter(selected: string[] = []) {
  const onChange = jest.fn();
  render(
    <div>
      <h1>Outside</h1>
      <CategoryFilter selected={selected} onChange={onChange} />
    </div>
  );
  return onChange;
}

const toggle = (name: string | RegExp) => screen.getByRole("button", { name }) as HTMLButtonElement;
const openPanel = async (name: string | RegExp = "All categories") => userEvent.click(toggle(name));

describe("CategoryFilter", () => {
  it("starts closed, with the button not expanded and no checkboxes", () => {
    renderFilter();

    expect(toggle("All categories").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("opens a Categories group with the 12 labelled checkboxes in order, none checked", async () => {
    renderFilter();

    await openPanel();

    expect(toggle("All categories").getAttribute("aria-expanded")).toBe("true");
    const group = screen.getByRole("group", { name: "Categories" });
    const boxes = within(group).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((b) => b.labels?.[0]?.textContent?.trim())).toEqual(LABELS);
    expect(boxes.every((b) => !b.checked)).toBe(true);
  });

  it("closes the panel when the button is pressed again", async () => {
    renderFilter();
    await openPanel();

    await userEvent.click(toggle("All categories"));

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(toggle("All categories").getAttribute("aria-expanded")).toBe("false");
  });

  it.each([
    [[], "All categories"],
    [["groceries"], "Groceries"],
    [["eating-out", "groceries"], "Groceries, Eating out"],
    [["groceries", "eating-out", "fees"], "3 categories"],
  ])("shows %j on the button as %s", (selected, text) => {
    renderFilter(selected);

    expect(toggle(text)).not.toBeNull();
  });

  it("shows the checked categories as checked", async () => {
    renderFilter(["groceries", "fees"]);

    await openPanel("Groceries, Fees");

    const checked = (screen.getAllByRole("checkbox") as HTMLInputElement[])
      .filter((b) => b.checked)
      .map((b) => b.labels?.[0]?.textContent?.trim());
    expect(checked).toEqual(["Groceries", "Fees"]);
  });

  it("reports a checked category in the order of the list, not of the clicks", async () => {
    const onChange = renderFilter(["fees"]);
    await openPanel("Fees");

    await userEvent.click(screen.getByRole("checkbox", { name: "Groceries" }));

    expect(onChange).toHaveBeenCalledWith(["groceries", "fees"]);
  });

  it("reports the list without a category that is unchecked", async () => {
    const onChange = renderFilter(["groceries", "fees"]);
    await openPanel("Groceries, Fees");

    await userEvent.click(screen.getByRole("checkbox", { name: "Groceries" }));

    expect(onChange).toHaveBeenCalledWith(["fees"]);
  });

  it("clears the selection with the Clear button", async () => {
    const onChange = renderFilter(["groceries", "fees"]);
    await openPanel("Groceries, Fees");

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disables Clear when nothing is checked", async () => {
    renderFilter([]);

    await openPanel();

    expect((screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("closes on Escape and puts the focus back on the button", async () => {
    renderFilter(["groceries"]);
    await openPanel("Groceries");
    await userEvent.click(screen.getByRole("checkbox", { name: "Fees" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(document.activeElement).toBe(toggle("Groceries"));
  });

  it("closes on a click outside and stays open on a click inside", async () => {
    renderFilter();
    await openPanel();

    await userEvent.click(screen.getByRole("checkbox", { name: "Fees" }));
    await userEvent.click(screen.getByText("Categories"));
    expect(screen.getAllByRole("checkbox")).toHaveLength(12);

    await userEvent.click(screen.getByRole("heading", { name: "Outside" }));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});
