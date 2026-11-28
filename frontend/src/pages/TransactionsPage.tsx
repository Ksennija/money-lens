import { useState } from "react";
import { Link } from "react-router-dom";
import { getTransactions, type Transaction } from "../api/transactions";
import CategoryFilter from "../components/CategoryFilter/CategoryFilter";
import MonthNav from "../components/MonthNav/MonthNav";
import {
  useMonthNavigation,
  type MonthResult,
} from "../hooks/useMonthNavigation";
import { describeCategories } from "../lib/categories";
import { formatDate } from "../lib/dates";
import { formatMonth, previousMonth } from "../lib/months";

type MonthTransactions = { month: string; transactions: Transaction[] };

async function fetchTransactions(
  month: string | undefined
): Promise<MonthResult<MonthTransactions>> {
  const result = await getTransactions(month);
  if (!result.ok) return result;
  return {
    ok: true,
    data: { month: result.month, transactions: result.transactions },
  };
}

// Formatting only: amounts stay in the currency they were imported in.
function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100
  );
}

function visibleTransactions(
  transactions: Transaction[],
  selectedCategories: string[]
): Transaction[] {
  if (selectedCategories.length === 0) return transactions;
  return transactions.filter((t) => selectedCategories.includes(t.category));
}

export default function TransactionsPage() {
  const { view, requested, latestMonth, load } =
    useMonthNavigation(fetchTransactions);
  // Category ids to show. Empty means all.
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // The latest month always has a transaction, so an empty answer for it means there are none.
  const noTransactions =
    view.status === "ready" &&
    requested === undefined &&
    view.data.transactions.length === 0;

  const shown =
    !noTransactions && (view.status === "ready" || view.status === "loading")
      ? view.data
      : null;
  const busy = view.status === "loading";

  const visible =
    view.status === "ready"
      ? visibleTransactions(view.data.transactions, selectedCategories)
      : [];
  const monthHasTransactions =
    view.status === "ready" && view.data.transactions.length > 0;

  return (
    <div>
      <h1>Transactions</h1>

      {noTransactions && (
        <p>
          No transactions yet. Import a CSV file on the{" "}
          <Link to="/overview">Overview page</Link>.
        </p>
      )}

      {view.status === "error" && (
        <>
          <p role="alert" style={{ color: "crimson" }}>
            {view.message}
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
            previousMonth={previousMonth(shown.month)}
            latestMonth={latestMonth}
            busy={busy}
            onSelect={load}
          />
          <h2>{formatMonth(shown.month)}</h2>
          <CategoryFilter
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />
        </>
      )}

      {view.status === "loading" && <p role="status">Loading…</p>}

      {view.status === "ready" &&
        !noTransactions &&
        view.data.transactions.length === 0 && (
          <p>{`No transactions in ${formatMonth(view.data.month)}.`}</p>
        )}

      {monthHasTransactions && visible.length === 0 && (
        <p>{`No transactions in ${describeCategories(
          selectedCategories
        )} in ${formatMonth(view.data.month)}.`}</p>
      )}

      {visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Counterparty</th>
              <th scope="col">Details</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.counterparty}</td>
                <td>{t.details}</td>
                <td>{formatMoney(t.amountCents, t.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
