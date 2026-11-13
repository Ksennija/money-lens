# Test Case 1: The dropdown starts on "All categories"

**Preconditions:**

- A registered user is logged in
- The user imported `spec/samples/bank-export-sample.csv`

**Test Data:**

- Sample file: 18 transactions in September 2026

**Steps:**

1. Click "Transactions" in the nav bar

**Expected Result:**

- A dropdown named "Filter by category" is above the table, with the visible label "Category"
- It shows "All categories"
- The table shows all 18 rows of September 2026

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: The dropdown lists all 12 categories

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Open the dropdown

**Expected Result:**

- The options are, in this order: All categories, Income, Housing, Utilities, Groceries, Eating out, Subscriptions, Health, Transport, Shopping, Entertainment, Fees, Other

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 3: Choosing a category shows only its transactions

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Category: Groceries

**Steps:**

1. Choose "Groceries" in the dropdown

**Expected Result:**

- The table shows 3 rows: the REWE and Lidl transactions of September 2026
- No other rows are shown
- The rows keep their order (newest first)
- No new request for the transactions is sent (the filter works on the loaded month)

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 4: "All categories" brings all rows back

**Preconditions:**

- Same as Test Case 3, with "Groceries" chosen

**Test Data:**

- None

**Steps:**

1. Choose "All categories"

**Expected Result:**

- The table shows all 18 rows again

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 5: A category with no transactions in the month

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Category: Other (its only transaction is in August)

**Steps:**

1. Choose "Other"

**Expected Result:**

- The text "No transactions in Other in September 2026." is shown
- The table is gone
- The dropdown and the month buttons are still there

**Priority:** High
**Type:** Edge case

---

# Test Case 6: The filter stays when the month changes

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Category: Groceries

**Steps:**

1. Choose "Groceries"
2. Click "Previous month"

**Expected Result:**

- The page shows August 2026
- The dropdown still shows "Groceries"
- The table shows the 3 groceries of August 2026 (REWE and Lidl) and no other rows

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 7: The filter stays after Next month

**Preconditions:**

- Same as Test Case 6, on August 2026 with "Groceries" chosen

**Test Data:**

- None

**Steps:**

1. Click "Next month"

**Expected Result:**

- The page shows September 2026 with "Groceries" still chosen
- The table shows 3 rows

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 8: Moving to a month with no match shows the message

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- Category: Fees (September has the bank account fee, August has none)

**Steps:**

1. Choose "Fees". The table shows 1 row
2. Click "Previous month"

**Expected Result:**

- The text "No transactions in Fees in August 2026." is shown
- The dropdown still shows "Fees"

**Priority:** Medium
**Type:** Edge case

---

# Test Case 9: The filter stays during loading

**Preconditions:**

- Same as Test Case 1
- The next response is delayed

**Test Data:**

- Category: Groceries

**Steps:**

1. Choose "Groceries"
2. Click "Previous month" and look at the page before the answer arrives

**Expected Result:**

- "Loading…" is shown, the dropdown is still on screen and still shows "Groceries"
- When the answer arrives, the filter is applied to it

**Priority:** Medium
**Type:** Edge case

---

# Test Case 10: The filter stays after an error and Retry

**Preconditions:**

- Same as Test Case 1
- The next request for August fails once with a server error

**Test Data:**

- Category: Groceries

**Steps:**

1. Choose "Groceries"
2. Click "Previous month". The error and "Retry" are shown
3. Click "Retry"

**Expected Result:**

- After the error, the alert "Something went wrong" is shown
- After Retry, August 2026 shows with "Groceries" chosen and 3 rows

**Priority:** Medium
**Type:** Negative / Error handling

---

# Test Case 11: A category the page does not know

**Preconditions:**

- The server answers with one transaction whose category is `pet-care` (not in the list) and one with `groceries`

**Test Data:**

- None

**Steps:**

1. Open Transactions and look at the table
2. Choose "Groceries"
3. Choose "All categories"

**Expected Result:**

- Step 1: both rows are shown
- Step 2: only the groceries row is shown
- Step 3: both rows are shown again
- No error and no crash

**Priority:** Low
**Type:** Edge case

---

# Test Case 12: No dropdown when the user has no transactions

**Preconditions:**

- A registered user is logged in
- The user has no transactions

**Test Data:**

- None

**Steps:**

1. Click "Transactions" in the nav bar

**Expected Result:**

- The text "No transactions yet. Import a CSV file on the Overview page." is shown, with the link
- There is no dropdown and no month button

**Priority:** Medium
**Type:** Edge case

---

# Test Case 13: The dropdown works with the keyboard

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Press Tab until the dropdown is focused
2. Choose "Groceries" with the arrow keys

**Expected Result:**

- The focus is visible on the dropdown
- A screen reader announces it as "Filter by category"
- The table shows only the 3 groceries rows

**Priority:** Medium
**Type:** Accessibility

---

# Test Case 14: Nothing else changes

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Click "Overview", then "Transactions" again
2. Check the Overview page and the import

**Expected Result:**

- The Overview and the import work as before
- The dropdown is back on "All categories" after coming back to the page (the filter is not stored)
- The columns of the table are still Date, Counterparty, Details, Amount (no Category column)

**Priority:** Medium
**Type:** Regression
