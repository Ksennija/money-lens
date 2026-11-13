import { CATEGORIES, categoryLabel } from "./categories";

describe("CATEGORIES", () => {
  it("lists the 12 categories in the order of the spec, with readable labels", () => {
    expect(CATEGORIES).toEqual([
      { id: "income", label: "Income" },
      { id: "housing", label: "Housing" },
      { id: "utilities", label: "Utilities" },
      { id: "groceries", label: "Groceries" },
      { id: "eating-out", label: "Eating out" },
      { id: "subscriptions", label: "Subscriptions" },
      { id: "health", label: "Health" },
      { id: "transport", label: "Transport" },
      { id: "shopping", label: "Shopping" },
      { id: "entertainment", label: "Entertainment" },
      { id: "fees", label: "Fees" },
      { id: "other", label: "Other" },
    ]);
  });
});

describe("categoryLabel", () => {
  it("returns the label of a known category", () => {
    expect(categoryLabel("eating-out")).toBe("Eating out");
    expect(categoryLabel("groceries")).toBe("Groceries");
  });

  it("makes an unknown id readable", () => {
    expect(categoryLabel("pet-care")).toBe("Pet care");
  });
});
