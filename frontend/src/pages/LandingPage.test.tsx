import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./LandingPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("has one h1, the hero title", () => {
    renderPage();

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(
      "Understand your money. Make smarter decisions.",
    );
  });

  it("shows the sections in order, each with its own h2", () => {
    renderPage();

    const h2s = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(h2s).toEqual([
      "A better relationship with your money",
      "Your finances, in three simple steps",
      "Your finances should stay yours.",
      "Ready to get a clearer view of your money?",
    ]);

    const main = screen.getByRole("main");
    const ids = Array.from(main.querySelectorAll("section")).map(
      (section) => section.id,
    );
    expect(ids).toEqual(["", "features", "how", "about", ""]);
  });

  it("names every section after its heading", () => {
    renderPage();

    expect(
      screen.getByRole("region", {
        name: "A better relationship with your money",
      }).id,
    ).toBe("features");
    expect(
      screen.getByRole("region", { name: "Your finances, in three simple steps" })
        .id,
    ).toBe("how");
    expect(
      screen.getByRole("region", { name: "Your finances should stay yours." })
        .id,
    ).toBe("about");
  });

  it("shows four features and three steps", () => {
    renderPage();

    const features = within(
      screen.getByRole("region", {
        name: "A better relationship with your money",
      }),
    ).getAllByRole("heading", { level: 3 });
    expect(features.map((heading) => heading.textContent)).toEqual([
      "Track your spending",
      "Discover insights",
      "Compare your months",
      "Build better habits",
    ]);

    const steps = within(
      screen.getByRole("region", { name: "Your finances, in three simple steps" }),
    ).getAllByRole("heading", { level: 3 });
    expect(steps.map((heading) => heading.textContent)).toEqual([
      "Create your account",
      "Add your transactions",
      "Understand your habits",
    ]);
  });

  it("sends both sign up buttons to /signup", () => {
    renderPage();

    expect(
      screen
        .getByRole("link", { name: "Create free account" })
        .getAttribute("href"),
    ).toBe("/signup");
    expect(
      screen
        .getByRole("link", { name: "Get started for free" })
        .getAttribute("href"),
    ).toBe("/signup");
  });

  it("sends Explore features to the features section", () => {
    renderPage();

    expect(
      screen
        .getByRole("link", { name: "Explore features" })
        .getAttribute("href"),
    ).toBe("#features");
  });

  it("has a footer with About, Features and no other links", () => {
    renderPage();

    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", { name: "Footer" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["About", "#about"],
      ["Features", "#features"],
    ]);
    expect(within(footer).getByRole("link", { name: "SpendWise" })).not.toBeNull();
    expect(
      within(footer).getByText("© 2026 SpendWise. Demo project."),
    ).not.toBeNull();
    for (const name of [/privacy/i, /terms/i, /contact/i]) {
      expect(screen.queryByRole("link", { name })).toBeNull();
    }
  });

  it("shows the preview with its sample figures and says they are demo data", () => {
    renderPage();

    const preview = screen.getByRole("img", {
      name: "Illustrative dashboard preview with sample figures",
    });
    expect(within(preview).queryAllByRole("link")).toHaveLength(0);
    expect(preview.textContent).toContain("Demo data");
    expect(preview.textContent).toContain("€2,450.00");
    expect(preview.textContent).toContain("Illustrative dashboard preview · Sample figures");
  });

  it("makes no network request", () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderPage();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
