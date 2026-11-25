import { useEffect, useState } from "react";
import {
  getCategoryChanges,
  type CategoryChanges as CategoryChangesData,
} from "../api/categoryChanges";
import CategoryChanges from "../components/CategoryChanges/CategoryChanges";
import RatesNotice from "../components/RatesNotice/RatesNotice";

type View =
  | { status: "loading" }
  | { status: "ready"; data: CategoryChangesData }
  | { status: "error"; message: string };

const RATES_UNAVAILABLE_MESSAGE =
  "Exchange rates are currently unavailable. Try again in a moment.";

export default function InsightsPage() {
  const [view, setView] = useState<View>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCategoryChanges().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setView({ status: "ready", data: result.categoryChanges });
      } else {
        const message =
          result.code === "rates-unavailable"
            ? RATES_UNAVAILABLE_MESSAGE
            : result.message;
        setView({ status: "error", message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setView({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <main>
      <h1>Insights</h1>

      {view.status === "loading" && <p role="status">Loading…</p>}

      {view.status === "error" && (
        <>
          <p role="alert" style={{ color: "crimson" }}>
            {view.message}
          </p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </>
      )}

      {view.status === "ready" && view.data.ratesApproximate && <RatesNotice />}

      {view.status === "ready" && !view.data.hasTransactions && (
        <p>No transactions yet this month.</p>
      )}

      {view.status === "ready" &&
        view.data.hasTransactions &&
        view.data.changes.length === 0 && (
          <p>No spending changes compared to the same days last month.</p>
        )}

      {view.status === "ready" &&
        view.data.hasTransactions &&
        view.data.changes.length > 0 && (
          <CategoryChanges
            changes={view.data.changes}
            currency={view.data.currency}
          />
        )}
    </main>
  );
}
