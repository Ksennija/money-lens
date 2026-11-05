# Refactoring. Add an import service

The two simpler alternatives are suggested:

- Option A: Leave the layering, put the new logic in domain
- Option B: A thin service that wraps parse and save only

Option A is a the smallest diff, with no new layer or file in services/ and the new logic is pure and easy to unit-test.

I choose Option B because it matches how comparison already works (route → service → db) and is more suitable for the further features.

# Plan: thin import service (Option B)

## Context

`backend/src/routes/importTransactions.ts` imports `db/transactionRepository` directly and runs parse, row-limit check and save itself. Comparison already goes route -> service -> db. This change adds a thin service so import follows the same shape, the route handles HTTP only, and categorization later has a place to plug in. Behavior and API responses stay identical.

## Setup (first)

- From a clean `main`, create and switch to branch `feature/import-service` (`git switch -c feature/import-service`). All work below happens on it. No commits or pushes unless asked.
- Save this plan as `spec/importServicePlan.md` (next to the existing specs, camelCase name).

## Changes

1. **New `backend/src/services/importService.ts`**
   - `importBankCsv(userId: string, csvText: string): Promise<ImportResult>`
   - Calls `parseBankCsv` (domain), checks `rows.length + rejected.length > MAX_DATA_ROWS`, then calls `importTransactions` (db/transactionRepository).
   - `MAX_DATA_ROWS = 5000` moves here from the route.
   - Result union: `{ kind: 'imported', imported, duplicates, rejected }` | `{ kind: 'malformed' }` | `{ kind: 'missing-columns', missingColumns }` | `{ kind: 'too-many-rows' }`.
2. **Edit `routes/importTransactions.ts`**
   - Keeps: multer upload, `MAX_FILE_SIZE_BYTES`, the file and CSV-extension checks, status-code mapping, the try/catch 500.
   - Removes: imports of `parseBankCsv` and `db/transactionRepository`, and `MAX_DATA_ROWS`.
   - The handler calls `importBankCsv(req.session.userId!, file.buffer.toString('utf-8'))` and maps each `kind` to the same JSON and status as today (400 invalid-file, 400 missing-columns, 413 file-too-large, 200 imported).
3. **New `services/importService.test.ts`**
   - Uses the real test database, like `monthlyComparisonService.test.ts` (the existing service tests do not mock).
   - Cases: valid file with a rejected row, duplicates on a second import, missing columns, over the row limit (nothing stored), and an all-rejected file.
4. **Edit `.dependency-cruiser.cjs`**
   - Added `import-route-not-db`: `routes/importTransactions.ts` may not import `^backend/src/db/`.
   - A rule for all routes would fail today, because `routes/login.ts`, `register.ts` and `me.ts` import `db/userRepository`. The rule is therefore scoped to the import route and should be widened when the auth routes get services.

## Not in this change

The duplicate rule stays in the repository, and categorization, shared types and the error wrapper are separate items.

## Verification

- `pnpm check:deps` passes with the new rule.
- `pnpm --filter backend test`: the existing import route tests pass unchanged (this proves the behavior is the same), plus the new service tests.
- Manually, import `spec/samples/bank-export-sample.csv` twice. The first import should return the imported rows and the second should return all duplicates.

## Result

Implemented on branch `feature/import-service`. `pnpm check:deps`, the type check and all 128 backend tests pass.

Note on row numbers: the parser reports file line numbers, so the header is line 1 and the first data row is line 2. The first draft of the service test expected the wrong number; the test was corrected, the code was not changed.
