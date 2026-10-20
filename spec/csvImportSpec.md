# Title

User can import banking transactions from a CSV file

## Context

Money Lens needs transaction data to categorize spending and compare months. CSV import is the simplest source: no third-party accounts, no stored bank credentials, and it works with any bank that offers a CSV export. All data is scoped to the logged-in user, so this builds on login.

## Scope

- Upload one CSV file through the web app (logged-in users only)
- Parse it using the single documented format below
- Store the rows as transactions owned by the user
- Skip rows that were already imported (de-duplication)
- Show the result: how many rows were imported, skipped as duplicates and rejected, with the row number and reason for each rejected row

## Accepted CSV format (MVP)

Based on `spec/samples/bank-export-sample.csv`.

- UTF-8 text (a leading BOM is allowed), `;` as separator, first row is a header
- Required columns, matched by header name, case-insensitive, in any order: `Booking date`, `Counterparty`, `Details`, `Amount`, `Currency`
- Other columns (`Value date`, `Balance`, ...) are ignored
- `Booking date`: `DD.MM.YYYY`, must be a real calendar date
- `Amount`: signed decimal with `,` as the decimal separator and at most 2 decimals, e.g. `-12,50`, `3200,00`. Negative is money out, positive is money in
- `Counterparty` and `Details`: text; at least one must be non-empty
- `Currency`: three letters (e.g. `EUR`), stored upper-cased (no conversion)
- Limits: 2 MB file size, 5,000 data rows

## Behaviour: `POST /api/transactions/import`

Multipart upload, field name `file`. Requires a logged-in user.

| Case | Status | `code` |
| --- | --- | --- |
| Not logged in | 401 | `unauthenticated` |
| No file, or not a CSV | 400 | `invalid-file` |
| File over the size or row limit | 413 | `file-too-large` |
| Header missing a required column | 400 | `missing-columns` (lists the missing names) |
| Imported (even if some rows were rejected or skipped) | 200 | `imported` |
| Unexpected failure | 500 | `server-error` |

Success body: `{ code: 'imported', imported: n, duplicates: n, rejected: [{ row, reason }] }`.

- Row numbers count the header as row 1, so the first data row is row 2
- Reject reasons: `invalid-date`, `invalid-amount`, `invalid-currency`, `empty-description`. A row with several problems is reported once, with the first reason in that order
- Valid rows are imported even when other rows are rejected (partial success)
- Valid rows are stored all-or-nothing: if storing fails, none of them are kept

## Data and de-duplication

- A transaction stores: user, date, amount as integer cents (signed), currency, counterparty, details, source (`csv`), an optional external id (reserved for a future bank API source) and creation time
- Amounts are never handled as floating-point numbers
- A row is a duplicate when the same user already has a transaction with the same date, amount and normalized counterparty + details (trimmed, lowercased, whitespace collapsed)
- Only matches against earlier imports count. Identical rows inside the same file are all imported (two identical coffees on one day are legitimate), so re-uploading a file imports nothing
- Transactions belong to their user. Another user importing the same file gets their own copies, not duplicates

## Acceptance criteria

- A logged-in user can upload the sample file and gets 36 transactions stored for them
- Uploading the same file again imports 0 and reports 36 duplicates
- Invalid rows are rejected with row number and reason, and valid rows are still imported
- A file with a missing required column, a non-CSV file or an oversized file is rejected with a clear error and nothing is stored
- A user who is not logged in cannot import
- One user's transactions are never visible to or affected by another user's import

## Out of scope

- Automatic categorization (separate ticket)
- Month-over-month comparison and charts
- Other bank formats, auto-detection of separator, date or decimal style, and column mapping
- Open-banking / aggregator sync
- Viewing, editing or deleting individual transactions
- Currency conversion
- File formats other than CSV

## Dependencies

- Login and logout (done)

## Open questions

- Is a single fixed format enough? Check 2–3 real bank exports before widening the scope
- "Income" is derived from positive amounts. Refunds and reimbursements are positive but are not income
- Concurrent imports by the same user could slip past the duplicate check (accepted for the MVP)
