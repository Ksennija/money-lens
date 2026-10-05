import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegistrationPage from "./RegistrationPage";

describe("RegistrationPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a success message after registering with a valid, unused email and a valid password", async () => {
    const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 201,
      json: async () => ({ message: "The registration is succeeded" }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<RegistrationPage />);

    await userEvent.type(
      screen.getByLabelText(/email/i),
      "newuser@example.com"
    );
    await userEvent.type(screen.getByLabelText(/password/i), "ValidPass123");
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(
      await screen.findByText("The registration is succeeded")
    ).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/register",
      expect.objectContaining({ method: "POST" })
    );
  });
});
