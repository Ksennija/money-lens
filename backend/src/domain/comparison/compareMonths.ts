export type Totals = { spendingCents: number; incomeCents: number; netCents: number };

export type Change = {
  spendingCents: number;
  incomeCents: number;
  netCents: number;
  spendingPercent: number | null; // null when the previous month had none to compare with
  incomePercent: number | null;
};

// Spending is the sum of money out (reported as a positive number), income the sum of money in.
// Refunds are positive amounts, so they count as income.
export function summarize(amountsCents: number[]): Totals {
  let spendingCents = 0;
  let incomeCents = 0;
  for (const amount of amountsCents) {
    if (amount < 0) spendingCents += -amount;
    else incomeCents += amount;
  }
  return { spendingCents, incomeCents, netCents: incomeCents - spendingCents };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function compareTotals(current: Totals, previous: Totals): Change {
  return {
    spendingCents: current.spendingCents - previous.spendingCents,
    incomeCents: current.incomeCents - previous.incomeCents,
    netCents: current.netCents - previous.netCents,
    spendingPercent: percentChange(current.spendingCents, previous.spendingCents),
    incomePercent: percentChange(current.incomeCents, previous.incomeCents),
  };
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidMonth(month: string): boolean {
  return MONTH_PATTERN.test(month);
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function previousMonth(month: string): string {
  return shiftMonth(month, -1);
}

// First day of the month, and the first day of the next month (exclusive end), as YYYY-MM-DD.
export function monthBounds(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}
