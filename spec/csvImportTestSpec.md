# Test Case 1: Successful import of a valid CSV file

**Preconditions:**

- User is logged in
- User has no imported transactions
- User is on the import page

**Test Data:**

- File: `spec/samples/bank-export-sample.csv` (36 valid rows, August and September 2026)

**Steps:**

1. Select the sample CSV file
2. Click "Import"

**Expected Result:**

- The summary shows: 36 imported, 0 duplicates skipped, 0 rows rejected
- 36 transactions are stored for the user
- Spending rows are stored as negative amounts and income rows as positive amounts

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: Header matching is case-insensitive, column order is free, extra columns are ignored

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- A file whose header is `AMOUNT;balance;Currency;details;COUNTERPARTY;booking DATE;Notes` with 2 valid rows

**Steps:**

1. Select the file
2. Click "Import"

**Expected Result:**

- The summary shows: 2 imported, 0 duplicates skipped, 0 rows rejected
- Values are read from the correct columns

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 3: Amounts are stored exactly

**Preconditions:**

- User is logged in
- User has no imported transactions

**Test Data:**

- Rows with amounts `-0,10`, `-0,20`, `1234,56` and `-1100,00`

**Steps:**

1. Import the file
2. Check the stored amounts

**Expected Result:**

- Amounts are stored as `-10`, `-20`, `123456` and `-110000` cents
- No rounding error appears

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 4: Re-uploading the same file imports nothing

**Preconditions:**

- User is logged in
- The sample file was already imported (Test Case 1)

**Test Data:**

- File: `spec/samples/bank-export-sample.csv`

**Steps:**

1. Select the same file again
2. Click "Import"

**Expected Result:**

- The summary shows: 0 imported, 36 duplicates skipped, 0 rows rejected
- The user still has exactly 36 transactions

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 5: Identical rows within one file are all imported

**Preconditions:**

- User is logged in
- User has no imported transactions

**Test Data:**

- A file with two identical rows (same date, counterparty, details and amount, e.g. two coffees for `-3,80` on `03.08.2026`)

**Steps:**

1. Import the file
2. Import the same file again

**Expected Result:**

- First import: 2 imported, 0 duplicates skipped
- Second import: 0 imported, 2 duplicates skipped
- The user has exactly 2 such transactions

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 6: Overlapping files import only the new rows

**Preconditions:**

- User is logged in
- File A was already imported (e.g. the August rows of the sample)

**Test Data:**

- File B: 2 August rows already imported plus 2 new rows

**Steps:**

1. Import file B

**Expected Result:**

- The summary shows: 2 imported, 2 duplicates skipped, 0 rows rejected

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 7: Invalid rows are rejected with row numbers while valid rows are imported

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- A file with a header and 5 data rows: row 2 valid, row 3 with date `31.02.2026`, row 4 with amount `abc`, row 5 with empty counterparty and details, row 6 valid

**Steps:**

1. Import the file

**Expected Result:**

- The summary shows: 2 imported, 0 duplicates skipped, 3 rows rejected
- The rejected list shows row 3 `invalid-date`, row 4 `invalid-amount`, row 5 `empty-description` (row numbers count the header as row 1)

**Priority:** High
**Type:** Negative / Functional

---

# Test Case 8: Header missing a required column

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- A file whose header has no `Amount` column

**Steps:**

1. Import the file

**Expected Result:**

- The import is rejected with `missing-columns` and the message names `Amount`
- No transactions are stored

**Priority:** High
**Type:** Negative / Functional

---

# Test Case 9: No file or a file that is not a CSV

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- No file selected, or a `.png` image

**Steps:**

1. Click "Import" without selecting a file, or select the image and click "Import"

**Expected Result:**

- The import is rejected with `invalid-file`
- No transactions are stored

**Priority:** High
**Type:** Negative / Functional

---

# Test Case 10: File over the size or row limit

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- A CSV larger than 2 MB, or a CSV with 5,001 data rows

**Steps:**

1. Import the file

**Expected Result:**

- The import is rejected with `file-too-large`
- No transactions are stored

**Priority:** Medium
**Type:** Negative / Functional

---

# Test Case 11: File with a header only

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- A file containing only the header row

**Steps:**

1. Import the file

**Expected Result:**

- The summary shows: 0 imported, 0 duplicates skipped, 0 rows rejected
- No error is shown

**Priority:** Low
**Type:** Negative / Edge case

---

# Test Case 12: Import requires login

**Preconditions:**

- User has no active session

**Test Data:**

- File: `spec/samples/bank-export-sample.csv`

**Steps:**

1. Send `POST /api/transactions/import` with the file and no session cookie
2. Open the app in the browser

**Expected Result:**

- The request is rejected with 401 `unauthenticated` and nothing is stored
- The app shows the login page, not the import page

**Priority:** High
**Type:** Negative / Security

---

# Test Case 13: Transactions belong to their user

**Preconditions:**

- Two registered users, A and B

**Test Data:**

- File: `spec/samples/bank-export-sample.csv`

**Steps:**

1. Log in as A and import the file
2. Log in as B and import the same file

**Expected Result:**

- B's import shows 36 imported, 0 duplicates skipped
- A and B each have their own 36 transactions
- B's import does not change A's transactions

**Priority:** High
**Type:** Negative / Security

---

# Test Case 14: A failed import leaves no partial data

**Preconditions:**

- User is logged in
- Storing the transactions fails partway (simulated database failure)

**Test Data:**

- A valid file with several rows

**Steps:**

1. Import the file

**Expected Result:**

- The response is 500 `server-error`
- None of the file's rows are stored

**Priority:** Medium
**Type:** Negative / Robustness

---

# Test Case 15: The page shows a pending state and the result

**Preconditions:**

- User is logged in
- User is on the import page

**Test Data:**

- A valid file, and a file with some invalid rows

**Steps:**

1. Select the file and click "Import"
2. Observe the page while the upload runs
3. Observe the page after the response

**Expected Result:**

- While uploading, the "Import" button is disabled and any earlier result is cleared
- After the response, the page shows the summary and, if there are rejected rows, a list with each row number and reason
- A whole-file error is shown as an alert

**Priority:** Medium
**Type:** Positive / Functional
