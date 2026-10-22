import { prisma } from './client.js';

export type StoredRate = { date: string; rate: number }; // date: YYYY-MM-DD

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export async function findRates(
  base: string,
  quote: string,
  fromDate: string,
  toDate_: string,
): Promise<StoredRate[]> {
  const rows = await prisma.exchangeRate.findMany({
    where: { base, quote, date: { gte: toDate(fromDate), lte: toDate(toDate_) } },
    select: { date: true, rate: true },
  });
  return rows.map((row) => ({ date: row.date.toISOString().slice(0, 10), rate: row.rate }));
}

// Rates already stored are kept, so concurrent requests for the same day cannot conflict.
export async function saveRates(base: string, quote: string, rates: StoredRate[]): Promise<void> {
  if (rates.length === 0) return;
  await prisma.exchangeRate.createMany({
    data: rates.map((r) => ({ base, quote, date: toDate(r.date), rate: r.rate })),
    skipDuplicates: true,
  });
}
