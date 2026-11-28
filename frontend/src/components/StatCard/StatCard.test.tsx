import { render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("is an article named by its label, with the value", () => {
    render(<StatCard label="Total income" value="€3,200.00" />);

    const card = screen.getByRole("article", { name: "Total income" });
    expect(card.textContent).toContain("€3,200.00");
  });

  it("shows the change line when there is one", () => {
    render(<StatCard label="Total income" value="€3,200.00" change="↑ €100.00 vs August" />);

    expect(screen.getByRole("article", { name: "Total income" }).textContent).toContain("↑ €100.00 vs August");
  });

  it("shows no change line when there is nothing to compare with", () => {
    render(<StatCard label="Income" value="€3,200.00" />);

    expect(screen.getByRole("article", { name: "Income" }).querySelectorAll("p")).toHaveLength(2);
  });

  it("keeps each card's own name when several cards are on one page", () => {
    render(
      <>
        <StatCard label="Total income" value="€3,200.00" />
        <StatCard label="Total expenses" value="€2,960.00" />
        <StatCard label="You saved" value="€240.00" />
      </>
    );

    expect(screen.getByRole("article", { name: "Total income" }).textContent).toContain("€3,200.00");
    expect(screen.getByRole("article", { name: "Total expenses" }).textContent).toContain("€2,960.00");
    expect(screen.getByRole("article", { name: "You saved" }).textContent).toContain("€240.00");
  });

  it("accepts a tone for the value and for the change without changing the text", () => {
    render(
      <StatCard
        label="You saved"
        value="-€120.00"
        valueTone="bad"
        change="↓ €270.00 vs August"
        changeTone="bad"
      />
    );

    const card = screen.getByRole("article", { name: "You saved" });
    expect(card.textContent).toContain("-€120.00");
    expect(card.textContent).toContain("↓ €270.00 vs August");
  });
});
