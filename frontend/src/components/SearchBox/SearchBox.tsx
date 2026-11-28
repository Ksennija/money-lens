import styles from "./SearchBox.module.scss";

type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  label: string; // the accessible name, e.g. "Search transactions"
  placeholder?: string;
};

// A search field as in frontend/design/transactions.html: a magnifier icon in front of a text
// input. It only shows and reports the text; the page decides what to search and when.
export default function SearchBox({
  value,
  onChange,
  label,
  placeholder,
}: SearchBoxProps) {
  return (
    <div className={styles.search}>
      <span className={styles.icon} aria-hidden="true">
        ⌕
      </span>
      <input
        type="search"
        className={styles.input}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
