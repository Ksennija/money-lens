import { getComparison, type Comparison, type Totals } from '../api/comparison';
import MonthNav from '../components/MonthNav';
import { useMonthNavigation, type MonthResult } from '../hooks/useMonthNavigation';
import { formatMonth, formatMonthName } from '../lib/months';

const RATES_UNAVAILABLE_MESSAGE = 'Exchange rates are currently unavailable. Try again in a moment.';

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

async function fetchComparison(month: string | undefined): Promise<MonthResult<Comparison>> {
  const result = await getComparison(month);
  return result.ok ? { ok: true, data: result.comparison } : result;
}

export default function OverviewPage() {
  const { view, requested, latestMonth, load } = useMonthNavigation(fetchComparison);

  // The latest month always has a transaction, so an all-zero answer for it means there are none.
  const noTransactions =
    view.status === 'ready' &&
    requested === undefined &&
    isEmpty(view.data.current) &&
    isEmpty(view.data.previous);

  const shown = !noTransactions && (view.status === 'ready' || view.status === 'loading') ? view.data : null;
  const busy = view.status === 'loading';

  return (
    <section>
      <h2>Overview</h2>

      {noTransactions && <p>No transactions yet. Import a CSV file below to see your overview.</p>}

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
          <MonthNav
            month={shown.month}
            previousMonth={shown.previousMonth}
            latestMonth={latestMonth}
            busy={busy}
            onSelect={load}
          />
          <h3>
            {formatMonth(shown.month)} · {shown.currency}
          </h3>
        </>
      )}

      {view.status === 'loading' && <p role="status">Loading…</p>}

      {view.status === 'ready' && !noTransactions && (
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span hidden>Measure</span>
              </th>
              <th scope="col">{formatMonthName(view.data.month)}</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Income</th>
              <td>{formatMoney(view.data.current.incomeCents, view.data.currency)}</td>
              <td>{formatChange(view.data.change.incomeCents, view.data)}</td>
            </tr>
            <tr>
              <th scope="row">Spent</th>
              <td>{formatMoney(view.data.current.spendingCents, view.data.currency)}</td>
              <td>{formatChange(view.data.change.spendingCents, view.data)}</td>
            </tr>
            <tr>
              <th scope="row">Saved</th>
              <td>{formatMoney(view.data.current.netCents, view.data.currency)}</td>
              <td>{formatChange(view.data.change.netCents, view.data)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
