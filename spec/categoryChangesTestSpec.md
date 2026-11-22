# Test Case 1: The Insights page lists the categories that changed

**Preconditions:**

- A registered user is logged in
- The user imported `spec/samples/bank-export-sample.csv`

**Test Data:**

- Sample file: 18 transactions in August 2026 and 18 in September 2026
- The latest transaction is on 30.09.2026, so the page compares 1-30 September with 1-30 August

**Steps:**

1. Click "Insights" in the nav bar

**Expected Result:**

- The headline "🔎 8 things changed this month" is shown above a table with the columns Category and Change
- The rows are, in this order:

| Category      | Change |
| ------------- | ------ |
| Shopping      | ↑ €60  |
| Groceries     | ↑ €30  |
| Other         | ↓ €25  |
| Entertainment | ↑ €24  |
| Health        | ↓ €14  |
| Eating out    | ↑ €12  |
| Fees          | ↑ €5   |
| Transport     | ↑ €3   |

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: Categories that did not change are not shown

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Housing (€1,100.00 in both periods), Utilities (€62.00 in both) and Subscriptions (€23.98 in both)

**Steps:**

1. Open "Insights" and look at the table

**Expected Result:**

- Housing, Utilities and Subscriptions have no row
- Income is not shown as a category

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 3: Rows are ranked by the size of the change, ups and downs together

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Absolute changes: Shopping 59.95, Groceries 29.68, Other 25.00, Entertainment 24.00, Health 14.25, Eating out 12.20, Fees 4.90, Transport 2.70

**Steps:**

1. Open "Insights" and read the rows from top to bottom

**Expected Result:**

- The order follows the absolute change, largest first
- The decreases (Other, Health) sit between the increases, not in a separate block

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 4: A category with no spending last month shows as an increase

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Entertainment: €0.00 in August, €24.00 in September
- Fees: €0.00 in August, €4.90 in September

**Steps:**

1. Open "Insights"

**Expected Result:**

- "Entertainment" shows "↑ €24"
- "Fees" shows "↑ €5"
- No percentage is shown anywhere

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 5: A category with no spending this month shows as a decrease

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Other: €25.00 in August (the dinner split), €0.00 in September

**Steps:**

1. Open "Insights"

**Expected Result:**

- "Other" shows "↓ €25", the full amount of last month's spending

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 6: A refund reduces the spending of its category

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Shopping in August: Amazon order -€48.99 and Amazon refund +€18.99, net spending €30.00
- Shopping in September: Zara -€89.95

**Steps:**

1. Open "Insights"

**Expected Result:**

- "Shopping" shows "↑ €60" (89.95 minus 30.00 is 59.95), not "↑ €41"

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 7: Amounts are shown in whole euros, rounded half up

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Transport: change of €2.70
- Health: change of €14.25
- Groceries: change of €29.68

**Steps:**

1. Open "Insights"

**Expected Result:**

- Transport shows "↑ €3", Health shows "↓ €14", Groceries shows "↑ €30"
- No amount has decimals or cents

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 8: A change under €1 is not shown

**Preconditions:**

- A registered user is logged in
- The user imported a CSV where Groceries is €50.00 on 02.08.2026 and €50.80 on 02.09.2026, and Transport is €40.00 on 03.08.2026 and €60.00 on 03.09.2026

**Test Data:**

- Groceries change: €0.80
- Transport change: €20.00

**Steps:**

1. Open "Insights"

**Expected Result:**

- Only "Transport ↑ €20" is shown, the headline says "1 thing changed this month"
- Groceries has no row

**Priority:** High
**Type:** Edge case

---

# Test Case 9: The €1 limit uses the exact change, not the rounded one

**Preconditions:**

- A registered user is logged in
- The user imported a CSV with three categories in September and none in August: Fees €0.99, Health €1.00, Groceries €1.49

**Test Data:**

- Changes: Fees 0.99, Health 1.00, Groceries 1.49

**Steps:**

1. Open "Insights"

**Expected Result:**

- Fees has no row (0.99 is under €1, even though it would display as "€1")
- Health shows "↑ €1"
- Groceries shows "↑ €1" (1.49 rounds down)
- The headline says "2 things changed this month"

**Priority:** High
**Type:** Edge case

---

# Test Case 10: The headline uses the singular for one row

**Preconditions:**

- Same as Test Case 8

**Test Data:**

- None

**Steps:**

1. Open "Insights"

**Expected Result:**

- The headline reads "🔎 1 thing changed this month", not "1 things"

**Priority:** Medium
**Type:** Edge case

---

# Test Case 11: The headline count equals the number of rows

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Open "Insights"
2. Count the table rows

**Expected Result:**

- The table has 8 rows and the headline says 8

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 12: Only the days that have passed are compared

**Preconditions:**

- A registered user is logged in
- The user imported a CSV with these Groceries transactions: €100.00 on 05.08.2026, €100.00 on 25.08.2026, €150.00 on 05.09.2026. The latest transaction overall is on 10.09.2026

**Test Data:**

- Window: 1-10 September against 1-10 August

**Steps:**

1. Open "Insights"

**Expected Result:**

- "Groceries" shows "↑ €50" (150 minus 100)
- The €100.00 of 25.08.2026 is not counted

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 13: The last day of a longer month is cut to the shorter month before it

**Preconditions:**

- A registered user is logged in
- The user imported a CSV with Groceries: €80.00 on 28.02.2027, €999.00 on 01.03.2027 (not in the February window), and €120.00 on 31.03.2027. The latest transaction overall is on 31.03.2027

**Test Data:**

- Window: 1-31 March against 1-28 February

**Steps:**

1. Open "Insights"

**Expected Result:**

- The page compares March with February 1-28 and does not fail
- "Groceries" shows "↑ €40" (120 minus 80)

**Priority:** Medium
**Type:** Edge case

---

# Test Case 14: A first import has no last month, so everything is an increase

**Preconditions:**

- A registered user is logged in
- The user imported only the September 2026 rows of the sample file

**Test Data:**

- Sample file: only the 18 September rows

**Steps:**

1. Open "Insights"

**Expected Result:**

- Every category with spending in September is shown as "↑ €X" with its September total
- Housing shows an increase of 1100 euros (the digit grouping of large amounts is not defined by the ticket)
- No error is shown

**Priority:** Medium
**Type:** Edge case

---

# Test Case 15: No transactions at all

**Preconditions:**

- A registered user is logged in
- The user has no transactions

**Test Data:**

- None

**Steps:**

1. Click "Insights" in the nav bar

**Expected Result:**

- The text "No transactions yet this month." is shown
- There is no headline and no table

**Priority:** High
**Type:** Edge case

---

# Test Case 16: Nothing changed by €1 or more

**Preconditions:**

- A registered user is logged in
- The user imported a CSV where every category has the same spending in both periods, or differs by less than €1

**Test Data:**

- Groceries €50.00 on 02.08.2026 and €50.40 on 02.09.2026

**Steps:**

1. Open "Insights"

**Expected Result:**

- The text "No spending changes compared to the same days last month." is shown
- There is no headline and no table

**Priority:** High
**Type:** Edge case

---

# Test Case 17: Income and refunds without a category do not appear as spending

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Salary €3,200.00 in both months, expense reimbursement €120.00 in September (category Income)

**Steps:**

1. Open "Insights"

**Expected Result:**

- There is no "Income" row, and the €120.00 does not reduce any category

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 18: Amounts in other currencies are converted before they are compared

**Preconditions:**

- A registered user is logged in
- The user imported a CSV with Groceries of 100.00 EUR on 02.08.2026 and 120.00 USD on 02.09.2026
- The rate for 02.09.2026 is 1 USD = 0.90 EUR

**Test Data:**

- September Groceries: 108.00 EUR after conversion

**Steps:**

1. Open "Insights"

**Expected Result:**

- "Groceries" shows "↑ €8"
- All amounts are in one currency

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 19: The page shows Loading while the answer is on its way

**Preconditions:**

- Same as Test Case 1
- The response is delayed

**Test Data:**

- None

**Steps:**

1. Click "Insights" and look at the page before the answer arrives

**Expected Result:**

- "Loading…" is shown
- When the answer arrives, the headline and table replace it

**Priority:** Medium
**Type:** Edge case

---

# Test Case 20: An error can be retried

**Preconditions:**

- Same as Test Case 1
- The first request fails once with a server error

**Test Data:**

- None

**Steps:**

1. Click "Insights". The error and "Retry" are shown
2. Click "Retry"

**Expected Result:**

- After the error, the alert "Something went wrong" is shown with the "Retry" button
- After Retry, the headline and the 8 rows are shown

**Priority:** Medium
**Type:** Negative / Error handling

---

# Test Case 21: The page needs a login

**Preconditions:**

- The user is not logged in

**Test Data:**

- None

**Steps:**

1. Open the Insights page address directly
2. Call `GET /api/category-changes` without a session

**Expected Result:**

- Step 1: the user is sent to the sign-in page
- Step 2: the answer is 401 with code `unauthenticated`

**Priority:** High
**Type:** Security

---

# Test Case 22: A user sees only their own data

**Preconditions:**

- Two registered users, each with imported transactions
- User B is logged in

**Test Data:**

- User A has Shopping spending that User B does not have

**Steps:**

1. Open "Insights" as User B

**Expected Result:**

- No row or amount comes from User A

**Priority:** High
**Type:** Security

---

# Test Case 23: Direction is clear without colour

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Look at the table with colours turned off or with a screen reader

**Expected Result:**

- Every change shows an arrow (↑ or ↓) and the amount, so it is understood without colour
- The table has header cells for Category and Change
- A screen reader announces the direction, for example "increase" or "decrease"

**Priority:** Medium
**Type:** Accessibility

---

# Test Case 24: Nothing else changes

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Check the Overview page, the Transactions page and the import after opening "Insights"

**Expected Result:**

- They work as before, including the month buttons and the category filter on Transactions
- Switching months is not offered on the Insights page

**Priority:** Medium
**Type:** Regression

---

# Test Case 25: A notice is shown when an older exchange rate was used

**Preconditions:**

- A registered user is logged in
- The user has a transaction in a foreign currency dated today
- Yesterday's rate of that currency pair is stored, and the rate service is not reachable

**Test Data:**

- One foreign-currency purchase today, and a purchase in the same category in the same days of the month before

**Steps:**

1. Click "Insights" in the nav bar

**Expected Result:**

- The page loads and shows the table, the amount of today's transaction converted at yesterday's rate
- A notice "Some amounts use an older exchange rate because current rates are unavailable." is shown above the table
- The Overview page shows the same notice

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 26: No notice when every rate is exact

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Click "Insights" in the nav bar

**Expected Result:**

- No notice about exchange rates is shown
- The same is true for a user whose transactions are all in one currency

**Priority:** Medium
**Type:** Negative / Regression
