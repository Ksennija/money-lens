# Title

User can see imported transactions

## Context

After importing a bank CSV (`csvImportSpec.md`) the user can see monthly totals (`transactionsOverviewSpec.md`) but not the transactions behind them. The Transactions page (`/transactions`) is a placeholder, and no endpoint returns transactions: the backend has register, login, logout, me, import and comparison only. This feature lists the user's transactions for one month, so they can check the import worked and see where their money went. Automatic categories and the category filter are the next two tickets and build on this list. The page is shown to logged-in users only.

## Scope

- A table of the user's transactions for one month: Date, Counterparty, Details, Amount
- The page opens on the latest month that has transactions. The user can move to the previous and next month
- Loading, error and empty states
- A new endpoint `GET /api/transactions` that returns the signed-in user's transactions for a month
- A refactor first: the month navigation moves out of `OverviewPage` into shared code (see Shared month navigation)

## User flow

1. A signed-in user opens Transactions from the nav bar
2. The page shows "Loading…", then the latest month that has transactions (for the sample file: September 2026)
3. The user reads the table, newest first. Previous month shows August 2026. Next month returns to September
4. Next month is disabled on the latest month. Previous month is not limited (as on the Overview), so an empty earlier month shows the empty-month message
5. A user with no transactions sees a pointer to the import on the Overview page

## Behaviour

- Columns: **Date**, **Counterparty**, **Details**, **Amount**. Rows are sorted newest first
- **Date** is shown as `DD.MM.YYYY`, the same as in the CSV (`01.08.2026`). It is built from the ISO date string by splitting it, so no time zone can shift the day
- **Amount** is shown with its sign (money out is negative) and the row's own currency, formatted like the Overview, e.g. "-€54.37" and "€3,200.00". Amounts are not converted
- The heading names the month, e.g. "September 2026"
- Month navigation: "Previous month" and "Next month" buttons. "Next month" is disabled on the latest month with transactions (the month the page opened on). "Previous month" is not limited
- CSV text (counterparty, details) is rendered as text only, never as HTML
- Money is formatted for display only. No money arithmetic in the browser
- The page is part of the authenticated area. A logged-out user is redirected to sign in

## States

| State                                       | What the user sees                                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Loading                                     | A status message "Loading…"                                                                                           |
| User has no transactions at all             | "No transactions yet. Import a CSV file on the Overview page." with a link to `/overview`. No table, no month buttons |
| Month with no transactions but others exist | "No transactions in September 2026." The month buttons stay                                                           |
| Any error                                   | An alert with an error message and a Retry button                                                                     |
| Moving to another month fails               | The error and a Retry button replace the table, as on the Overview. Retry asks for the month again                    |

## Shared month navigation

`OverviewPage.tsx` owns the month logic today: the latest month, Previous/Next, the latest-request guard and the loading/error states. It is extracted first so both pages behave the same. The Overview tests must pass unchanged after the extraction.

- `frontend/src/lib/months.ts` (new): `formatMonth`, `formatMonthName`, `nextMonth`, moved out of `OverviewPage.tsx`
- `frontend/src/hooks/useMonthNavigation.ts` (new): takes `fetchMonth(month?)` returning `{ ok: true, data } | { ok: false, code, message }`, where data has a `month`. It owns the `loading | ready | error` view (the previous data stays on screen while loading), `requested`, `latestMonth` (set by the request without a month), the latest-request guard, `load(month?)` and the first request on mount. Each page decides its own "empty" rule
- `frontend/src/components/MonthNav.tsx` (new): the Previous/Next buttons. `busy` disables both. Next is disabled when the month equals `latestMonth`. The month heading stays in each page (the Overview adds the currency)
- `frontend/src/pages/OverviewPage.tsx`: switched to the hook, the helpers and `MonthNav`. No visible change

## Frontend changes

- `frontend/src/api/transactions.ts` (new), modelled on `api/comparison.ts`: `getTransactions(month?)`. It validates the body and returns a generic server error for a malformed body or a failed request
- `frontend/src/pages/TransactionsPage.tsx` (new): a "Transactions" heading, `MonthNav` and the table (`scope="col"` headers). It replaces the Transactions placeholder in `frontend/src/App.tsx` (`PRIVATE_PLACEHOLDERS`)

## Backend change

`GET /api/transactions?month=YYYY-MM` (new), behind `requireAuth`.

- `month` is optional. Without it the endpoint uses the month of the user's most recent transaction. If the user has none it uses the current month with an empty list (same rule as `GET /api/comparison`)
- 200 response:

  ```json
  {
    "code": "transactions",
    "month": "2026-09",
    "transactions": [
      {
        "id": "…",
        "date": "2026-09-30",
        "counterparty": "Bank",
        "details": "Account fee",
        "amountCents": -490,
        "currency": "EUR"
      }
    ]
  }
  ```

- Amounts are the stored ones, in their original currency. No conversion, so there are no exchange-rate errors
- Order: date descending, then `createdAt` descending, then `id`. Rows from one import share a timestamp, so the order of transactions on the same day is stable but not meaningful
- Files:
  - `backend/src/db/transactionRepository.ts`: new `findTransactionsInRange(userId, startDate, endDate)`, with the same [start, end) bounds as `findTransactionAmounts`. Reuse `findLatestTransactionDate`
  - `backend/src/services/transactionsService.ts` (new): resolves the month (the same rule as `resolveMonth` in `monthlyComparisonService.ts`, which moves to a shared place instead of being copied) and uses `monthBounds` from `domain/comparison/compareMonths.ts`
  - `backend/src/routes/transactions.ts` (new), modelled on `routes/comparison.ts`, registered in `app.ts`
- Data changes: none. No schema change and no migration. `Transaction` already has `date`, `amountCents`, `currency`, `counterparty` and `details`, and an index on `[userId, date]`

## Error cases

| Case                                             | Result                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| No session                                       | 401 `unauthenticated` (`requireAuth`)                            |
| `month` malformed (`abc`, `2026-13`, `2026-8`)   | 400 `invalid-month`, "Month must look like 2026-08"              |
| `month` given more than once                     | 400 `invalid-month`                                              |
| Database or unexpected error                     | 500 `server-error`, "Something went wrong", logged on the server |
| Network failure or malformed body in the browser | A generic error message and Retry                                |

## Acceptance criteria

- A signed-in user with imported transactions sees a table with Date, Counterparty, Details and Amount for the latest month that has transactions
- Rows are sorted newest first
- Amounts show their sign (money out negative) and their original currency
- Dates are shown as `DD.MM.YYYY`
- The user can move to the previous and next month and the table updates. "Next month" is disabled on the latest month with transactions
- With no transactions at all the user sees "No transactions yet. Import a CSV file on the Overview page." and no table
- A month without transactions shows "No transactions in <Month Year>."
- While loading the user sees "Loading…". When the request fails the user sees an error message and a Retry button
- A user sees only their own transactions
- A signed-out request to the endpoint returns 401 and an invalid month returns 400
- After importing `spec/samples/bank-export-sample.csv`, September 2026 shows 18 transactions and August 2026 shows 18
- The Overview works exactly as before

## Tests

Backend (`backend/src/transactions.test.ts`, supertest with the real test database and the helpers of `comparison.test.ts`: `loggedInAgent`, `prisma.transaction.createMany`, cleanup by deleting the users):

- returns the month's transactions, newest first, with all fields
- includes the first and last day of the month and excludes the days before and after
- keeps original currencies, no conversion
- without `month`: the month of the latest transaction. With no transactions: the current month and an empty list. An explicit month wins over newer data
- never includes another user's transactions
- 400 `invalid-month` for a malformed and for a repeated `month`. 401 without a session
- a repository test next to `transactionRepository.test.ts` for range bounds, ordering and user scope

Frontend (fetch mocked by URL, as in `OverviewPage.test.tsx`):

- `lib/months.test.ts`: `formatMonth("2026-09")` is "September 2026" and `nextMonth("2026-12")` is "2027-01"
- `useMonthNavigation`, tested through the pages: loading then ready, keeps the previous data while loading, ignores an outdated response, error and retry
- `TransactionsPage.test.tsx`: columns and order, signed amounts and currencies, `DD.MM.YYYY` dates, the no-transactions message with its link, the empty-month message, Previous/Next with the disabled Next on the latest month, a year boundary, error with Retry, a failure while moving shows the error and Retry instead of the table
- `App.test.tsx`: `/transactions` shows the page (replaces the placeholder heading test) and a signed-out `/transactions` still redirects to sign in
- `OverviewPage.test.tsx` and the Overview cases in `App.test.tsx` pass unchanged after the refactor

## Assumptions

- One month can be returned in full (hundreds of rows). No pagination
- Amounts follow the Overview formatting (en-US). Dates use the CSV format `DD.MM.YYYY`. Both can be changed in one place
- The order of transactions on the same day is not meaningful, only stable
- The latest month is derived from the user's most recent transaction, as on the Overview
- A list without conversion needs no exchange rates, so the rates error does not apply
- `id` is returned for list keys only

## Out of scope

- Categories and the category filter (the next two tickets)
- Pagination, search and sorting controls
- Editing, deleting or recategorizing transactions
- Currency conversion or monthly totals on this page
- Keeping the selected month when moving between Overview and Transactions
- Showing which months have data (Previous month is not limited)
- Keeping the CSV row order for transactions on the same day (needs a new column; a later ticket)

## Dependencies

- User can get banking transactions: CSV import (done)
- Login (done)
- `/transactions` route and nav bar (done)

## Decisions beyond the ticket

These are not in the original ticket:

- The month navigation is extracted into shared code before the page is built, so the Overview and Transactions behave the same
- Dates use the CSV format `DD.MM.YYYY`
- The order of transactions on the same day is left for a later ticket

## Build order

One commit each, with `pnpm test` green after every step:

1. Month helpers (`lib/months.ts`)
2. `useMonthNavigation`
3. `MonthNav`
4. Repository function
5. Service and route
6. API client
7. `TransactionsPage` and the `App.tsx` wiring
