# Title

User can filter transactions by several categories

## Context

`categoryFilterSpec.md` added a dropdown with one category at a time. To see where the money goes, the user often wants a group: "Groceries and Eating out", or everything except income. This ticket replaces the dropdown with a checkbox list, so any number of categories can be chosen at once. The page already keeps the selection as a list of ids (the single-select spec prepared this), and the filtering already runs in the browser, so there is no API or backend change.

## Scope

- A "Categories" button that opens a panel with one checkbox per category
- Any number of categories can be checked. The table shows the transactions whose category is checked (OR)
- A "Clear" button unchecks everything
- The button shows what is chosen
- The empty-result message names the chosen categories

## Replaces

The single-select dropdown "Filter by category" and its option "All categories". "All categories" is now the state with nothing checked. The behaviour that stays: the filter works on the loaded month in the browser, it is kept when the month changes, during loading and after an error and Retry, and it is lost when the page is left.

## User flow

1. The user opens Transactions. The button reads "All categories" and the table shows the whole month
2. The user presses the button. A panel opens with 12 checkboxes, none checked
3. The user checks "Groceries". The table shows only the groceries. The button reads "Groceries"
4. The user checks "Eating out" as well. The table shows both, in the original order. The button reads "Groceries, Eating out"
5. The user presses Previous month. The panel stays as it is and the table shows the same two categories for the month before
6. The user unchecks "Groceries". Only eating out remains
7. The user presses "Clear". Nothing is checked and the table shows the whole month again

## Frontend changes

- `frontend/src/components/CategoryFilter.tsx` (new). Props: `selected: string[]` and `onChange(selected: string[])`
  - a button, always visible, with `aria-expanded` and `aria-controls`, which opens and closes the panel
  - the panel is a `<fieldset>` with the legend "Categories" and one checkbox per entry of `CATEGORIES`, in that order, each with its label
  - a "Clear" button in the panel, disabled when nothing is checked
  - Escape closes the panel and puts the focus back on the button. A click outside the panel closes it as well. Choosing a category does not close it
  - checking or unchecking calls `onChange` with the new list, in the order of `CATEGORIES`, not in the order of the clicks
- Button text:

  | Checked | Text |
  | --- | --- |
  | none | All categories |
  | 1 or 2 | their labels, in the order of the list, separated by comma and space: "Groceries, Eating out" |
  | 3 or more | "3 categories" |

- `frontend/src/lib/categories.ts`: a helper `describeCategories(ids: string[]): string` for the empty-result message: "Groceries", "Groceries and Eating out", "Groceries, Eating out and Fees". With more than 3, "the chosen categories"
- `frontend/src/pages/TransactionsPage.tsx`: uses `CategoryFilter` instead of the `<select>`. The state stays `selectedCategories: string[]`. The filtering function does not change. The empty-result message becomes `No transactions in ${describeCategories(selected)} in ${month}.`
- Backend and API: no change

## States

| State | What the user sees |
| --- | --- |
| Nothing checked | All rows. The button reads "All categories" |
| One or more checked, some match | Only matching rows, in the same order |
| Checked, none match in this month | "No transactions in Groceries and Eating out in September 2026." No table. The button, the panel and the month buttons stay |
| Loading | As before. The button and the checked boxes stay |
| Error | The existing alert with Retry. The checked categories are kept |
| User has no transactions at all | The existing message with the link. No filter button |

## Error cases

| Case | Result |
| --- | --- |
| A transaction arrives with a category that is not in the list | Shown only when nothing is checked. It can never be matched by a checkbox. No crash |
| The user checks boxes while a month is loading | The choice applies to the data that arrives |
| Every category is checked | The same as a normal selection. All known categories show. A transaction with an unknown category stays hidden |

## Acceptance criteria

- The Transactions page has a button that opens a "Categories" panel with 12 labelled checkboxes, none checked at the start
- The button reads "All categories" when nothing is checked
- Checking one category shows only that category. Checking more shows the union
- Unchecking the last checked category, or pressing "Clear", shows all transactions again
- After importing `spec/samples/bank-export-sample.csv`, September 2026 with "Groceries" and "Fees" checked shows 4 rows (3 groceries and the account fee)
- The button text follows the table above
- The checked categories stay when moving to another month, during loading and after Retry
- With no match, the message names the chosen categories and the table is gone
- The panel opens and closes with the button, closes on Escape and on a click outside, and keeps the checks when it closes
- Everything works with the keyboard: Tab to the button, Enter or Space to open, Tab through the checkboxes, Space to check, Escape to close
- The Overview, the import and the API are unchanged

## Tests

Frontend only.

`lib/categories.test.ts`: `describeCategories` for one, two, three and four ids, and for an unknown id.

`CategoryFilter.test.tsx` (the component alone):

- the panel is closed at the start, the button has `aria-expanded="false"`, then opens and shows 12 checkboxes with the labels in order
- the button text for none, one, two and three checked
- checking calls `onChange` with the list in the order of `CATEGORIES`
- unchecking removes the id
- "Clear" calls `onChange([])` and is disabled when nothing is checked
- Escape closes the panel and returns the focus to the button
- a click outside closes the panel, a click inside does not

`TransactionsPage.test.tsx`:

- the single-select tests are rewritten for checkboxes: all rows at the start, one category, two categories give the union in the original order, Clear and unchecking bring rows back, no new request on changes
- no match shows the message with the chosen categories and keeps the button and the month buttons
- the selection stays after Previous and Next month, during loading, and after an error and Retry
- a transaction with an unknown category shows only when nothing is checked
- no filter button when the user has no transactions at all
- the existing `/transactions` tests in `App.test.tsx` still pass

## Assumptions

- A month is small enough to filter in the browser
- OR is the right way to combine categories, and the only one needed
- The panel is a simple block under the button, not a floating popup that needs positioning
- The selection is not stored, so it is lost when the page is left (as before)
- No checkboxes are disabled, also not those without transactions in the month

## Out of scope

- Search, income and expense tabs, date filters
- "Select all", and "everything except…" shortcuts (checking the others does that)
- Totals or a breakdown per category
- Counts next to the checkboxes
- Keeping the selection in the URL or after a reload
- Filtering on the server
- Editing or recategorizing transactions

## Dependencies

- `categoryFilterSpec.md` and its code (done)

## Decisions beyond the ticket

- The panel closes on Escape and on a click outside
- The list passed to `onChange` follows the order of the categories, not of the clicks
- The text in the button and in the empty message is shortened when many categories are checked
- The "All categories" option disappears: nothing checked means all
