import { useEffect, useRef, useState } from 'react';
import { getComparison, type Comparison, type Totals } from '../api/comparison';

type View =
  | { status: 'loading'; comparison: Comparison | null } // comparison: the month still on screen
  | { status: 'ready'; comparison: Comparison }
  | { status: 'empty' }
  | { status: 'error'; code: string; message: string };

const RATES_UNAVAILABLE_MESSAGE = 'Exchange rates are currently unavailable. Try again in a moment.';

function monthDate(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

function formatMonth(month: string): string {
  return monthDate(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatMonthName(month: string): string {
  return monthDate(month).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
}

function nextMonth(month: string): string {
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 7);
}

// Formatting only: the amounts and changes themselves are calculated by the server.
function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function isEmpty(totals: Totals): boolean {
  return totals.incomeCents === 0 && totals.spendingCents === 0;
}

function formatChange(changeCents: number, comparison: Comparison): string {
  const previousName = formatMonthName(comparison.previousMonth);
  if (isEmpty(comparison.previous)) return `no transactions in ${previousName}`;
  if (changeCents === 0) return `no change vs ${previousName}`;
  const arrow = changeCents > 0 ? '↑' : '↓';
  return `${arrow} ${formatMoney(Math.abs(changeCents), comparison.currency)} vs ${previousName}`;
}

export default function OverviewPage() {
  const [view, setView] = useState<View>({ status: 'loading', comparison: null });
  const [requested, setRequested] = useState<string | undefined>(undefined);
  const [latestMonth, setLatestMonth] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // month undefined means "the latest month with transactions", which the server picks.
  async function fetchMonth(month: string | undefined, request: number) {
    const result = await getComparison(month);
    if (request !== latestRequest.current) return; // a newer request replaced this one

    if (!result.ok) {
      setView({ status: 'error', code: result.code, message: result.message });
      return;
    }
    const { comparison } = result;
    if (month === undefined) {
      setLatestMonth(comparison.month);
      // The latest month always has a transaction, so an all-zero answer means there are none.
      if (isEmpty(comparison.current) && isEmpty(comparison.previous)) {
        setView({ status: 'empty' });
        return;
      }
    }
    setView({ status: 'ready', comparison });
  }

  function load(month?: string) {
    const request = ++latestRequest.current;
    setRequested(month);
    setView((previous) => ({
      status: 'loading',
      comparison: previous.status === 'ready' || previous.status === 'loading' ? previous.comparison : null,
    }));
    void fetchMonth(month, request);
  }

  // The view starts as "loading", so the first request needs no state change before it.
  useEffect(() => {
    void fetchMonth(undefined, ++latestRequest.current);
  }, []);

  const shown = view.status === 'ready' || view.status === 'loading' ? view.comparison : null;
  const busy = view.status === 'loading';

  return (
    <section>
      <h2>Overview</h2>

      {view.status === 'empty' && (
        <p>No transactions yet. Import a CSV file below to see your overview.</p>
      )}

      {view.status === 'error' && (
        <>
          <p role="alert" style={{ color: 'crimson' }}>
            {view.code === 'rates-unavailable' ? RATES_UNAVAILABLE_MESSAGE : view.message}
          </p>
          <button type="button" onClick={() => load(requested)}>
            Retry
          </button>
        </>
      )}

      {shown && (
        <>
          <div>
            <button type="button" disabled={busy} onClick={() => load(shown.previousMonth)}>
              Previous month
            </button>
            <button
              type="button"
              disabled={busy || shown.month === latestMonth}
              onClick={() => load(nextMonth(shown.month))}
            >
              Next month
            </button>
          </div>
          <h3>
            {formatMonth(shown.month)} · {shown.currency}
          </h3>
        </>
      )}

      {view.status === 'loading' && <p role="status">Loading…</p>}

      {view.status === 'ready' && (
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span hidden>Measure</span>
              </th>
              <th scope="col">{formatMonthName(view.comparison.month)}</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Income</th>
              <td>{formatMoney(view.comparison.current.incomeCents, view.comparison.currency)}</td>
              <td>{formatChange(view.comparison.change.incomeCents, view.comparison)}</td>
            </tr>
            <tr>
              <th scope="row">Spent</th>
              <td>{formatMoney(view.comparison.current.spendingCents, view.comparison.currency)}</td>
              <td>{formatChange(view.comparison.change.spendingCents, view.comparison)}</td>
            </tr>
            <tr>
              <th scope="row">Saved</th>
              <td>{formatMoney(view.comparison.current.netCents, view.comparison.currency)}</td>
              <td>{formatChange(view.comparison.change.netCents, view.comparison)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
