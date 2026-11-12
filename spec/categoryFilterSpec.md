# Title

User can filter transactions by category

## Context

Every transaction has one category (`categorizationSpec.md`), and `GET /api/transactions` returns it. To see where the money goes, the user narrows the list to one category, for example "Groceries". This ticket adds a category dropdown to the Transactions page, as in the example page `spendwise-transactions-page.html` (a select with "All categories" first). It is a single-select now. Multi-select comes later, so the selection is kept as a list of ids.

## Scope

- A dropdown above the table with "All categories" and the 12 categories
- Choosing a category shows only the transactions of that category in the month on screen
- Choosing "All categories" shows everything again
- A message when the filter leaves nothing to show

## From the example page, and what is not taken

Taken: the dropdown with "All categories" as the first and default option.

Not taken (not in the ticket): search box, the All / Income / Expenses tabs, the "Filters" button, "Add transaction", the summary cards, grouping by day. The Category column is not part of this version either (decided in `categorizationSpec.md`). Names come from the category table ("Eating out", not "Restaurants").

## User flow

1. The user opens Transactions. The dropdown shows "All categories" and the table shows the whole month
2. The user picks "Groceries". The table shows only the groceries of that month
3. The user presses Previous month. The filter stays on "Groceries" and the table shows the groceries of the month before
4. The user picks "All categories". The table shows the whole month again

## Frontend changes

- `frontend/src/lib/categories.ts` (new): the 12 category ids in the order of the categories table, with their labels ("Eating out"), and `categoryLabel(id)`
- `frontend/src/api/transactions.ts`: no change (`category` is already read)
- `frontend/src/pages/TransactionsPage.tsx`:
  - a `<select>` with the visible label "Category" and the accessible name "Filter by category". First option "All categories" (value empty), then the 12 categories
  - the selection is a list of ids in the page state (empty list means all). Today it holds at most one
  - the table shows the transactions of the month on screen whose category is in the list. Nothing is requested from the server when the filter changes
  - the filter is not reset by Previous month, Next month or Retry
  - the dropdown is shown whenever the month is shown, and not when the user has no transactions at all
- Backend: no change. The month is returned in full and already has the category

## States

| State | What the user sees |
| --- | --- |
| Loading | As before. The dropdown stays on screen and the choice stays |
| Filter on, some transactions match | Only those rows, in the same order |
| Filter on, none match in this month | "No transactions in Groceries in September 2026." No table. Dropdown and month buttons stay |
| Month empty, no filter | The existing message "No transactions in September 2026." |
| User has no transactions at all | The existing message with the link. No dropdown |
| Error | The existing alert with Retry. The choice is kept |

## Error cases

| Case | Result |
| --- | --- |
| A transaction arrives with a category that is not in the list (rules changed) | It is found under "All categories" only. No crash |
| The user changes the filter while a month is loading | The choice applies to the data that arrives |

## Acceptance criteria

- The Transactions page has a dropdown "Filter by category" that starts on "All categories"
- The dropdown lists "All categories" and the 12 categories with readable labels
- Choosing a category shows only transactions of that category
- Choosing "All categories" shows all transactions of the month again
- After importing `spec/samples/bank-export-sample.csv`, September 2026 with "Groceries" shows the 3 groceries of that month only (REWE and Lidl)
- The filter stays when moving to another month
- A category with no transactions in the month shows "No transactions in <Category> in <Month Year>."
- The dropdown works with the keyboard and has an accessible name
- The Overview, the import and the API are unchanged

## Tests

Frontend only. `lib/categories.test.ts`:

- every id has a label; `categoryLabel("eating-out")` is "Eating out"; an unknown id (`pet-care`) gives "Pet care"

`TransactionsPage.test.tsx` (mock `fetch` by URL, as before):

- the dropdown is named "Filter by category", starts on "All categories", and lists the 12 categories after it
- choosing a category hides the others and keeps the matching rows in the same order
- choosing "All categories" brings all rows back
- a category without transactions in the month shows the empty message with the category and the month, and keeps the dropdown and the month buttons
- the filter stays after Next month and Previous month, and applies to the new month
- the filter stays after an error and Retry
- a transaction with an unknown category appears only under "All categories"
- the dropdown is not shown when the user has no transactions at all
- the existing `/transactions` tests in `App.test.tsx` still pass

## Assumptions

- A month is small enough to filter in the browser (no pagination)
- The filter is a view setting: kept while moving between months, lost when the page is left or reloaded (no URL parameter, no storage)
- The dropdown always lists all 12 categories, also those with no transaction in the month, so its content does not jump between months
- The filter does not change the order, amounts or currencies of the rows

## Out of scope

- Multi-select (later; the state is a list for that reason)
- A Category column or any other place that shows the category
- Search, income/expense tabs, date filters, "Add transaction"
- Totals or a breakdown per category
- Filtering on the server, or a `category` query parameter
- Keeping the filter in the URL or after a reload
- Editing or recategorizing transactions, adding categories

## Dependencies

- `categorizationSpec.md` (done: the API returns `category`)
- Transactions list and month navigation (done)

## Decisions beyond the ticket

- The filter is kept when the month changes (the alternative is to reset it on every month change)
- The dropdown lists all 12 categories (the alternative is only those present in the month)
