import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportPage from "./ImportPage";

function mockFetchResponse(status: number, body: unknown) {
  const fetchMock = jest.fn(async (_url: string, _init?: RequestInit) => ({
    ok: status < 400,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const CSV = new File(["Booking date;Amount"], "export.csv", { type: "text/csv" });

async function chooseAndImport(file: File = CSV) {
  await userEvent.upload(screen.getByLabelText(/csv file/i), file);
  await userEvent.click(screen.getByRole("button", { name: /import/i }));
}

describe("ImportPage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uploads the chosen file and shows the summary", async () => {
    const fetchMock = mockFetchResponse(200, {
      code: "imported",
      imported: 36,
      duplicates: 0,
      rejected: [],
    });

    render(<ImportPage />);
    await chooseAndImport();

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe("36 imported, 0 duplicates skipped, 0 rows rejected");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transactions/import",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("lists the rejected rows with their row numbers and reasons", async () => {
    mockFetchResponse(200, {
      code: "imported",
      imported: 2,
      duplicates: 1,
      rejected: [
        { row: 3, reason: "invalid-date" },
        { row: 4, reason: "invalid-amount" },
        { row: 5, reason: "invalid-currency" },
        { row: 6, reason: "empty-description" },
      ],
    });

    render(<ImportPage />);
    await chooseAndImport();

    expect((await screen.findByRole("status")).textContent).toBe(
      "2 imported, 1 duplicates skipped, 4 rows rejected"
    );
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Row 3: invalid date",
      "Row 4: invalid amount",
      "Row 5: invalid currency",
      "Row 6: empty description",
    ]);
  });

  it("shows a whole-file error as an alert", async () => {
    mockFetchResponse(400, {
      code: "missing-columns",
      message: "Missing required columns: Amount",
      missingColumns: ["Amount"],
    });

    render(<ImportPage />);
    await chooseAndImport();

    expect((await screen.findByRole("alert")).textContent).toBe("Missing required columns: Amount");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a generic error as an alert when the request fails", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    render(<ImportPage />);
    await chooseAndImport();

    expect((await screen.findByRole("alert")).textContent).toBe("Something went wrong");
  });

  it("asks for a file without sending a request when none is chosen", async () => {
    const fetchMock = mockFetchResponse(200, { code: "imported", imported: 0, duplicates: 0, rejected: [] });

    render(<ImportPage />);
    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect((await screen.findByRole("alert")).textContent).toBe("Upload a CSV file");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables the button and clears the previous result while the upload is in flight", async () => {
    mockFetchResponse(400, { code: "invalid-file", message: "Upload a CSV file" });
    render(<ImportPage />);
    await chooseAndImport();
    await screen.findByRole("alert");

    let finish: (value: unknown) => void = () => {};
    globalThis.fetch = jest.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise((resolve) => {
          finish = resolve;
        })
    ) as unknown as typeof fetch;

    await userEvent.click(screen.getByRole("button", { name: /import/i }));

    expect((screen.getByRole("button", { name: /import/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("alert")).toBeNull();

    finish({
      ok: true,
      status: 200,
      json: async () => ({ code: "imported", imported: 1, duplicates: 0, rejected: [] }),
    });
    expect((await screen.findByRole("status")).textContent).toBe(
      "1 imported, 0 duplicates skipped, 0 rows rejected"
    );
    expect((screen.getByRole("button", { name: /import/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
