export type RejectedRow = { row: number; reason: string };

export type ImportResult =
  | { ok: true; imported: number; duplicates: number; rejected: RejectedRow[] }
  | { ok: false; code: string; message: string };

const SERVER_ERROR: ImportResult = {
  ok: false,
  code: 'server-error',
  message: 'Something went wrong',
};

function isRejectedRow(value: unknown): value is RejectedRow {
  const row = value as RejectedRow | null;
  return typeof row?.row === 'number' && typeof row?.reason === 'string';
}

export async function importTransactions(file: File): Promise<ImportResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    // No Content-Type header: the browser sets multipart/form-data with its boundary.
    const res = await fetch('/api/transactions/import', { method: 'POST', body: formData });
    const body = await res.json();

    if (res.ok) {
      if (
        typeof body?.imported !== 'number' ||
        typeof body?.duplicates !== 'number' ||
        !Array.isArray(body?.rejected) ||
        !body.rejected.every(isRejectedRow)
      ) {
        return SERVER_ERROR;
      }
      return { ok: true, imported: body.imported, duplicates: body.duplicates, rejected: body.rejected };
    }

    if (typeof body?.code !== 'string' || typeof body?.message !== 'string') {
      return SERVER_ERROR;
    }
    return { ok: false, code: body.code, message: body.message };
  } catch {
    return SERVER_ERROR;
  }
}
