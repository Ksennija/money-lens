import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderPage(onLoggedIn = jest.fn()) {
  render(
    <MemoryRouter>
      <LoginPage onLoggedIn={onLoggedIn} />
    </MemoryRouter>
  );
}

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls onLoggedIn after logging in with correct credentials", async () => {
    const fetchMock = mockFetchResponse(200, { code: "logged-in", message: "Logged in" });
    const onLoggedIn = jest.fn();

    renderPage(onLoggedIn);
    await fillAndSubmit("user@example.com", "ValidPass123");

    await screen.findByRole("button", { name: /sign in/i });
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/login", expect.objectContaining({ method: "POST" }));
  });

  it("shows the generic error as an alert and does not call onLoggedIn when the credentials are wrong", async () => {
    mockFetchResponse(401, { code: "invalid-credentials", message: "Invalid email or password" });
    const onLoggedIn = jest.fn();

    renderPage(onLoggedIn);
    await fillAndSubmit("user@example.com", "WrongPassword123");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Invalid email or password");
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("shows a generic error as an alert when the request fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    renderPage();
    await fillAndSubmit("user@example.com", "ValidPass123");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong");
  });

  it("disables the button and clears the previous error while the request is in flight", async () => {
    mockFetchResponse(401, { code: "invalid-credentials", message: "Invalid email or password" });
    renderPage();
    await fillAndSubmit("user@example.com", "WrongPassword123");
    await screen.findByRole("alert");

    let finish: (value: unknown) => void = () => {};
    globalThis.fetch = jest.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise((resolve) => {
          finish = resolve;
        })
    ) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect((screen.getByRole("button", { name: /sign in/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();

    finish({ ok: false, status: 401, json: async () => ({ code: "invalid-credentials", message: "Invalid email or password" }) });
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: /sign in/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("links to the sign up page", () => {
    renderPage();

    const link = screen.getByRole("link", { name: "Sign up" });
    expect(link.getAttribute("href")).toBe("/signup");
  });

  it("has a Close link to the home page", () => {
    renderPage();

    const link = screen.getByRole("link", { name: "Close and go back to the home page" });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("sets autocomplete on the fields and keeps the page heading", () => {
    renderPage();

    expect(screen.getByLabelText(/email/i).getAttribute("autocomplete")).toBe("email");
    expect(screen.getByLabelText(/password/i).getAttribute("autocomplete")).toBe("current-password");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).not.toBeNull();
  });
});
