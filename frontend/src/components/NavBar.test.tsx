import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavBar from "./NavBar";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
    </MemoryRouter>
  );
}

describe("NavBar", () => {
  it("shows Home, Sign up and Sign in links", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation");
    expect(nav.querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/signin");
  });

  it("marks only the link for the current page", () => {
    renderAt("/signin");

    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("aria-current")).toBeNull();
  });

  it("marks Home on / only", () => {
    renderAt("/");

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
  });
});
