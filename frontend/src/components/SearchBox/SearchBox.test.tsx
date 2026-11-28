import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import SearchBox from "./SearchBox";

const LABEL = "Search transactions";
const PLACEHOLDER = "Search merchant or description…";

// A page keeps the text; this stands in for it so typing builds up as it does in a browser.
function Harness({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <SearchBox
      value={value}
      label={LABEL}
      placeholder={PLACEHOLDER}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("SearchBox", () => {
  it("is a search field with the given accessible name and placeholder", () => {
    render(<SearchBox value="" onChange={jest.fn()} label={LABEL} placeholder={PLACEHOLDER} />);

    const input = screen.getByRole("searchbox", { name: LABEL });
    expect(input.getAttribute("type")).toBe("search");
    expect(input.getAttribute("placeholder")).toBe(PLACEHOLDER);
  });

  it("shows the value it is given", () => {
    render(<SearchBox value="rewe" onChange={jest.fn()} label={LABEL} />);

    expect((screen.getByRole("searchbox", { name: LABEL }) as HTMLInputElement).value).toBe("rewe");
  });

  it("reports the whole text after every keystroke", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.type(screen.getByRole("searchbox", { name: LABEL }), "rew");

    expect(onChange.mock.calls).toEqual([["r"], ["re"], ["rew"]]);
  });

  it("reports an empty text when the user clears the field", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    const input = screen.getByRole("searchbox", { name: LABEL });

    await userEvent.type(input, "rewe");
    await userEvent.clear(input);

    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("hides the magnifier icon from screen readers", () => {
    render(<SearchBox value="" onChange={jest.fn()} label={LABEL} />);

    expect(screen.getByText("⌕").getAttribute("aria-hidden")).toBe("true");
  });
});
