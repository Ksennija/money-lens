# Title

Transactions are categorized automatically

## Context

Money Lens exists to show someone who earns enough why they do not save. For that, the user has to see where the money goes, not only how much. Today every imported transaction is just a counterparty, a text and an amount (`transactionsListSpec.md`). This ticket puts every transaction into one spending category by keyword rules, and shows the category in the transactions list. `CLAUDE.md` asks for this to be done consistently: every transaction gets a category, and what matches no rule goes to "other". The category filter is the next ticket and builds on this one.

## Scope

- A fixed list of categories and an ordered list of keyword rules, kept in the backend
- A pure function that returns exactly one category for any transaction
- `GET /api/transactions` returns a `category` for every transaction
- The Transactions table gets a Category column
- Unmatched transactions get the category "other", except unknown deposits (a positive amount that matches no rule), which get "income"
- The categories are computed on read, not stored
- Matching is by whole words, in lower case (case and accents ignored)

## Categories

| Id              | Shown as      | What goes in                                  |
| --------------- | ------------- | --------------------------------------------- |
| `income`        | Income        | Salary and money received (e.g. reimbursement) |
| `housing`       | Housing       | Rent                                          |
| `utilities`     | Utilities     | Electricity and similar bills                 |
| `groceries`     | Groceries     | Supermarkets                                  |
| `eating-out`    | Eating out    | Cafés and restaurants                         |
| `subscriptions` | Subscriptions | Streaming and similar                         |
| `health`        | Health        | Gym and pharmacy                              |
| `transport`     | Transport     | Trains and fuel                               |
| `shopping`      | Shopping      | Online and clothing shops                     |
| `entertainment` | Entertainment | Cinema and events                             |
| `fees`          | Fees          | Bank fees                                     |
| `other`         | Other         | Everything that matches no rule               |

## Rules

A rule is a list of keywords and a category, in the shape of the ticket's example:

```ts
const rules = [
  { keywords: ["REWE", "EDEKA", "LIDL"], category: "groceries" },
  { keywords: ["NETFLIX", "SPOTIFY"], category: "subscriptions" },
];
```

The initial rule list (it can grow later, one line per merchant):

```ts
const rules = [
  { keywords: ["ACME", "SALARY", "REIMBURSEMENT"], category: "income" },
  { keywords: ["SUNRISE ESTATES", "RENT"], category: "housing" },
  { keywords: ["STADTWERKE", "ELECTRICITY"], category: "utilities" },
  { keywords: ["REWE", "EDEKA", "LIDL", "GROCERIES"], category: "groceries" },
  { keywords: ["CAFE", "TRATTORIA", "RESTAURANT", "COFFEE"], category: "eating-out" },
  { keywords: ["NETFLIX", "SPOTIFY"], category: "subscriptions" },
  { keywords: ["FITLIFE", "GYM", "APOTHEKE", "PHARMACY"], category: "health" },
  { keywords: ["DEUTSCHE BAHN", "TRAIN", "SHELL", "FUEL"], category: "transport" },
  { keywords: ["AMAZON", "ZARA", "CLOTHING"], category: "shopping" },
  { keywords: ["CINEMAXX", "CINEMA"], category: "entertainment" },
  { keywords: ["ACCOUNT FEE"], category: "fees" },
];
```

## Matching

- The text that is searched is the counterparty and the details together
- Matching ignores case and accents: "Café Luna" matches `CAFE`
- A keyword matches whole words only, so `RENT` matches "Rent August" but not "Current account", and `SHELL` does not match "Shelley"
- A keyword of several words (`DEUTSCHE BAHN`, `ACCOUNT FEE`) matches those words next to each other
- Punctuation and extra spaces are ignored, so "Netflix.com" matches `NETFLIX`
- The first rule (top to bottom) with a matching keyword decides. The order of the list is part of the behaviour
- A transaction that matches no rule is "other", unless its amount is positive: an unknown deposit is "income"
- The amount and its sign are used only for that last step, never to override a rule. A refund that matches a shop stays in that shop's category (the Amazon refund of +18.99 is "shopping"), as agreed for the overview
- A negative or zero amount that matches no rule is "other" (Anna Weber, -25.00)
- Every transaction gets exactly one category, never none

## Behaviour

- Categories are worked out when the transactions are read, not stored. Changing a rule changes the category of all transactions, including already imported ones
- The category is shown in a new last column "Category" of the Transactions table, using the "Shown as" name above, e.g. "Eating out"
- The import, the comparison and the Overview are not changed

## Backend change

- `backend/src/domain/categorization/rules.ts` (new): the category ids and the rule list
- `backend/src/domain/categorization/categorize.ts` (new): `categorize({ counterparty, details, amountCents })` returns a category id. Pure, no database
- `backend/src/services/transactionsService.ts`: adds `category` to every transaction
- `GET /api/transactions` response gets one more field per transaction:

  ```json
  { "id": "…", "date": "2026-09-30", "counterparty": "Bank", "details": "Account fee",
    "amountCents": -490, "currency": "EUR", "category": "fees" }
  ```

- Data changes: none. No schema change and no migration

## Frontend changes

- `frontend/src/api/transactions.ts`: `Transaction` gets `category: string`. A response whose transaction has no text `category` is treated as a malformed body (generic error), like the other fields
- `frontend/src/pages/TransactionsPage.tsx`: a "Category" column. The label is made from the id ("eating-out" shown as "Eating out")

## Error cases

| Case                                                | Result                                                     |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Counterparty or details are empty or only symbols   | "other" for a negative or zero amount, "income" for a positive one, no error |
| Very long text (the import allows long descriptions) | Categorized as normal. Matching has no timing problem for a few dozen rules |
| Unknown category id arrives in the browser          | Shown as the id made readable, no crash                    |

## Acceptance criteria

- Every transaction in the list shows a category
- After importing `spec/samples/bank-export-sample.csv`, the 36 transactions are categorized as in the table below
- A transaction that matches no rule shows "Other"
- A positive amount that matches no rule shows "Income"
- Matching ignores case and accents and uses whole words only
- When two rules would match, the one higher in the list wins
- The categories of the same transaction never change between requests
- A signed-out request still gets 401 and the existing behaviour of the list is unchanged

### The sample file

| Category      | Transactions                                                | Count |
| ------------- | ----------------------------------------------------------- | ----- |
| Income        | Acme salary (Aug, Sep), expense reimbursement               | 3     |
| Housing       | Sunrise Estates rent (Aug, Sep)                             | 2     |
| Utilities     | Stadtwerke electricity (Aug, Sep)                           | 2     |
| Groceries     | REWE ×4, Lidl ×2                                            | 6     |
| Eating out    | Café Luna ×4, Trattoria Roma ×2                             | 6     |
| Subscriptions | Netflix ×2, Spotify ×2                                      | 4     |
| Health        | FitLife gym ×2, Pharmacy Apotheke                           | 3     |
| Transport     | Deutsche Bahn ×2, Shell fuel ×2                             | 4     |
| Shopping      | Amazon ×2 (order and refund), Zara                          | 3     |
| Entertainment | Cinemaxx                                                    | 1     |
| Fees          | Bank account fee                                            | 1     |
| Other         | Anna Weber "Transfer dinner split"                          | 1     |

## Tests

Backend, unit (`categorize.test.ts`, no database):

- each of the 36 sample transactions gets its category from the table above
- the counts per category match the table, and no transaction is left without a category
- ignores case (`netflix`, `NETFLIX`) and accents (`Café`)
- whole words only: `RENT` does not match "Current account", `SHELL` does not match "Shelley"
- a multi-word keyword matches only when the words are next to each other
- punctuation does not hide a match ("Netflix.com", "REWE-Markt")
- the first matching rule wins when two rules match
- a positive amount that matches a shop stays in the shop's category
- a positive amount that matches no rule is "income"; a negative or zero one is "other"
- empty or symbol-only text gives "other" (negative amount) or "income" (positive amount)
- rule list check: every rule uses an existing category id, uppercase keywords, and no keyword is empty

Backend, API (`transactions.test.ts`): each transaction in the response has a `category`, and the categories in a month match the rules.

Frontend:

- `api/transactions.test.ts`: `category` is returned, and a transaction without it is a generic error
- `TransactionsPage.test.tsx`: a Category column with readable labels ("Eating out", "Other")
- `App.test.tsx`: the existing `/transactions` test still passes

## Assumptions

- The rules are in code, not in the database and not editable by the user
- Matching on counterparty plus details is enough for the sample data and for common merchants. Real bank texts will need more keywords over time
- The initial list is built from the sample file plus the examples of the ticket. It is not a complete list of German merchants
- Categories are in English, as the rest of the app
- A month holds at most a few thousand transactions, so categorizing on every read costs nothing noticeable

## Out of scope

- Adding, editing or deleting categories or rules
- Recategorizing a single transaction
- Rules defined by the user
- The category filter and the category dropdown (the next ticket)
- Totals or a breakdown per category
- Rules that use the amount or the currency (the sign is used only for unknown deposits)
- Fuzzy matching, typo tolerance, machine learning or other automatic learning
- Storing the category in the database

## Dependencies

- Transactions list and `GET /api/transactions` (done)
- CSV import (done)

## Decisions beyond the ticket

- The category column is part of this ticket, so the result is visible before the filter exists
- The category id for unmatched transactions is "other" (`CLAUDE.md` is fixed to match)
