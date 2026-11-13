# Test Case 1: The filter button starts on "All categories" with the panel closed

**Preconditions:**

- A registered user is logged in
- The user imported `spec/samples/bank-export-sample.csv`

**Test Data:**

- Sample file: 18 transactions in September 2026

**Steps:**

1. Click "Transactions" in the nav bar

**Expected Result:**

- A button reads "All categories" and is not expanded (`aria-expanded="false"`)
- No checkboxes are visible
- The table shows all 18 rows of September 2026

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: The panel lists all 12 categories, none checked

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Click the "All categories" button

**Expected Result:**

- The button is now expanded
- A group named "Categories" shows 12 checkboxes, in this order: Income, Housing, Utilities, Groceries, Eating out, Subscriptions, Health, Transport, Shopping, Entertainment, Fees, Other
- None is checked
- A "Clear" button is shown and is disabled
- The table still shows 18 rows

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 3: Checking one category shows only that category

**Preconditions:**

- Same as Test Case 2, with the panel open

**Test Data:**

- Category: Groceries

**Steps:**

1. Check "Groceries"

**Expected Result:**

- The table shows 3 rows: the REWE and Lidl transactions of September 2026
- The button reads "Groceries"
- The panel stays open
- No new request for the transactions is sent

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 4: Checking a second category shows the union

**Preconditions:**

- Same as Test Case 3, with "Groceries" checked

**Test Data:**

- Category: Eating out (3 transactions in September 2026)

**Steps:**

1. Check "Eating out"

**Expected Result:**

- The table shows 6 rows: 3 groceries and 3 eating out
- The rows keep their original order (newest first), not grouped by category
- The button reads "Groceries, Eating out"

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 5: Unchecking a category removes it from the table

**Preconditions:**

- Same as Test Case 4, with "Groceries" and "Eating out" checked

**Test Data:**

- None

**Steps:**

1. Uncheck "Groceries"

**Expected Result:**

- The table shows the 3 eating-out rows only
- The button reads "Eating out"

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 6: Unchecking the last category shows everything

**Preconditions:**

- Same as Test Case 5, with only "Eating out" checked

**Test Data:**

- None

**Steps:**

1. Uncheck "Eating out"

**Expected Result:**

- The table shows all 18 rows
- The button reads "All categories"
- "Clear" is disabled

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 7: Clear unchecks everything

**Preconditions:**

- The panel is open and "Groceries", "Eating out" and "Fees" are checked

**Test Data:**

- None

**Steps:**

1. Click "Clear"

**Expected Result:**

- All checkboxes are unchecked
- The table shows all 18 rows
- The button reads "All categories"
- The panel stays open

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 8: The button text for many categories

**Preconditions:**

- Same as Test Case 2

**Test Data:**

- Categories: Groceries, Eating out, Fees

**Steps:**

1. Check "Groceries". Read the button
2. Check "Eating out". Read the button
3. Check "Fees". Read the button

**Expected Result:**

- Step 1: "Groceries"
- Step 2: "Groceries, Eating out"
- Step 3: "3 categories"
- After step 3 the table shows 7 rows (3 groceries, 3 eating out, the account fee)

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 9: No match names the chosen categories

**Preconditions:**

- Same as Test Case 2

**Test Data:**

- September 2026 has no transaction in "Other"
- August 2026 has no transaction in "Fees" or "Entertainment"

**Steps:**

1. Check "Other"

**Expected Result:**

- The text "No transactions in Other in September 2026." is shown
- The table is gone
- The button, the panel and the month buttons are still there

**Steps (continued):**

2. Uncheck "Other" and check "Fees" and "Entertainment"
3. Click "Previous month"

**Expected Result (continued):**

- Step 2: the table shows 2 rows (the account fee and the cinema)
- Step 3: the text reads "No transactions in Entertainment and Fees in August 2026." (names in the order of the list)

**Priority:** High
**Type:** Edge case

---

# Test Case 10: The selection stays when the month changes

**Preconditions:**

- Same as Test Case 2

**Test Data:**

- Categories: Groceries, Eating out

**Steps:**

1. Check "Groceries" and "Eating out"
2. Click "Previous month"
3. Click "Next month"

**Expected Result:**

- After step 2: the page shows August 2026, both boxes are still checked, and the table shows 6 rows (3 groceries and 3 eating out)
- After step 3: September 2026 shows 6 rows with both boxes checked

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 11: The selection stays during loading and after an error and Retry

**Preconditions:**

- Same as Test Case 2
- The next request for August is delayed, and the one after it fails once

**Test Data:**

- Category: Groceries

**Steps:**

1. Check "Groceries"
2. Click "Previous month" and look at the page before the answer arrives
3. After the delayed answer fails, the alert and "Retry" are shown. Click "Retry"

**Expected Result:**

- Step 2: "Loading…" is shown, and the button and the checked box are still there
- Step 3: the alert "Something went wrong" is shown first. After Retry, August 2026 shows with "Groceries" still checked and 3 rows

**Priority:** Medium
**Type:** Negative / Error handling

---

# Test Case 12: The panel closes on Escape and on a click outside, and keeps the checks

**Preconditions:**

- Same as Test Case 4, with "Groceries" and "Eating out" checked and the panel open

**Test Data:**

- None

**Steps:**

1. Press Escape
2. Click the button to open the panel again
3. Click on the page heading "Transactions"

**Expected Result:**

- Step 1: the panel closes and the focus is on the button
- Step 2: the panel opens and both boxes are still checked
- Step 3: the panel closes
- A click inside the panel (on a checkbox or the legend) does not close it
- The table shows 6 rows the whole time

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 13: A category the page does not know

**Preconditions:**

- The server answers with one transaction whose category is `pet-care` (not in the list) and one with `groceries`

**Test Data:**

- None

**Steps:**

1. Open Transactions and look at the table
2. Check "Groceries"
3. Check all 12 categories
4. Click "Clear"

**Expected Result:**

- Step 1: both rows are shown
- Step 2: only the groceries row is shown
- Step 3: the groceries row is shown and the `pet-care` row stays hidden
- Step 4: both rows are shown again
- No error and no crash

**Priority:** Low
**Type:** Edge case

---

# Test Case 14: No filter when the user has no transactions

**Preconditions:**

- A registered user is logged in
- The user has no transactions

**Test Data:**

- None

**Steps:**

1. Click "Transactions" in the nav bar

**Expected Result:**

- The text "No transactions yet. Import a CSV file on the Overview page." is shown, with the link
- There is no filter button and no month button

**Priority:** Medium
**Type:** Edge case

---

# Test Case 15: The filter works with the keyboard

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Press Tab until the "All categories" button is focused
2. Press Enter to open the panel
3. Press Tab to the "Groceries" checkbox and press Space
4. Press Tab to the "Eating out" checkbox and press Space
5. Press Escape

**Expected Result:**

- The focus is visible on every control
- A screen reader announces the button as expanded or collapsed, and each checkbox with its label and checked state
- After step 4 the table shows 6 rows
- After step 5 the panel is closed, the focus is on the button, and the boxes stay checked

**Priority:** Medium
**Type:** Accessibility

---

# Test Case 16: Nothing else changes

**Preconditions:**

- Same as Test Case 1

**Test Data:**

- None

**Steps:**

1. Check "Groceries"
2. Click "Overview", then "Transactions" again
3. Check the Overview page and the import

**Expected Result:**

- Step 2: the button is back on "All categories" and nothing is checked (the filter is not stored)
- The Overview and the import work as before
- The columns of the table are still Date, Counterparty, Details, Amount (no Category column)
- The old dropdown "Filter by category" is gone

**Priority:** Medium
**Type:** Regression
