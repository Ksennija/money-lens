# Test Case 1: Latest month opens first, newest transaction on top

**Preconditions:**

- A registered user is logged in
- The user imported `spec/samples/bank-export-sample.csv`

**Test Data:**

- Sample file: 18 transactions in August 2026 and 18 in September 2026

**Steps:**

1. Click "Transactions" in the nav bar

**Expected Result:**

- A "Loading…" status shows first, then the table
- The page shows September 2026 with 18 rows
- The first row is 30.09.2026, Bank, Account fee, -€4.90
- "Next month" is disabled

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: Previous month shows August

**Preconditions:**

- Same as Test Case 1
- The Transactions page shows September 2026

**Test Data:**

- None

**Steps:**

1. Click "Previous month"

**Expected Result:**

- The page shows August 2026 with 18 rows
- The first row is 29.08.2026, Pharmacy Apotheke, Card payment, -€14.25
- "Next month" is enabled

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 3: Next month returns to the latest month

**Preconditions:**

- Same as Test Case 1
- The page shows August 2026 (after Test Case 2)

**Test Data:**

- None

**Steps:**

1. Click "Next month"

**Expected Result:**

- The page shows September 2026 again with 18 rows
- "Next month" is disabled again

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 4: Columns, date format and sort order

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Open the Transactions page
2. Read the column headings and the date of every row

**Expected Result:**

- The columns are Date, Counterparty, Details and Amount, in this order
- Dates look like `DD.MM.YYYY` (e.g. `30.09.2026`), as in the CSV
- Dates never increase going down the table (newest first)
- The order of rows with the same date is not checked

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 5: Amounts show sign and original currency

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Income row: 01.09.2026, Acme GmbH, Salary September, 3200,00 EUR
- Spending row: 02.09.2026, REWE Markt, Card payment groceries, -72,18 EUR

**Steps:**

1. Open the Transactions page on September 2026
2. Find the two rows

**Expected Result:**

- Salary shows as `€3,200.00` (no minus sign)
- REWE shows as `-€72.18`
- The amounts are not converted

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 6: Transactions in a foreign currency keep their currency

**Preconditions:**

- A registered user is logged in
- The user has one transaction of -10,00 USD and one of -10,00 EUR in the same month

**Test Data:**

- One USD row and one EUR row

**Steps:**

1. Open the Transactions page on that month

**Expected Result:**

- The USD row shows as `-$10.00` and the EUR row as `-€10.00`
- No exchange-rate request is made and no rates error appears

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 7: User without transactions sees a pointer to the import

**Preconditions:**

- A registered user is logged in
- The user has no transactions

**Test Data:**

- None

**Steps:**

1. Open the Transactions page

**Expected Result:**

- The page shows "No transactions yet. Import a CSV file on the Overview page."
- The message contains a link to `/overview`
- No table and no month buttons are shown

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 8: Earlier month without transactions shows the empty-month message

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Open the Transactions page
2. Click "Previous month" until July 2026 shows

**Expected Result:**

- The page shows "No transactions in July 2026."
- The month buttons are still shown, and "Next month" is enabled
- The "No transactions yet" message is not shown

**Priority:** Medium
**Type:** Edge case / Functional

---

# Test Case 9: Moving back across a year boundary

**Preconditions:**

- A registered user is logged in
- The user has transactions in January 2027 and December 2026

**Test Data:**

- One transaction in each month

**Steps:**

1. Open the Transactions page (opens on January 2027)
2. Click "Previous month"
3. Click "Next month"

**Expected Result:**

- Step 2 shows December 2026 with its transaction
- Step 3 shows January 2027 again and "Next month" is disabled

**Priority:** Medium
**Type:** Edge case / Functional

---

# Test Case 10: Loading state

**Preconditions:**

- Same as Test Case 1
- The server answers slowly (e.g. delayed in browser dev tools)

**Test Data:**

- None

**Steps:**

1. Open the Transactions page, or click "Previous month"

**Expected Result:**

- "Loading…" shows while waiting
- On a month change the previous month's table stays on screen until the new one arrives
- The month buttons are disabled while loading

**Priority:** Medium
**Type:** Functional

---

# Test Case 11: Failed request shows an error and Retry works

**Preconditions:**

- Same as Test Case 1
- The `/api/transactions` request fails (e.g. the server stops, or the request is blocked)

**Test Data:**

- None

**Steps:**

1. Open the Transactions page
2. Restore the server
3. Click "Retry"

**Expected Result:**

- Step 1 shows an error message (as an alert) and a Retry button, and no table
- Step 3 shows the table for the latest month

**Priority:** High
**Type:** Negative / Functional

---

# Test Case 12: Failure while moving to another month shows the error and Retry

**Preconditions:**

- Same as Test Case 1
- The page shows September 2026

**Test Data:**

- None

**Steps:**

1. Make the next `/api/transactions` request fail
2. Click "Previous month"
3. Restore the server and click "Retry"

**Expected Result:**

- Step 2 replaces the table with an error message (as an alert) and a Retry button, as on the Overview
- Step 3 asks for August 2026 again and shows its table

**Priority:** Medium
**Type:** Negative / Functional

---

# Test Case 13: Text from the CSV is shown as text

**Preconditions:**

- A registered user is logged in
- The user has a transaction whose counterparty is `<b>Evil</b>` and details are `<img src=x onerror=alert(1)>`

**Test Data:**

- Counterparty: `<b>Evil</b>`
- Details: `<img src=x onerror=alert(1)>`

**Steps:**

1. Open the Transactions page on that month

**Expected Result:**

- The row shows the text exactly as typed, with the angle brackets
- No bold text, no image and no alert dialog appear

**Priority:** High
**Type:** Security

---

# Test Case 14: Signed-out user cannot open the page

**Preconditions:**

- User is logged out

**Test Data:**

- None

**Steps:**

1. Open `/transactions` directly in the browser

**Expected Result:**

- The user is redirected to the sign in page
- No transactions are shown

**Priority:** High
**Type:** Negative / Security

---

# Test Case 15: A user sees only their own transactions

**Preconditions:**

- User A imported the sample file
- User B is registered, has one transaction of their own, and is logged in

**Test Data:**

- User B's transaction: 05.09.2026, Shop B, Test, -1,00 EUR

**Steps:**

1. As user B, open the Transactions page

**Expected Result:**

- Only user B's one transaction is shown
- None of user A's transactions appear

**Priority:** High
**Type:** Security

---

# Test Case 16: The Overview still works

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Open the Overview page
2. Use Previous month and Next month

**Expected Result:**

- The Overview shows September 2026 with Income, Spent and Saved as before
- The month buttons behave as before ("Next month" disabled on the latest month)
- Nothing changed visibly after the month navigation was moved into shared code

**Priority:** High
**Type:** Regression

---

# Test Case 17: API rejects a request without a session

**Preconditions:**

- No session cookie

**Test Data:**

- `GET /api/transactions`

**Steps:**

1. Send the request

**Expected Result:**

- Status 401
- Body `{ "code": "unauthenticated", "message": "Not logged in" }`

**Priority:** High
**Type:** Negative / API

---

# Test Case 18: API rejects an invalid month

**Preconditions:**

- A user is logged in

**Test Data:**

- `?month=abc`, `?month=2026-13`, `?month=2026-8`, `?month=2026-08&month=2026-09`

**Steps:**

1. Send `GET /api/transactions` with each query

**Expected Result:**

- Status 400 for each
- Body code `invalid-month` with the message "Month must look like 2026-08"

**Priority:** High
**Type:** Negative / API

---

# Test Case 19: API returns the month's transactions with all fields, newest first

**Preconditions:**

- A user is logged in
- The user has transactions on 2026-07-31, 2026-08-01, 2026-08-15, 2026-08-31 and 2026-09-01

**Test Data:**

- `GET /api/transactions?month=2026-08`

**Steps:**

1. Send the request

**Expected Result:**

- Status 200, `code` is `transactions`, `month` is `2026-08`
- Only the three August transactions are returned: 2026-08-31, 2026-08-15, 2026-08-01, in that order (first and last day included, the days before and after excluded)
- Each item has `id`, `date` (`YYYY-MM-DD`), `counterparty`, `details`, `amountCents` and `currency`
- Amounts are the stored ones, in their original currency

**Priority:** High
**Type:** Positive / API

---

# Test Case 20: API without a month uses the latest transaction's month

**Preconditions:**

- A user is logged in
- The user's latest transaction is on 2026-08-20, and an earlier one is in 2026-07

**Test Data:**

- `GET /api/transactions` (no month)

**Steps:**

1. Send the request

**Expected Result:**

- `month` is `2026-08` and only August transactions are returned

**Priority:** High
**Type:** Positive / API

---

# Test Case 21: API without a month and without transactions

**Preconditions:**

- A user is logged in and has no transactions

**Test Data:**

- `GET /api/transactions`

**Steps:**

1. Send the request

**Expected Result:**

- Status 200
- `month` is the current month and `transactions` is an empty list

**Priority:** Medium
**Type:** Edge case / API

---

# Test Case 22: API with an explicit month ignores newer data

**Preconditions:**

- A user is logged in
- The user has transactions in 2026-07 and 2026-09

**Test Data:**

- `GET /api/transactions?month=2026-07`

**Steps:**

1. Send the request

**Expected Result:**

- `month` is `2026-07` and only the July transactions are returned

**Priority:** Medium
**Type:** Positive / API

---

# Test Case 23: API never returns another user's transactions

**Preconditions:**

- User A and user B each have transactions in 2026-08
- User A is logged in

**Test Data:**

- `GET /api/transactions?month=2026-08`

**Steps:**

1. Send the request as user A

**Expected Result:**

- Only user A's transactions are returned

**Priority:** High
**Type:** Security / API

---

# Test Case 24: API reports a server error

**Preconditions:**

- A user is logged in
- The database call fails (simulated)

**Test Data:**

- `GET /api/transactions`

**Steps:**

1. Send the request

**Expected Result:**

- Status 500
- Body `{ "code": "server-error", "message": "Something went wrong" }`
- The error is logged on the server and its details are not sent to the client

**Priority:** Medium
**Type:** Negative / API
