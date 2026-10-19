import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));
}

describe("LoginPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls onLoggedIn after logging in with correct credentials", async () => {
    const fetchMock = mockFetchResponse(200, { code: "logged-in", message: "Logged in" });
    const onLoggedIn = jest.fn();

    render(<LoginPage onLoggedIn={onLoggedIn} />);
    await fillAndSubmit("user@example.com", "ValidPass123");

    await screen.findByRole("button", { name: /log in/i });
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/login", expect.objectContaining({ method: "POST" }));
  });

  it("shows the generic error as an alert and does not call onLoggedIn when the credentials are wrong", async () => {
    mockFetchResponse(401, { code: "invalid-credentials", message: "Invalid email or password" });
    const onLoggedIn = jest.fn();

    render(<LoginPage onLoggedIn={onLoggedIn} />);
    await fillAndSubmit("user@example.com", "WrongPassword123");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Invalid email or password");
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("shows a generic error as an alert when the request fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    render(<LoginPage onLoggedIn={jest.fn()} />);
    await fillAndSubmit("user@example.com", "ValidPass123");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong");
  });

  it("disables the button and clears the previous error while the request is in flight", async () => {
    mockFetchResponse(401, { code: "invalid-credentials", message: "Invalid email or password" });
    render(<LoginPage onLoggedIn={jest.fn()} />);
    await fillAndSubmit("user@example.com", "WrongPassword123");
    await screen.findByRole("alert");

    let finish: (value: unknown) => void = () => {};
    globalThis.fetch = jest.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise((resolve) => {
          finish = resolve;
        })
    ) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect((screen.getByRole("button", { name: /log in/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();

    finish({ ok: false, status: 401, json: async () => ({ code: "invalid-credentials", message: "Invalid email or password" }) });
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: /log in/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
