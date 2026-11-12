import { findTransactionsInRange, type TransactionListItem } from '../db/transactionRepository.js';
import { categorize } from '../domain/categorization/categorize.js';
import type { Category } from '../domain/categorization/rules.js';
import { monthBounds } from '../domain/comparison/compareMonths.js';
import { resolveMonth } from './resolveMonth.js';

export type CategorizedTransaction = TransactionListItem & { category: Category };
export type MonthlyTransactions = { month: string; transactions: CategorizedTransaction[] };

// Categories are worked out here on every read, not stored.
// Amounts stay in the currency they were imported in: a list needs no exchange rates.
export async function getMonthlyTransactions(
  userId: string,
  requestedMonth: string | undefined,
): Promise<MonthlyTransactions> {
  const month = await resolveMonth(userId, requestedMonth);
  const { start, end } = monthBounds(month);
  const rows = await findTransactionsInRange(userId, start, end);
  return { month, transactions: rows.map((row) => ({ ...row, category: categorize(row) })) };
}
