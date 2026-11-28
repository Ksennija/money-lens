import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthNav from "./MonthNav";

function renderNav(props: Partial<Parameters<typeof MonthNav>[0]> = {}) {
  const onSelect = jest.fn();
  render(<MonthNav month="2026-09" latestMonth="2026-09" busy={false} onSelect={onSelect} {...props} />);
  return onSelect;
}

const previous = () => screen.getByRole("button", { name: "Previous month" }) as HTMLButtonElement;
const next = () => screen.getByRole("button", { name: "Next month" }) as HTMLButtonElement;

describe("MonthNav", () => {
  it("is a group named Month with Previous month, the name of the month and Next month in that order", () => {
    renderNav();

    const group = screen.getByRole("group", { name: "Month" });
    const parts = Array.from(group.children).map((child) => child.textContent);
    expect(parts).toEqual(["Previous month", "September 2026", "Next month"]);
    expect(screen.getByRole("heading", { level: 2, name: "September 2026" })).not.toBeNull();
  });

  it("adds the suffix to the name of the month", () => {
    renderNav({ suffix: "· EUR" });

    expect(screen.getByRole("heading", { name: "September 2026 · EUR" })).not.toBeNull();
  });

  it("asks for the month before when Previous month is pressed", async () => {
    const onSelect = renderNav();

    await userEvent.click(previous());

    expect(onSelect).toHaveBeenCalledWith("2026-08");
  });

  it("asks for December of the year before when January is shown", async () => {
    const onSelect = renderNav({ month: "2027-01", latestMonth: "2027-01" });

    await userEvent.click(previous());

    expect(onSelect).toHaveBeenCalledWith("2026-12");
  });

  it("asks for the month after when Next month is pressed on an earlier month", async () => {
    const onSelect = renderNav({ month: "2026-08" });

    await userEvent.click(next());

    expect(onSelect).toHaveBeenCalledWith("2026-09");
  });

  it("asks for January of the next year when December is shown", async () => {
    const onSelect = renderNav({ month: "2026-12", latestMonth: "2027-03" });

    await userEvent.click(next());

    expect(onSelect).toHaveBeenCalledWith("2027-01");
  });

  it("disables Next month on the latest month only", () => {
    renderNav({ month: "2026-09", latestMonth: "2026-09" });
    expect(next().disabled).toBe(true);
    expect(previous().disabled).toBe(false);
  });

  it("enables Next month on an earlier month", () => {
    renderNav({ month: "2026-08", latestMonth: "2026-09" });

    expect(next().disabled).toBe(false);
  });

  it("disables both buttons while busy", () => {
    renderNav({ month: "2026-08", latestMonth: "2026-09", busy: true });

    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(true);
  });
});
