export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  counterparty: string;
  details: string;
  amountCents: number; // negative is money out
  currency: string; // the currency the transaction was imported in
};

export type TransactionsResult =
  | { ok: true; month: string; transactions: Transaction[] } // month: YYYY-MM
  | { ok: false; code: string; message: string };

const SERVER_ERROR: TransactionsResult = {
  ok: false,
  code: 'server-error',
  message: 'Something went wrong',
};

function toTransaction(value: unknown): Transaction | null {
  const item = value as Transaction | null;
  if (
    typeof item?.id !== 'string' ||
    typeof item?.date !== 'string' ||
    typeof item?.counterparty !== 'string' ||
    typeof item?.details !== 'string' ||
    typeof item?.amountCents !== 'number' ||
    typeof item?.currency !== 'string'
  ) {
    return null;
  }
  return {
    id: item.id,
    date: item.date,
    counterparty: item.counterparty,
    details: item.details,
    amountCents: item.amountCents,
    currency: item.currency,
  };
}

// Without a month the server reports the month of the user's most recent transaction.
export async function getTransactions(month?: string): Promise<TransactionsResult> {
  try {
    const res = await fetch(month ? `/api/transactions?month=${month}` : '/api/transactions');
    const body = await res.json();

    if (res.ok) {
      if (typeof body?.month !== 'string' || !Array.isArray(body?.transactions)) return SERVER_ERROR;
      const transactions = body.transactions.map(toTransaction);
      if (transactions.some((t: Transaction | null) => t === null)) return SERVER_ERROR;
      return { ok: true, month: body.month, transactions };
    }

    if (typeof body?.code !== 'string' || typeof body?.message !== 'string') {
      return SERVER_ERROR;
    }
    return { ok: false, code: body.code, message: body.message };
  } catch {
    return SERVER_ERROR;
  }
}
