import { Link } from "react-router-dom";
import { getComparison, type Comparison, type Totals } from "../api/comparison";
import MonthNav from "../components/MonthNav/MonthNav";
import RatesNotice from "../components/RatesNotice/RatesNotice";
import TransactionList from "../components/TransactionList/TransactionList";
import {
  useMonthNavigation,
  type MonthResult,
} from "../hooks/useMonthNavigation";
import { useRecentTransactions } from "../hooks/useRecentTransactions";
import { formatMonth, formatMonthName } from "../lib/months";
import styles from "./OverviewPage.module.scss";

const RATES_UNAVAILABLE_MESSAGE =
  "Exchange rates are currently unavailable. Try again in a moment.";

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

// Formatting only: the amounts and changes themselves are calculated by the server.
function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100
  );
}

function isEmpty(totals: Totals): boolean {
  return totals.incomeCents === 0 && totals.spendingCents === 0;
}

function formatChange(changeCents: number, comparison: Comparison): string {
  const previousName = formatMonthName(comparison.previousMonth);
  if (isEmpty(comparison.previous)) return `no transactions in ${previousName}`;
  if (changeCents === 0) return `no change vs ${previousName}`;
  const arrow = changeCents > 0 ? "↑" : "↓";
  return `${arrow} ${formatMoney(
    Math.abs(changeCents),
    comparison.currency
  )} vs ${previousName}`;
}

// The percent comes from the server, rounded to one decimal. It is null when the previous month
// had no spending to compare with.
function formatSpendingPercent(comparison: Comparison): string {
  const percent = comparison.change.spendingPercent;
  const previousName = formatMonthName(comparison.previousMonth);
  if (percent === null) {
    return isEmpty(comparison.previous)
      ? `no transactions in ${previousName}`
      : `no spending in ${previousName}`;
  }
  if (percent === 0) return "no change compared with last month";
  const arrow = percent > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(percent).toFixed(1)}% compared with last month`;
}

// "Your spending is 8.4% higher than last month." Nothing when the previous month had no spending.
function describeSpendingChange(comparison: Comparison): string | null {
  const percent = comparison.change.spendingPercent;
  if (percent === null) return null;
  if (percent === 0) return "Your spending is the same as last month.";
  const direction = percent > 0 ? "higher" : "lower";
  return `Your spending is ${Math.abs(percent).toFixed(1)}% ${direction} than last month.`;
}

// Green for good news, red for bad news. Nothing when the value did not move or there is no
// previous month to compare with. The arrow and the words carry the meaning too.
function changeTone(
  change: number, // only the sign matters: cents or percent
  comparison: Comparison,
  higherIsBetter: boolean
): string | undefined {
  if (change === 0 || isEmpty(comparison.previous)) return undefined;
  return change > 0 === higherIsBetter ? styles.good : styles.bad;
}

async function fetchComparison(
  month: string | undefined
): Promise<MonthResult<Comparison>> {
  const result = await getComparison(month);
  return result.ok ? { ok: true, data: result.comparison } : result;
}

type StatCardProps = {
  id: string;
  label: string;
  value: string;
  valueClass?: string;
  change: string;
  changeClass?: string;
};

function StatCard({
  id,
  label,
  value,
  valueClass,
  change,
  changeClass,
}: StatCardProps) {
  return (
    <article className={styles.card} aria-labelledby={id}>
      <p id={id} className={styles.label}>
        {label}
      </p>
      <p className={cx(styles.value, valueClass)}>{value}</p>
      <p className={cx(styles.change, changeClass)}>{change}</p>
    </article>
  );
}

export default function OverviewPage() {
  const { view, requested, latestMonth, load } =
    useMonthNavigation(fetchComparison);

  // The latest month always has a transaction, so an all-zero answer for it means there are none.
  const noTransactions =
    view.status === "ready" &&
    requested === undefined &&
    isEmpty(view.data.current) &&
    isEmpty(view.data.previous);

  const shown =
    !noTransactions && (view.status === "ready" || view.status === "loading")
      ? view.data
      : null;
  const busy = view.status === "loading";
  const recent = useRecentTransactions(
    view.status === "ready" && !noTransactions ? view.data.month : null
  );
  const highlight =
    view.status === "ready" && !noTransactions
      ? describeSpendingChange(view.data)
      : null;

  return (
    <section>
      <header className={styles.heading}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>A clear picture of your money</p>
        </div>
        {shown && (
          <MonthNav
            month={shown.month}
            previousMonth={shown.previousMonth}
            latestMonth={latestMonth}
            busy={busy}
            onSelect={load}
          >
            <h2 className={styles.month}>
              {formatMonth(shown.month)} · {shown.currency}
            </h2>
          </MonthNav>
        )}
      </header>

      {noTransactions && (
        <p className={styles.message}>
          No transactions yet. Import a CSV file below to see your overview.
        </p>
      )}

      {view.status === "error" && (
        <>
          <p role="alert" className={cx(styles.message, styles.error)}>
            {view.code === "rates-unavailable"
              ? RATES_UNAVAILABLE_MESSAGE
              : view.message}
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

      {shown?.ratesApproximate && <RatesNotice />}

      {view.status === "loading" && (
        <p role="status" className={styles.message}>
          Loading…
        </p>
      )}

      {view.status === "ready" && !noTransactions && (
        <>
          <div className={styles.grid}>
            <StatCard
              id="overview-income"
              label="Total income"
              value={formatMoney(
                view.data.current.incomeCents,
                view.data.currency
              )}
              valueClass={styles.positive}
              change={formatChange(view.data.change.incomeCents, view.data)}
              changeClass={changeTone(
                view.data.change.incomeCents,
                view.data,
                true
              )}
            />
            <StatCard
              id="overview-spent"
              label="Total expenses"
              value={formatMoney(
                view.data.current.spendingCents,
                view.data.currency
              )}
              change={formatChange(view.data.change.spendingCents, view.data)}
              changeClass={changeTone(
                view.data.change.spendingCents,
                view.data,
                false
              )}
            />
            <StatCard
              id="overview-saved"
              label="You saved"
              value={formatMoney(
                view.data.current.netCents,
                view.data.currency
              )}
              valueClass={
                view.data.current.netCents < 0
                  ? styles.negative
                  : styles.positive
              }
              change={formatChange(view.data.change.netCents, view.data)}
              changeClass={changeTone(
                view.data.change.netCents,
                view.data,
                true
              )}
            />
          </div>

          <article
            className={cx(styles.card, styles.wide)}
            aria-labelledby="overview-spending"
          >
            <div className={styles.between}>
              <h2 id="overview-spending" className={styles.cardTitle}>
                Spending this month
              </h2>
              <span className={styles.change}>
                vs. {formatMonthName(view.data.previousMonth)}
              </span>
            </div>
            <p className={styles.value}>
              {formatMoney(
                view.data.current.spendingCents,
                view.data.currency
              )}
            </p>
            <p
              className={cx(
                styles.change,
                changeTone(
                  view.data.change.spendingPercent ?? 0,
                  view.data,
                  false
                )
              )}
            >
              {formatSpendingPercent(view.data)}
            </p>
          </article>

          <article
            className={cx(styles.card, styles.wide)}
            aria-labelledby="overview-recent"
          >
            <div className={styles.between}>
              <h2 id="overview-recent" className={styles.cardTitle}>
                Recent transactions
              </h2>
              <Link to="/transactions">
                See all <span aria-hidden="true">→</span>
              </Link>
            </div>
            {recent.status === "loading" && (
              <p className={styles.change}>Loading…</p>
            )}
            {recent.status === "error" && (
              <p role="alert" className={styles.change}>
                Recent transactions could not be loaded.
              </p>
            )}
            {recent.status === "ready" && recent.transactions.length === 0 && (
              <p className={styles.change}>No transactions in this month</p>
            )}
            {recent.status === "ready" && recent.transactions.length > 0 && (
              <TransactionList transactions={recent.transactions} />
            )}
          </article>

          {highlight && (
            <p className={styles.highlight}>
              <strong>Spending highlight:</strong> {highlight}{" "}
              <Link to="/insights">Explore insights</Link>.
            </p>
          )}
        </>
      )}
    </section>
  );
}
