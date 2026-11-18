import { findLatestTransactionDate, findTransactionsInRange } from '../db/transactionRepository.js';
import { categorize } from '../domain/categorization/categorize.js';
import { computeCategoryChanges, type CategoryChange } from '../domain/categoryChanges/computeCategoryChanges.js';
import { comparisonWindows } from '../domain/comparison/compareMonths.js';
import { convertAmountCents } from '../domain/currency/convertAmount.js';
import { getRates } from './currencyConversionService.js';
import type { FetchRates } from './frankfurterClient.js';
import { mostCommonCurrency } from './monthlyComparisonService.js';

export type CategoryChanges = {
  month: string;
  currency: string;
  hasTransactions: boolean;
  changes: CategoryChange[];
};

const DEFAULT_CURRENCY = 'EUR';

// The month is that of the user's latest transaction, compared up to that day with the same days of
// the month before. Every transaction is converted with the rate of its own day, like the monthly
// comparison, and categories are worked out here, not stored.
export async function getCategoryChanges(
  userId: string,
  requestedCurrency?: string,
  fetchRates?: FetchRates,
): Promise<CategoryChanges> {
  const latest = await findLatestTransactionDate(userId);
  if (!latest) {
    return {
      month: new Date().toISOString().slice(0, 7),
      currency: requestedCurrency?.toUpperCase() ?? DEFAULT_CURRENCY,
      hasTransactions: false,
      changes: [],
    };
  }

  const { current, previous } = comparisonWindows(latest);
  const rows = await findTransactionsInRange(userId, previous.start, current.end);
  const currency = requestedCurrency?.toUpperCase() ?? mostCommonCurrency(rows) ?? DEFAULT_CURRENCY;

  const rowsByCurrency = new Map<string, typeof rows>();
  for (const row of rows) {
    rowsByCurrency.set(row.currency, [...(rowsByCurrency.get(row.currency) ?? []), row]);
  }

  const converted = (
    await Promise.all(
      [...rowsByCurrency.entries()].map(async ([from, group]) => {
        const rates = await getRates(from, currency, group.map((r) => r.date), fetchRates);
        return group.map((r) => ({
          date: r.date,
          category: categorize(r),
          amountCents: convertAmountCents(r.amountCents, rates.get(r.date)!),
        }));
      }),
    )
  ).flat();

  const within = (window: { start: string; end: string }) =>
    converted.filter((c) => c.date >= window.start && c.date < window.end);

  return {
    month: latest.slice(0, 7),
    currency,
    hasTransactions: true,
    changes: computeCategoryChanges(within(previous), within(current)),
  };
}
