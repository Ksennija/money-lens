import { useState, type SubmitEvent } from 'react';
import { importTransactions, type ImportResult } from '../../api/importTransactions';
import styles from './ImportComponent.module.scss';

const NO_FILE_RESULT: ImportResult = {
  ok: false,
  code: 'invalid-file',
  message: 'Upload a CSV file',
};

// onImported is called after every successful import, so the page behind can show the new data.
type ImportComponentProps = { onImported?: () => void };

export default function ImportComponent({ onImported }: ImportComponentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (pending) return;
    if (!file) {
      setResult(NO_FILE_RESULT);
      return;
    }
    setPending(true);
    setResult(null);
    try {
      const importResult = await importTransactions(file);
      setResult(importResult);
      if (importResult.ok) onImported?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2 className={styles.title}>Import transactions</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="csv-file" className={styles.label}>
            CSV file
          </label>
          <input
            id="csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            className={styles.input}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button type="submit" className={styles.button} disabled={pending}>
          Import
        </button>
      </form>
      {result?.ok && (
        <>
          <p role="status" className={`${styles.message} ${styles.success}`}>
            {result.imported} imported, {result.duplicates} duplicates skipped,{' '}
            {result.rejected.length} rows rejected
          </p>
          {result.rejected.length > 0 && (
            <ul className={styles.rejected}>
              {result.rejected.map(({ row, reason }) => (
                <li key={row}>
                  Row {row}: {reason.replace(/-/g, ' ')}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {result && !result.ok && (
        <p role="alert" className={`${styles.message} ${styles.error}`}>
          {result.message}
        </p>
      )}
    </section>
  );
}
