import { useState, type SubmitEvent } from 'react';
import { importTransactions, type ImportResult } from '../api/importTransactions';

const NO_FILE_RESULT: ImportResult = {
  ok: false,
  code: 'invalid-file',
  message: 'Upload a CSV file',
};

export default function ImportPage() {
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
      setResult(await importTransactions(file));
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Import transactions</h2>
      <form onSubmit={handleSubmit}>
        <label>
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={pending}>
          Import
        </button>
      </form>
      {result?.ok && (
        <>
          <p role="status">
            {result.imported} imported, {result.duplicates} duplicates skipped,{' '}
            {result.rejected.length} rows rejected
          </p>
          {result.rejected.length > 0 && (
            <ul>
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
        <p role="alert" style={{ color: 'crimson' }}>
          {result.message}
        </p>
      )}
    </section>
  );
}
