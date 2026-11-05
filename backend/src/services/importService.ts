import { importTransactions } from '../db/transactionRepository.js';
import { parseBankCsv, type RejectedRow } from '../domain/transactions/parseBankCsv.js';

export const MAX_DATA_ROWS = 5000;

export type ImportResult =
  | { kind: 'imported'; imported: number; duplicates: number; rejected: RejectedRow[] }
  | { kind: 'malformed' }
  | { kind: 'missing-columns'; missingColumns: string[] }
  | { kind: 'too-many-rows' };

// Parses a bank CSV and stores the new rows for the user. HTTP concerns (upload limits, status
// codes) stay in the route; this only decides what happened to the file.
export async function importBankCsv(userId: string, csvText: string): Promise<ImportResult> {
  const parsed = parseBankCsv(csvText);

  if ('malformed' in parsed) return { kind: 'malformed' };
  if ('missingColumns' in parsed) {
    return { kind: 'missing-columns', missingColumns: parsed.missingColumns };
  }
  if (parsed.rows.length + parsed.rejected.length > MAX_DATA_ROWS) {
    return { kind: 'too-many-rows' };
  }

  const { imported, duplicates } = await importTransactions(userId, parsed.rows);
  return { kind: 'imported', imported, duplicates, rejected: parsed.rejected };
}
