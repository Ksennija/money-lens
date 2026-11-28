import type { ReactNode } from 'react';
import { nextMonth } from '../../lib/months';
import styles from './MonthNav.module.scss';

type MonthNavProps = {
  month: string; // YYYY-MM shown now
  previousMonth: string; // YYYY-MM
  latestMonth: string | null; // the month the page opened on; "next month" stops there
  busy: boolean;
  onSelect: (month: string) => void;
  children?: ReactNode; // shown between the two buttons, e.g. the name of the month
};

export default function MonthNav({ month, previousMonth, latestMonth, busy, onSelect, children }: MonthNavProps) {
  return (
    <div className={styles.nav} role="group" aria-label="Month">
      <button type="button" className={styles.button} disabled={busy} onClick={() => onSelect(previousMonth)}>
        Previous month
      </button>
      {children}
      <button
        type="button"
        className={styles.button}
        disabled={busy || month === latestMonth}
        onClick={() => onSelect(nextMonth(month))}
      >
        Next month
      </button>
    </div>
  );
}
