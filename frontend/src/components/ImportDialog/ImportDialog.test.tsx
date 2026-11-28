import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportDialog from "./ImportDialog";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderDialog(open: boolean, onClose = jest.fn(), onImported = jest.fn()) {
  const view = render(<ImportDialog open={open} onClose={onClose} onImported={onImported} />);
  return { ...view, onClose, onImported };
}

describe("ImportDialog", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows nothing while it is closed", () => {
    renderDialog(false);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText(/csv file/i)).toBeNull();
  });

  it("opens as a dialog named Import transactions with the import form", () => {
    renderDialog(true);

    expect(screen.getByRole("dialog", { name: "Import transactions" })).not.toBeNull();
    expect(screen.getByLabelText(/csv file/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: "Import" })).not.toBeNull();
  });

  it("asks to close when the Close button is pressed", async () => {
    const { onClose } = renderDialog(true);

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks to close when the browser closes the dialog, e.g. on Escape", () => {
    const { onClose } = renderDialog(true);

    (screen.getByRole("dialog") as HTMLDialogElement).close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes and drops the form when open becomes false, so the next time it starts empty", () => {
    const { rerender, onClose, onImported } = renderDialog(true);

    rerender(<ImportDialog open={false} onClose={onClose} onImported={onImported} />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText(/csv file/i)).toBeNull();
  });

  it("tells the page about a successful import and shows the summary", async () => {
    mockFetchResponse(200, { code: "imported", imported: 5, duplicates: 1, rejected: [] });
    const { onImported } = renderDialog(true);

    await userEvent.upload(
      screen.getByLabelText(/csv file/i),
      new File(["Booking date;Amount"], "export.csv", { type: "text/csv" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    expect((await screen.findByRole("status")).textContent).toBe("5 imported, 1 duplicates skipped, 0 rows rejected");
    expect(onImported).toHaveBeenCalledTimes(1);
  });
});
