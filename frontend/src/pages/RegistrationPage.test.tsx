import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegistrationPage from "./RegistrationPage";

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
  await userEvent.click(screen.getByRole("button", { name: /register/i }));
}

describe("RegistrationPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a success message after registering with a valid, unused email and a valid password", async () => {
    const fetchMock = mockFetchResponse(201, {
      code: "registered",
      message: "The registration is succeeded",
    });

    render(<RegistrationPage />);
    await fillAndSubmit("newuser@example.com", "ValidPass123");

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe("The registration is succeeded");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/register",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows the error as an alert when the email is already registered", async () => {
    mockFetchResponse(409, { code: "email-taken", message: "Email already registered" });

    render(<RegistrationPage />);
    await fillAndSubmit("taken@example.com", "ValidPass123");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Email already registered");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a generic error as an alert when the request fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    render(<RegistrationPage />);
    await fillAndSubmit("newuser@example.com", "ValidPass123");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong");
  });

  it("disables the button and clears the previous message while the request is in flight", async () => {
    mockFetchResponse(409, { code: "email-taken", message: "Email already registered" });
    render(<RegistrationPage />);
    await fillAndSubmit("taken@example.com", "ValidPass123");
    await screen.findByRole("alert");

    let finish: (value: unknown) => void = () => {};
    const fetchMock = jest.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    expect((screen.getByRole("button", { name: /register/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();

    finish({
      ok: true,
      status: 201,
      json: async () => ({ code: "registered", message: "The registration is succeeded" }),
    });
    expect((await screen.findByRole("status")).textContent).toBe("The registration is succeeded");
    expect((screen.getByRole("button", { name: /register/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
