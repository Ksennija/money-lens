import type { ParsedRow } from '../domain/transactions/parseBankCsv.js';
import { prisma } from './client.js';

export type ImportTransactionsResult = { imported: number; duplicates: number };

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function duplicateKey(date: string, amountCents: number, counterparty: string, details: string) {
  return `${date}|${amountCents}|${normalize(`${counterparty} ${details}`)}`;
}

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

// A row is a duplicate when the user already has a transaction with the same date, amount and
// description from an earlier import. Identical rows inside one file are all imported.
// createMany is a single INSERT, so the new rows are stored all together or not at all.
export async function importTransactions(
  userId: string,
  rows: ParsedRow[],
): Promise<ImportTransactionsResult> {
  if (rows.length === 0) return { imported: 0, duplicates: 0 };

  const dates = rows.map((row) => row.date).sort();
  const existing = await prisma.transaction.findMany({
    where: { userId, date: { gte: toDate(dates[0]), lte: toDate(dates[dates.length - 1]) } },
    select: { date: true, amountCents: true, counterparty: true, details: true },
  });
  const existingKeys = new Set(
    existing.map((t) =>
      duplicateKey(t.date.toISOString().slice(0, 10), t.amountCents, t.counterparty, t.details),
    ),
  );

  const newRows = rows.filter(
    (row) => !existingKeys.has(duplicateKey(row.date, row.amountCents, row.counterparty, row.details)),
  );

  if (newRows.length > 0) {
    await prisma.transaction.createMany({
      data: newRows.map((row) => ({
        userId,
        date: toDate(row.date),
        amountCents: row.amountCents,
        currency: row.currency,
        counterparty: row.counterparty,
        details: row.details,
      })),
    });
  }

  return { imported: newRows.length, duplicates: rows.length - newRows.length };
}

export type TransactionAmount = { date: string; amountCents: number; currency: string };

// Transactions from startDate (inclusive) to endDate (exclusive), both YYYY-MM-DD.
export async function findTransactionAmounts(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<TransactionAmount[]> {
  const rows = await prisma.transaction.findMany({
    where: { userId, date: { gte: toDate(startDate), lt: toDate(endDate) } },
    select: { date: true, amountCents: true, currency: true },
  });
  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    amountCents: row.amountCents,
    currency: row.currency,
  }));
}
