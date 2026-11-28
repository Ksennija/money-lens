import { formatMonth, nextMonth, previousMonth } from '../../lib/months';
import styles from './MonthNav.module.scss';

type MonthNavProps = {
  month: string; // YYYY-MM shown now
  latestMonth: string | null; // the month the page opened on; "next month" stops there
  busy: boolean;
  onSelect: (month: string) => void;
  suffix?: string; // added after the name of the month, e.g. "· EUR"
};

// The month control of the Overview and the Transactions page, as in the designs: Previous month,
// the name of the month in the middle, Next month. It works out the neighbouring months and the
// name from the month it is given, so a page only says which month is shown.
export default function MonthNav({ month, latestMonth, busy, onSelect, suffix }: MonthNavProps) {
  const name = suffix ? `${formatMonth(month)} ${suffix}` : formatMonth(month);

  return (
    <div className={styles.nav} role="group" aria-label="Month">
      <button type="button" className={styles.button} disabled={busy} onClick={() => onSelect(previousMonth(month))}>
        Previous month
      </button>
      <h2 className={styles.name}>{name}</h2>
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
