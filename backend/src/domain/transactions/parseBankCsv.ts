import { CsvError } from 'csv-parse';
import { parse } from 'csv-parse/sync';

export type RejectReason =
  | 'invalid-date'
  | 'invalid-amount'
  | 'invalid-currency'
  | 'empty-description';

export type ParsedRow = {
  date: string; // YYYY-MM-DD
  amountCents: number;
  currency: string;
  counterparty: string;
  details: string;
};

export type RejectedRow = { row: number; reason: RejectReason };

export type ParseResult =
  | { malformed: true }
  | { missingColumns: string[] }
  | { rows: ParsedRow[]; rejected: RejectedRow[] };

const REQUIRED_COLUMNS = ['Booking date', 'Counterparty', 'Details', 'Amount', 'Currency'] as const;

const DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const AMOUNT_PATTERN = /^(-?)(\d+)(?:,(\d{1,2}))?$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

function parseDate(value: string): string | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

// Works on the digits of the string, never on floats, so -0,10 is exactly -10 cents.
function parseAmountCents(value: string): number | null {
  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return null;
  const [, sign, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return (sign === '-' ? -cents : cents) + 0; // + 0 turns -0 into 0
}

export function parseBankCsv(text: string): ParseResult {
  let records: { record: string[]; info: { lines: number } }[];
  try {
    // With `info: true` each record is wrapped as { record, info }; csv-parse's types don't model that.
    records = parse(text, {
      delimiter: ';',
      bom: true,
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
      info: true,
    }) as unknown as typeof records;
  } catch (error) {
    if (error instanceof CsvError) return { malformed: true };
    throw error;
  }

  if (records.length === 0) return { missingColumns: [...REQUIRED_COLUMNS] };

  const header = records[0].record.map((name) => name.toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((name) => !header.includes(name.toLowerCase()));
  if (missingColumns.length > 0) return { missingColumns };

  const column = Object.fromEntries(
    REQUIRED_COLUMNS.map((name) => [name, header.indexOf(name.toLowerCase())]),
  ) as Record<(typeof REQUIRED_COLUMNS)[number], number>;

  const rows: ParsedRow[] = [];
  const rejected: RejectedRow[] = [];

  for (const { record, info } of records.slice(1)) {
    const row = info.lines;
    const value = (name: (typeof REQUIRED_COLUMNS)[number]) => record[column[name]] ?? '';

    const date = parseDate(value('Booking date'));
    if (!date) {
      rejected.push({ row, reason: 'invalid-date' });
      continue;
    }
    const amountCents = parseAmountCents(value('Amount'));
    if (amountCents === null) {
      rejected.push({ row, reason: 'invalid-amount' });
      continue;
    }
    if (!CURRENCY_PATTERN.test(value('Currency'))) {
      rejected.push({ row, reason: 'invalid-currency' });
      continue;
    }
    const counterparty = value('Counterparty');
    const details = value('Details');
    if (counterparty === '' && details === '') {
      rejected.push({ row, reason: 'empty-description' });
      continue;
    }

    rows.push({
      date,
      amountCents,
      currency: value('Currency').toUpperCase(),
      counterparty,
      details,
    });
  }

  return { rows, rejected };
}
