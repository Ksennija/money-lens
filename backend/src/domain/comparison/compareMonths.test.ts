import { compareTotals, isValidMonth, monthBounds, previousMonth, summarize } from './compareMonths.js';

describe('summarize', () => {
  it('sums money out as spending and money in as income', () => {
    expect(summarize([-1000, 30000, -250, 500])).toEqual({
      spendingCents: 1250,
      incomeCents: 30500,
      netCents: 29250,
    });
  });

  it('returns zeros for no transactions', () => {
    expect(summarize([])).toEqual({ spendingCents: 0, incomeCents: 0, netCents: 0 });
  });

  it('reports a negative net when spending exceeds income', () => {
    expect(summarize([-5000, 1000]).netCents).toBe(-4000);
  });
});

describe('compareTotals', () => {
  const previous = { spendingCents: 2000, incomeCents: 30000, netCents: 28000 };

  it('reports the change in cents and in percent rounded to one decimal', () => {
    const current = { spendingCents: 4600, incomeCents: 30300, netCents: 25700 };

    expect(compareTotals(current, previous)).toEqual({
      spendingCents: 2600,
      incomeCents: 300,
      netCents: -2300,
      spendingPercent: 130,
      incomePercent: 1,
    });
  });

  it('reports a decrease as a negative change', () => {
    const current = { spendingCents: 1000, incomeCents: 30000, netCents: 29000 };

    const change = compareTotals(current, previous);

    expect(change.spendingCents).toBe(-1000);
    expect(change.spendingPercent).toBe(-50);
  });

  it('has no percentage when the previous month was zero', () => {
    const zero = { spendingCents: 0, incomeCents: 0, netCents: 0 };

    const change = compareTotals(previous, zero);

    expect(change.spendingPercent).toBeNull();
    expect(change.incomePercent).toBeNull();
    expect(change.spendingCents).toBe(2000);
  });
});

describe('month helpers', () => {
  it('finds the previous month, across a year boundary too', () => {
    expect(previousMonth('2026-08')).toBe('2026-07');
    expect(previousMonth('2026-01')).toBe('2025-12');
  });

  it('gives an inclusive start and exclusive end, across a year boundary too', () => {
    expect(monthBounds('2026-08')).toEqual({ start: '2026-08-01', end: '2026-09-01' });
    expect(monthBounds('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
  });

  it('accepts only YYYY-MM with a real month', () => {
    expect(isValidMonth('2026-08')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(isValidMonth('2026-8')).toBe(false);
    expect(isValidMonth('08-2026')).toBe(false);
  });
});
