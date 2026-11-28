import styles from './RatesNotice.module.scss';

// Not role="status": the pages already use that role for "Loading…".
export default function RatesNotice() {
  return (
    <p role="note" className={styles.notice}>
      Some amounts use an older exchange rate because current rates are unavailable.
    </p>
  );
}
