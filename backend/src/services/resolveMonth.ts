import { findLatestTransactionDate } from '../db/transactionRepository.js';

// Without a month, the month of the user's most recent transaction is used, because imported
// bank files are usually for past months. A user with no transactions gets the current month.
export async function resolveMonth(userId: string, month: string | undefined): Promise<string> {
  if (month) return month;
  const latest = await findLatestTransactionDate(userId);
  return (latest ?? new Date().toISOString()).slice(0, 7);
}
