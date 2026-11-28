import styles from "./TransactionTabs.module.scss";

export type TransactionType = "all" | "income" | "expense";

const TABS: Array<{ type: TransactionType; label: string }> = [
  { type: "all", label: "All" },
  { type: "income", label: "Income" },
  { type: "expense", label: "Expenses" },
];

type TransactionTabsProps = {
  value: TransactionType; // the selected tab
  onChange: (type: TransactionType) => void;
};

function cx(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

// The All / Income / Expenses tabs of frontend/design/transactions.html. They are toggle buttons
// in a group, and the selected one is announced as pressed. The component only shows and reports
// the choice; the page decides what each type means for its list.
export default function TransactionTabs({ value, onChange }: TransactionTabsProps) {
  return (
    <div role="group" aria-label="Transaction type" className={styles.tabs}>
      {TABS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          aria-pressed={value === type}
          className={cx(styles.tab, value === type && styles.active)}
          onClick={() => onChange(type)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
