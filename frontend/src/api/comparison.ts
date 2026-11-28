export type Totals = { spendingCents: number; incomeCents: number; netCents: number };

// The percent is how much the value moved vs the previous month, rounded to one decimal by the
// server (8.4 means 8.4%). It is null when the previous month had nothing to compare with.
export type Change = Totals & {
  spendingPercent: number | null;
  incomePercent: number | null;
};

export type Comparison = {
  month: string; // YYYY-MM
  previousMonth: string; // YYYY-MM
  currency: string;
  current: Totals;
  previous: Totals;
  change: Change; // current minus previous
  ratesApproximate: boolean; // some amounts use an older exchange rate
};

export type ComparisonResult =
  | { ok: true; comparison: Comparison }
  | { ok: false; code: string; message: string };

const SERVER_ERROR: ComparisonResult = {
  ok: false,
  code: 'server-error',
  message: 'Something went wrong',
};

function toTotals(value: unknown): Totals | null {
  const totals = value as Totals | null;
  if (
    typeof totals?.spendingCents !== 'number' ||
    typeof totals?.incomeCents !== 'number' ||
    typeof totals?.netCents !== 'number'
  ) {
    return null;
  }
  return { spendingCents: totals.spendingCents, incomeCents: totals.incomeCents, netCents: totals.netCents };
}

function toPercent(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toChange(value: unknown): Change | null {
  const totals = toTotals(value);
  if (!totals) return null;
  const change = value as { spendingPercent?: unknown; incomePercent?: unknown };
  return {
    ...totals,
    spendingPercent: toPercent(change.spendingPercent),
    incomePercent: toPercent(change.incomePercent),
  };
}

// Without a month the server reports the month of the user's most recent transaction.
export async function getComparison(month?: string): Promise<ComparisonResult> {
  try {
    const res = await fetch(month ? `/api/comparison?month=${month}` : '/api/comparison');
    const body = await res.json();

    if (res.ok) {
      const current = toTotals(body?.current);
      const previous = toTotals(body?.previous);
      const change = toChange(body?.change);
      if (
        typeof body?.month !== 'string' ||
        typeof body?.previousMonth !== 'string' ||
        typeof body?.currency !== 'string' ||
        !current ||
        !previous ||
        !change
      ) {
        return SERVER_ERROR;
      }
      return {
        ok: true,
        comparison: {
          month: body.month,
          previousMonth: body.previousMonth,
          currency: body.currency,
          current,
          previous,
          change,
          ratesApproximate: body.ratesApproximate === true,
        },
      };
    }

    if (typeof body?.code !== 'string' || typeof body?.message !== 'string') {
      return SERVER_ERROR;
    }
    return { ok: false, code: body.code, message: body.message };
  } catch {
    return SERVER_ERROR;
  }
}
