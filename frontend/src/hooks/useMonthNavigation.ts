import { useEffect, useRef, useState } from 'react';

export type MonthResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export type MonthView<T> =
  | { status: 'loading'; data: T | null } // data: the month still on screen
  | { status: 'ready'; data: T }
  | { status: 'error'; code: string; message: string };

// Loads one month at a time. A request without a month means "the latest month with transactions",
// which the server picks. A response that a newer request has replaced is ignored.
export function useMonthNavigation<T extends { month: string }>(
  fetchMonth: (month: string | undefined) => Promise<MonthResult<T>>,
) {
  const [view, setView] = useState<MonthView<T>>({ status: 'loading', data: null });
  const [requested, setRequested] = useState<string | undefined>(undefined);
  const [latestMonth, setLatestMonth] = useState<string | null>(null);
  const latestRequest = useRef(0);

  async function run(month: string | undefined, request: number) {
    const result = await fetchMonth(month);
    if (request !== latestRequest.current) return; // a newer request replaced this one

    if (!result.ok) {
      setView({ status: 'error', code: result.code, message: result.message });
      return;
    }
    if (month === undefined) setLatestMonth(result.data.month);
    setView({ status: 'ready', data: result.data });
  }

  function load(month?: string) {
    const request = ++latestRequest.current;
    setRequested(month);
    setView((previous) => ({
      status: 'loading',
      data: previous.status === 'ready' || previous.status === 'loading' ? previous.data : null,
    }));
    void run(month, request);
  }

  // The view starts as "loading", so the first request needs no state change before it.
  useEffect(() => {
    void run(undefined, ++latestRequest.current);
  }, []);

  return { view, requested, latestMonth, load };
}
