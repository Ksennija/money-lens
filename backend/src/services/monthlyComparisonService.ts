import { findTransactionAmounts, type TransactionAmount } from '../db/transactionRepository.js';
import {
  compareTotals,
  monthBounds,
  previousMonth,
  summarize,
  type Change,
  type Totals,
} from '../domain/comparison/compareMonths.js';
import { convertAmountCents } from '../domain/currency/convertAmount.js';
import { getRates } from './currencyConversionService.js';
import type { FetchRates } from './frankfurterClient.js';

export type MonthlyComparison = {
  month: string;
  previousMonth: string;
  currency: string;
  current: Totals;
  previous: Totals;
  change: Change;
};

const DEFAULT_CURRENCY = 'EUR';

function mostCommonCurrency(rows: TransactionAmount[]): string | undefined {
  const counts = new Map<string, number>();
  for (const { currency } of rows) counts.set(currency, (counts.get(currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

// Every transaction is converted with the rate of its own day, so the totals of a month do not
// shift when rates move later. Each foreign currency needs at most one API request, and none
// once its rates are cached.
export async function getMonthlyComparison(
  userId: string,
  month: string,
  requestedCurrency?: string,
  fetchRates?: FetchRates,
): Promise<MonthlyComparison> {
  const previous = previousMonth(month);
  const rows = await findTransactionAmounts(
    userId,
    monthBounds(previous).start,
    monthBounds(month).end,
  );
  const currency = requestedCurrency?.toUpperCase() ?? mostCommonCurrency(rows) ?? DEFAULT_CURRENCY;

  const rowsByCurrency = new Map<string, TransactionAmount[]>();
  for (const row of rows) {
    rowsByCurrency.set(row.currency, [...(rowsByCurrency.get(row.currency) ?? []), row]);
  }

  const converted = (
    await Promise.all(
      [...rowsByCurrency.entries()].map(async ([from, group]) => {
        const rates = await getRates(from, currency, group.map((r) => r.date), fetchRates);
        return group.map((r) => ({
          month: r.date.slice(0, 7),
          amountCents: convertAmountCents(r.amountCents, rates.get(r.date)!),
        }));
      }),
    )
  ).flat();

  const amountsOf = (m: string) => converted.filter((c) => c.month === m).map((c) => c.amountCents);
  const currentTotals = summarize(amountsOf(month));
  const previousTotals = summarize(amountsOf(previous));

  return {
    month,
    previousMonth: previous,
    currency,
    current: currentTotals,
    previous: previousTotals,
    change: compareTotals(currentTotals, previousTotals),
  };
}
