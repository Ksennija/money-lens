import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
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
  it("shows only Sign up and Sign in links", () => {
    renderAt("/signin");

    const nav = screen.getByRole("navigation");
    expect(nav.querySelectorAll("a")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Sign up" }).getAttribute("href"),
    ).toBe("/signup");
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/signin");
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  });

  it("marks only the link for the current page", () => {
    renderAt("/signin");

    expect(
      screen
        .getByRole("link", { name: "Sign in" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("link", { name: "Sign up" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks no link on /", () => {
    renderAt("/");

    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page"),
    ).toHaveLength(0);
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

  it("shows Overview, Transactions, Insights and Sign out, but not Home, History, Sign up or Sign in", () => {
    renderSignedIn("/overview");

    const nav = screen.getByRole("navigation");
    const names = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(
      screen.getByRole("link", { name: "SpendWise" }).getAttribute("href"),
    ).toBe("/");
    expect(names).toEqual([
      "Overview",
      "Transactions",
      "Insights",
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

describe("NavBar mobile menu", () => {
  function renderMenu() {
    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <NavBar user={{ email: "user@example.com" }} />
        <button type="button">Outside</button>
      </MemoryRouter>,
    );
    return screen.getByRole("button", { name: "Toggle navigation" });
  }

  it("starts closed and points at the navigation panel", () => {
    const menu = renderMenu();

    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(menu.textContent).toBe("☰");
    expect(menu.getAttribute("aria-controls")).toBe(
      screen.getByRole("navigation").id,
    );
  });

  it("opens on click and shows × while open", async () => {
    const menu = renderMenu();

    await userEvent.click(menu);

    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(menu.textContent).toBe("×");
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("opens and closes with %s", async (_name, key) => {
    const menu = renderMenu();
    menu.focus();

    await userEvent.keyboard(key);
    expect(menu.getAttribute("aria-expanded")).toBe("true");

    await userEvent.keyboard(key);
    expect(menu.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and returns focus to the button", async () => {
    const menu = renderMenu();
    await userEvent.click(menu);
    screen.getByRole("link", { name: "Insights" }).focus();

    await userEvent.keyboard("{Escape}");

    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menu);
  });

  it("closes on a click outside the header", async () => {
    const menu = renderMenu();
    await userEvent.click(menu);

    await userEvent.click(screen.getByRole("button", { name: "Outside" }));

    expect(menu.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes after a link is chosen", async () => {
    const menu = renderMenu();
    await userEvent.click(menu);

    await userEvent.click(screen.getByRole("link", { name: "Transactions" }));

    expect(menu.getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open when the panel itself is clicked, not a link", async () => {
    const menu = renderMenu();
    await userEvent.click(menu);

    await userEvent.click(screen.getByRole("navigation"));

    expect(menu.getAttribute("aria-expanded")).toBe("true");
  });
});
