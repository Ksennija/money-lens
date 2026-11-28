import { jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

const DELAY = 300;

function setup(initial: string, applyAtOnce?: (value: string) => boolean) {
  return renderHook(({ value }) => useDebouncedValue(value, DELAY, applyAtOnce), {
    initialProps: { value: initial },
  });
}

function wait(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the first value at once", () => {
    const { result } = setup("abc");

    expect(result.current).toBe("abc");
  });

  it("keeps the old value until the delay has passed, then returns the new one", () => {
    const { result, rerender } = setup("a");

    rerender({ value: "ab" });
    wait(DELAY - 1);
    expect(result.current).toBe("a");

    wait(1);
    expect(result.current).toBe("ab");
  });

  it("starts the wait again with every change, so a fast typist changes the value once", () => {
    const seen: string[] = [];
    const { result, rerender } = renderHook(
      ({ value }) => {
        const debounced = useDebouncedValue(value, DELAY);
        seen.push(debounced);
        return debounced;
      },
      { initialProps: { value: "" } }
    );

    rerender({ value: "r" });
    wait(200);
    rerender({ value: "re" });
    wait(200);
    rerender({ value: "rew" });
    wait(DELAY - 1);
    expect(result.current).toBe("");

    wait(1);
    expect(result.current).toBe("rew");
    expect(seen).not.toContain("r");
    expect(seen).not.toContain("re");
  });

  it("applies a value at once when applyAtOnce says so, without waiting", () => {
    const { result, rerender } = setup("abc", (value) => value === "");

    rerender({ value: "" });

    expect(result.current).toBe("");
  });

  it("does not bring the old text back when the user types again right after clearing", () => {
    const { result, rerender } = setup("abc", (value) => value === "");

    rerender({ value: "" });
    wait(100);
    rerender({ value: "x" });
    expect(result.current).toBe("");

    wait(DELAY);
    expect(result.current).toBe("x");
  });

  it("still waits for values that applyAtOnce does not accept", () => {
    const { result, rerender } = setup("a", (value) => value === "");

    rerender({ value: "ab" });
    expect(result.current).toBe("a");

    wait(DELAY);
    expect(result.current).toBe("ab");
  });

  it("cancels the waiting timer when the component goes away", () => {
    const { rerender, unmount } = setup("a");

    rerender({ value: "ab" });
    expect(jest.getTimerCount()).toBe(1);

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
