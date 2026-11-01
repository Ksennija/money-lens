import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import NavBar from "./NavBar";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar user={null} />
    </MemoryRouter>,
  );
}

describe("NavBar", () => {
  it("shows Home, Sign up and Sign in links", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation");
    expect(nav.querySelectorAll("a")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("href"),
    ).toBe("/");
    expect(
      screen.getByRole("link", { name: "Sign up" }).getAttribute("href"),
    ).toBe("/signup");
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/signin");
  });

  it("marks only the link for the current page", () => {
    renderAt("/signin");

    expect(
      screen
        .getByRole("link", { name: "Sign in" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("aria-current"),
    ).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Sign up" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Home on / only", () => {
    renderAt("/");

    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("NavBar when signed in", () => {
  const user = { email: "user@example.com" };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderSignedIn(path: string, onLoggedOut = jest.fn()) {
    render(
      <MemoryRouter initialEntries={[path]}>
        <NavBar user={user} onLoggedOut={onLoggedOut} />
      </MemoryRouter>,
    );
    return onLoggedOut;
  }

  function mockLogout(status: number) {
    globalThis.fetch = jest.fn(async () => ({
      ok: status < 400,
      status,
    })) as unknown as typeof fetch;
  }

  it("shows Home, Overview, Transactions, Insights, History and Sign out, but not Sign up or Sign in", () => {
    renderSignedIn("/overview");

    const names = screen.getAllByRole("link").map((link) => link.textContent);
    expect(names).toEqual([
      "Home",
      "Overview",
      "Transactions",
      "Insights",
      "History",
    ]);
    expect(screen.getByRole("button", { name: "Sign out" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /sign (up|in)/i })).toBeNull();
  });

  it("marks only the current page", () => {
    renderSignedIn("/transactions");

    expect(
      screen
        .getByRole("link", { name: "Transactions" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Overview" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("calls onLoggedOut after a successful logout", async () => {
    mockLogout(200);
    const onLoggedOut = renderSignedIn("/overview");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(onLoggedOut).toHaveBeenCalledTimes(1);
  });

  it("shows an error and stays signed in when logout fails", async () => {
    mockLogout(500);
    const onLoggedOut = renderSignedIn("/overview");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Something went wrong",
    );
    expect(onLoggedOut).not.toHaveBeenCalled();
  });
});
