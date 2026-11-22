# Refunds reduce spending in the monthly comparison

## Context

`GET /api/comparison` (see `monthComparisonSpec.md`) used to split money by sign only, so every refund counted as income and never reduced spending. The category changes on the Insights page already treat a refund as a reduction of spending (see `categorizationSpec.md` and `categoryChangesTestSpec.md`). The two screens must agree.

## Rule

- A transaction with a positive amount and a category other than `income` is a refund. It reduces spending and is not income. The category comes from `categorize()`, so this covers refund words on an unknown merchant (refund, reversal, Erstattung, Rückerstattung, Gutschrift) and refunds from a merchant with a rule (Amazon "Refund")
- Every other positive amount is income, every negative amount is spending, as before
- Spending is money out minus refunds, reported as it is. It is negative when refunds are higher than purchases
- Net is income minus spending. A refund moves from the income side to the spending side, so the net does not change
- Conversion, month boundaries and percentages work as in `monthComparisonSpec.md`

All test cases below assume a logged-in user and reporting currency EUR, unless said otherwise.

---

# Test Case 1: A refund from an unknown merchant reduces spending

**Preconditions:** The user has transactions only in August 2026

**Test Data:**

| Date       | Counterparty | Details  | Amount   |
| ---------- | ------------ | -------- | -------- |
| 2026-08-01 | Acme GmbH    | Salary   | 3000.00  |
| 2026-08-05 | Local Shop   | Purchase | -50.00   |
| 2026-08-10 | Local Shop   | Refund   | 15.00    |

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `current` is `{ spendingCents: 3500, incomeCents: 300000, netCents: 296500 }`
- The refund is not in `incomeCents`

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 2: A refund from a merchant with a rule reduces spending

**Test Data:** In August 2026: Salary 3000.00 from Acme GmbH, and Amazon "Refund" 18.99

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `spendingCents` is -1899 and `incomeCents` is 300000
- The refund is found through the Amazon rule, not through a refund word

**Priority:** High
**Type:** Positive / Functional

---

# Test Case 3: Real income stays income

**Test Data:** In August 2026: Salary 3000.00 from Acme GmbH, "Expense reimbursement" 85.00 from Acme GmbH, and "Transfer" 25.00 from Anna Weber

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `incomeCents` is 311000 and `spendingCents` is 0

**Priority:** High
**Type:** Negative / Regression

---

# Test Case 4: Refunds do not change the net

**Test Data:** The data of Test Case 1

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `netCents` is 296500, the same value as when refunds counted as income (301500 income minus 5000 spending)

**Priority:** Medium
**Type:** Regression

---

# Test Case 5: Refunds higher than purchases give negative spending

**Test Data:** In August 2026: Local Shop "Purchase" -10.00 and Local Shop "Refund" 25.00. No other transactions

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `spendingCents` is -1500, `incomeCents` is 0 and `netCents` is 1500

**Priority:** Medium
**Type:** Edge case

---

# Test Case 6: A refund reduces the month it is booked in

**Test Data:** Local Shop "Purchase" -40.00 on 2026-07-20, and Local Shop "Refund" 15.00 on 2026-08-03

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `previous.spendingCents` is 4000 and `current.spendingCents` is -1500
- The refund is not matched to the July purchase

**Priority:** Medium
**Type:** Edge case

---

# Test Case 7: A refund in a foreign currency is converted before it reduces spending

**Test Data:** In August 2026, rate 1 USD = 0.90 EUR on the booking day: Local Shop "Purchase" -20.00 EUR and Local Shop "Refund" 10.00 USD

**Steps:** Request `GET /api/comparison?month=2026-08&currency=EUR`

**Expected Result:**

- `spendingCents` is 1100 (2000 minus 900)
- `incomeCents` is 0

**Priority:** Medium
**Type:** Positive / Functional

---

# Test Case 8: Change and percent use the new totals

**Test Data:** Local Shop "Purchase" -40.00 on 2026-07-20. In August: Local Shop "Purchase" -50.00 and Local Shop "Refund" 15.00

**Steps:** Request `GET /api/comparison?month=2026-08`

**Expected Result:**

- `previous.spendingCents` is 4000 and `current.spendingCents` is 3500
- `change.spendingCents` is -500 and `change.spendingPercent` is -12.5

**Priority:** Medium
**Type:** Positive / Functional
