import { nextMonth } from '../lib/months';

type MonthNavProps = {
  month: string; // YYYY-MM shown now
  previousMonth: string; // YYYY-MM
  latestMonth: string | null; // the month the page opened on; "next month" stops there
  busy: boolean;
  onSelect: (month: string) => void;
};

export default function MonthNav({ month, previousMonth, latestMonth, busy, onSelect }: MonthNavProps) {
  return (
    <div>
      <button type="button" disabled={busy} onClick={() => onSelect(previousMonth)}>
        Previous month
      </button>
      <button
        type="button"
        disabled={busy || month === latestMonth}
        onClick={() => onSelect(nextMonth(month))}
      >
        Next month
      </button>
    </div>
  );
}
