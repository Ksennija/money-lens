# Title

User can see a transactions overview of income, spent and saved for a month

## Context

After importing bank transactions (`csvImportSpec.md`), the user needs the whole financial picture before looking at detailed spending. A month's overview shows how much came in, how much went out and how much was left, and whether that is better or worse than the month before. This is the first screen of Money Lens' core promise: showing why someone who earns enough does not save. It builds on the comparison endpoint (`monthComparisonSpec.md`) and is shown to logged-in users only.

## Scope

- A table for one month with three rows: Income, Spent, Saved
- Each row shows the amount and its change vs the previous month
- The page opens on the latest month that has transactions. The user can move to the previous and next month
- Loading, error and empty states
- A small backend change: `GET /api/comparison` without `month` defaults to the user's latest transaction month (today it defaults to the current month)

## Definitions

- **Income**: sum of positive transactions in the month
- **Spent**: sum of negative transactions in the month, shown as a positive number
- **Saved**: Income - Spent. Negative when more was spent than came in
- Amounts of other currencies are converted to one currency by the comparison endpoint and shown in that currency
- Transfers to savings accounts are not recognised (see Out of scope). They count as Spent

## Behaviour

Example for September (previous month August):

|        | September | vs August |
| ------ | --------- | --------- |
| Income | €3,200.00 | ↑ €100.00 |
| Spent  | €2,960.00 | ↑ €370.00 |
| Saved  | €240.00   | ↓ €270.00 |

- The table heading names the month and currency, e.g. "September 2026 · EUR"
- **Amounts** are shown with cents so that Income - Spent = Saved adds up exactly as displayed
- **Change**: an arrow, the absolute difference, and "vs <previous month name>". ↑ when the value rose, ↓ when it fell. A difference of zero reads "no change vs August"
- The meaning is carried by arrow and text, not by colour alone. Colour may support it (a rise in Spent and a fall in Income or Saved are unfavourable)
- A negative Saved is shown with a minus sign, e.g. "-€120.00"
- When the previous month has no transactions, the change column reads "no transactions in August" instead of a difference
- Month navigation: "Previous month" and "Next month" buttons. "Next month" is disabled on the latest month with transactions (the month the page opened on). "Previous month" is not limited, so the user can reach months without transactions, which show zeros
- Amounts and changes come from `GET /api/comparison?month=YYYY-MM` (`current`, `change` fields). Money is formatted for display only. No money arithmetic in the browser except what the API already provides
- The page is part of the authenticated area. A logged-out user sees the login page, not the overview

## States

| State                                                | What the user sees                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Loading                                              | A status message "Loading…"                                                          |
| User has no transactions at all                      | "No transactions yet" and a pointer to the import page. No table                     |
| Month with no transactions but others exist          | The table with zeros and the "no transactions in <previous month>" rule above        |
| Exchange rates unavailable (502 `rates-unavailable`) | An error message saying rates are unavailable and a retry button. No partial numbers |
| Any other error                                      | A generic error message and a retry button                                           |

## Backend change

`GET /api/comparison` without `month` returns the month of the user's most recent transaction. If the user has no transactions it falls back to the current month. An explicit `month` behaves as before. Needs a repository query for the latest transaction date. The comparison spec's default for `month` is updated to match.

## Acceptance criteria

- A logged-in user with imported transactions sees a table with total income, spent and saved for the latest month that has transactions
- Each of the three values shows its change vs the previous month, with direction, amount and the previous month's name
- Saved always equals Income - Spent as displayed
- The example (Income 3,200, Spent 2,960, Saved 240, down 270 vs August) renders exactly as in the Behaviour table, for the Saved row
- A month with a zero change shows "no change", and a previous month without transactions shows "no transactions in <month>"
- The user can move to the previous and next month and the table updates. "Next month" is disabled on the latest month with transactions
- With no transactions the user sees an empty state pointing to the import, not a table of zeros
- When rates are unavailable the user sees an error, never totals that leave out transactions
- A logged-out user cannot see the overview

## Out of scope

- Transfers to savings accounts (recognising them, or counting them as saved). They are treated as spent
- Detailed spending report and per-category breakdown (the next step after this overview)
- Charts and comparisons other than the previous calendar month
- Choosing the currency or a stored home currency setting
- Percentage changes in the UI (the API already returns them)
- Editing, filtering or listing individual transactions

## Dependencies

- User can get banking transactions: CSV import (done)
- Month comparison endpoint (done) and currency conversion (done)
- Login (done)

## Decisions beyond the ticket

These are not in the original ticket. The team kept all three:

- The page opens on the latest month with transactions, not the current month, because imported files are usually for past months
- Previous and next month buttons are included
- Amounts are shown with cents

## Open questions

- The comparison endpoint does not say which months have data, so "Previous month" cannot stop at the user's first transaction month. If empty months become a problem, add the month bounds to the API (a dedicated overview endpoint is the alternative considered)
- Refunds are positive and count as income, which inflates Income and Saved (known from the comparison spec)
- Spent includes transfers to savings until the follow-up ticket, so a user who moves money to savings looks like they saved less
- The home currency is still guessed from the most common currency (see the comparison spec) and can flip between months
