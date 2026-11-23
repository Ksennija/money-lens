# Title

User can see how their spending and income changed compared to the previous month

## Context

This is the core promise of SpendWise: showing people who earn enough why they don't save. Imported transactions (see `csvImportSpec.md`) can be in different currencies, so every amount is converted to one currency with the cached daily rates from `currencyConversionSpec.md` before it is summed. All data is scoped to the logged-in user.

This ticket covers the backend endpoint only.

## Scope

- One endpoint that returns totals for a month, totals for the month before it, and the change between them
- Totals are spending, income and net, in a single currency
- Foreign-currency transactions are converted at the rate of their own day

## Behaviour: `GET /api/comparison`

Requires a logged-in user.

| Query parameter | Meaning                                          | Default                                                                                            |
| --------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `month`         | `YYYY-MM`, the month to report                   | The month of the user's most recent transaction, or the current month (UTC) when the user has none |
| `currency`      | Three-letter code to report in, case-insensitive | The most common currency among the user's transactions in the two months, else `EUR`               |

| Case                                                                                                                                        | Status | `code`              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| Not logged in                                                                                                                               | 401    | `unauthenticated`   |
| `month` is not `YYYY-MM` with a real month                                                                                                  | 400    | `invalid-month`     |
| `currency` is not three letters, or the rate service does not support a currency involved                                                   | 400    | `invalid-currency`  |
| Exchange rates could not be obtained, and no older stored rate can stand in for the missing day (see `currencyConversionSpec.md`, Fallback) | 502    | `rates-unavailable` |
| Success, including months with no transactions                                                                                              | 200    | `comparison`        |
| Unexpected failure                                                                                                                          | 500    | `server-error`      |

Success body:

```json
{
  "code": "comparison",
  "month": "2026-08",
  "previousMonth": "2026-07",
  "currency": "EUR",
  "current": { "spendingCents": 4600, "incomeCents": 30300, "netCents": 25700 },
  "previous": {
    "spendingCents": 2000,
    "incomeCents": 30000,
    "netCents": 28000
  },
  "change": {
    "spendingCents": 2600,
    "incomeCents": 300,
    "netCents": -2300,
    "spendingPercent": 130,
    "incomePercent": 1
  },
  "ratesApproximate": false
}
```

`ratesApproximate` is `true` when at least one day used an older stored rate because the rate API had none. The page then shows "Some amounts use an older exchange rate because current rates are unavailable." Otherwise it is `false`.

## Calculation

- **Month:** a transaction belongs to the month of its booking date. The first and last day of the month are included. The previous month is the calendar month before it, also across a year boundary
- **Refund:** a positive amount whose category is not `income` (see `categorizationSpec.md`). That covers a deposit with a refund word and a refund from a merchant that has a rule, such as an Amazon refund
- **Spending:** the sum of money out minus the refunds, reported as a positive number. It is negative when refunds are higher than the purchases of the month
- **Income:** the sum of the other money in. Reimbursements and salary count as income, refunds do not
- **Net:** income minus spending, negative when spending is higher
- **Change:** current minus previous, in cents, for spending, income and net
- **Percent:** `(current - previous) / previous * 100`, rounded to one decimal, for spending and income. `null` when the previous month's value is 0
- **Conversion:** each transaction is converted on its own with the rate of its booking day and rounded to whole cents (half away from zero), then the results are summed. A month's totals therefore do not change when rates move later, except for a day that used an older rate (`ratesApproximate` is `true`): its real rate replaces the older one on the next successful call. Transactions already in the reporting currency are not converted
- **Money:** all amounts are integer cents. Only percentages are decimal

## Data

Reads the user's transactions and the `ExchangeRate` cache. Writes nothing except newly fetched past rates, which the currency service caches. Today's rate is fetched on each request and not stored.

## Acceptance criteria

- With transactions in two months, the response contains the exact spending, income and net of each month and the change between them
- Transactions on the first and last day of the month are included. Transactions the day before the previous month or the day after the month are not
- A foreign-currency transaction is converted with the rate of its own day. Two transactions on different days use different rates
- Without `currency`, the most common currency is used. With `currency=zxb` (any case), that currency is used
- A month with no transactions returns zeros, and the percentages are `null`
- Another user's transactions never appear in the totals
- A malformed month or currency is rejected with 400 and its code
- Not logged in returns 401
- With the rate API down and yesterday's rate stored, a foreign-currency transaction dated today is converted at yesterday's rate and `ratesApproximate` is `true`
- When every rate is exact, or every transaction is in the reporting currency, `ratesApproximate` is `false`
- If any rate is unavailable the request fails with 502. Totals that leave out some transactions are never returned

## Out of scope

- A frontend page or charts
- Per-category breakdown. Categorization does not exist yet
- Comparing against any period other than the previous calendar month (year over year, custom ranges)
- A stored user setting for the home currency
- Matching a refund to the purchase it gives back. A refund reduces the spending of the month it is booked in
- Listing the transactions behind a total

## Dependencies

- CSV import (done) and currency conversion (done)
- Login (done)

## Open questions

- The home currency is guessed from the data. It can flip if a user's most common currency changes between months, which changes every total. A stored user setting would fix this
- A transaction in a currency the rate service does not support makes the whole comparison fail with `invalid-currency`. Should such transactions be left out and listed in the response instead?
- A foreign-currency transaction dated today causes one rate API request on every call, because today's rate is not cached
- Refunds are found by words and merchant rules, so a refund without a refund word and from an unknown merchant still counts as income and inflates it
- Spending is negative when the refunds of a month are higher than its purchases. Should it be shown as 0 instead?
- Should the current month, which is still in progress, be compared with the full previous month or with the same days of it? Today it is the full month, so a half-finished month looks like a big drop
