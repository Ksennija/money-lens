import { useState } from "react";
import { Link } from "react-router-dom";
import { getTransactions, type Transaction } from "../api/transactions";
import CategoryFilter from "../components/CategoryFilter/CategoryFilter";
import MonthNav from "../components/MonthNav/MonthNav";
import SearchBox from "../components/SearchBox/SearchBox";
import TransactionList from "../components/TransactionList/TransactionList";
import {
  useMonthNavigation,
  type MonthResult,
} from "../hooks/useMonthNavigation";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { describeCategories } from "../lib/categories";
import { formatMonth } from "../lib/months";
import styles from "./TransactionsPage.module.scss";

// How long the search waits after the last keystroke before it filters the list.
const SEARCH_DELAY_MS = 300;

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

// The search ignores letter case and looks in the counterparty and in the details. The text is
// already trimmed; an empty text finds everything.
function matchesSearch(transaction: Transaction, searchText: string): boolean {
  if (searchText === "") return true;
  const needle = searchText.toLocaleLowerCase();
  return (
    transaction.counterparty.toLocaleLowerCase().includes(needle) ||
    transaction.details.toLocaleLowerCase().includes(needle)
  );
}

// A transaction stays when it is in one of the checked categories (all, when none is checked)
// and matches the search. The order is the one the server sent.
function visibleTransactions(
  transactions: Transaction[],
  selectedCategories: string[],
  searchText: string
): Transaction[] {
  return transactions.filter(
    (t) =>
      (selectedCategories.length === 0 ||
        selectedCategories.includes(t.category)) &&
      matchesSearch(t, searchText)
  );
}

function describeNoMatches(
  searchText: string,
  selectedCategories: string[],
  month: string
): string {
  const where =
    selectedCategories.length > 0
      ? `${describeCategories(selectedCategories)} in ${month}`
      : month;
  return searchText === ""
    ? `No transactions in ${where}.`
    : `No transactions match "${searchText}" in ${where}.`;
}

export default function TransactionsPage() {
  const { view, requested, latestMonth, load } =
    useMonthNavigation(fetchTransactions);
  // Category ids to show. Empty means all.
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // What the user typed, and the trimmed text the list uses. The list follows the typing after a
  // short pause; clearing the box (or only spaces) shows everything at once.
  const [searchText, setSearchText] = useState("");
  const appliedSearch = useDebouncedValue(
    searchText,
    SEARCH_DELAY_MS,
    (text) => text.trim() === ""
  ).trim();

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
      ? visibleTransactions(view.data.transactions, selectedCategories, appliedSearch)
      : [];
  const monthHasTransactions =
    view.status === "ready" && view.data.transactions.length > 0;

  return (
    <div>
      <header className={styles.heading}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>Manage and track your money</p>
        </div>
        {shown && (
          <MonthNav
            month={shown.month}
            latestMonth={latestMonth}
            busy={busy}
            onSelect={load}
          />
        )}
      </header>

      {noTransactions && (
        <p className={styles.message}>
          No transactions yet. Import a CSV file on the{" "}
          <Link to="/overview">Overview page</Link>.
        </p>
      )}

      {view.status === "error" && (
        <>
          <p role="alert" className={`${styles.message} ${styles.error}`}>
            {view.message}
          </p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => load(requested)}
          >
            Retry
          </button>
        </>
      )}

      {view.status === "loading" && !shown && (
        <p role="status" className={styles.message}>
          Loading…
        </p>
      )}

      {shown && (
        <section className={styles.card} aria-labelledby="transactions-card">
          <h2 id="transactions-card" className={styles.cardTitle}>
            All transactions
          </h2>

          <div className={styles.tools}>
            <SearchBox
              value={searchText}
              onChange={setSearchText}
              label="Search transactions"
              placeholder="Search merchant or description…"
            />
            <CategoryFilter
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>

          {view.status === "loading" && (
            <p role="status" className={styles.note}>
              Loading…
            </p>
          )}

          {view.status === "ready" && view.data.transactions.length === 0 && (
            <p className={styles.note}>{`No transactions in ${formatMonth(
              view.data.month
            )}.`}</p>
          )}

          {monthHasTransactions && visible.length === 0 && (
            <p className={styles.note}>
              {describeNoMatches(
                appliedSearch,
                selectedCategories,
                formatMonth(view.data.month)
              )}
            </p>
          )}

          {visible.length > 0 && <TransactionList transactions={visible} />}
        </section>
      )}
    </div>
  );
}
