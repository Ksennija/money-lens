import { useEffect, useState } from 'react';
import { getTransactions, type Transaction } from '../api/transactions';

export const RECENT_COUNT = 3;

export type RecentView =
  | { status: 'loading' }
  | { status: 'ready'; transactions: Transaction[] }
  | { status: 'error' };

// The newest transactions of one month. The server sends a month newest first, so the first few
// are the newest. Without a month nothing is requested.
export function useRecentTransactions(month: string | null): RecentView {
  const [loaded, setLoaded] = useState<{ month: string; view: RecentView } | null>(null);

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    getTransactions(month).then((result) => {
      if (cancelled) return;
      const view: RecentView = result.ok
        ? { status: 'ready', transactions: result.transactions.slice(0, RECENT_COUNT) }
        : { status: 'error' };
      setLoaded({ month, view });
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  // An answer for another month is old: show "loading" until the one for this month arrives.
  return loaded && loaded.month === month ? loaded.view : { status: 'loading' };
}
