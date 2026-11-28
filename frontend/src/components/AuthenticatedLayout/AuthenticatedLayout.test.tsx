import { render, screen } from "@testing-library/react";
import AuthenticatedLayout from "./AuthenticatedLayout";

function renderLayout() {
  render(
    <AuthenticatedLayout user={{ email: "user@example.com" }}>
      <h1>Some page</h1>
    </AuthenticatedLayout>
  );
}

describe("AuthenticatedLayout", () => {
  it("shows who is signed in above the page", () => {
    renderLayout();

    const user = screen.getByText("Logged in as user@example.com");
    const heading = screen.getByRole("heading", { level: 1, name: "Some page" });
    expect(user.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the page inside the one main landmark", () => {
    renderLayout();

    const main = screen.getByRole("main");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(main.contains(screen.getByRole("heading", { name: "Some page" }))).toBe(true);
    expect(main.contains(screen.getByText("Logged in as user@example.com"))).toBe(true);
  });
});
