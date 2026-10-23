export type Totals = { spendingCents: number; incomeCents: number; netCents: number };

export type Comparison = {
  month: string; // YYYY-MM
  previousMonth: string; // YYYY-MM
  currency: string;
  current: Totals;
  previous: Totals;
  change: Totals; // current minus previous
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

// Without a month the server reports the month of the user's most recent transaction.
export async function getComparison(month?: string): Promise<ComparisonResult> {
  try {
    const res = await fetch(month ? `/api/comparison?month=${month}` : '/api/comparison');
    const body = await res.json();

    if (res.ok) {
      const current = toTotals(body?.current);
      const previous = toTotals(body?.previous);
      const change = toTotals(body?.change);
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
