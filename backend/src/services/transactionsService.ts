import { findTransactionsInRange, type TransactionListItem } from '../db/transactionRepository.js';
import { monthBounds } from '../domain/comparison/compareMonths.js';
import { resolveMonth } from './resolveMonth.js';

export type MonthlyTransactions = { month: string; transactions: TransactionListItem[] };

// Amounts stay in the currency they were imported in: a list needs no exchange rates.
export async function getMonthlyTransactions(
  userId: string,
  requestedMonth: string | undefined,
): Promise<MonthlyTransactions> {
  const month = await resolveMonth(userId, requestedMonth);
  const { start, end } = monthBounds(month);
  return { month, transactions: await findTransactionsInRange(userId, start, end) };
}
