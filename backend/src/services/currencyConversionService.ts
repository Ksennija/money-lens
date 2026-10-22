import { findRates, saveRates, type StoredRate } from '../db/exchangeRateRepository.js';
import { convertAmountCents } from '../domain/currency/convertAmount.js';
import {
  fetchRatesFromFrankfurter,
  InvalidCurrencyError,
  RateServiceError,
  type FetchRates,
} from './frankfurterClient.js';

export { InvalidCurrencyError, RateServiceError };

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function normalizeCurrency(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!CURRENCY_PATTERN.test(upper)) throw new InvalidCurrencyError(`Invalid currency: ${code}`);
  return upper;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Gets the rate for each requested day (YYYY-MM-DD): from the database when cached, otherwise
// with a single API request covering all missing days. Today's rate is not cached because it can
// still change during the day; past rates never change.
export async function getRates(
  from: string,
  to: string,
  dates: string[],
  fetchRates: FetchRates = fetchRatesFromFrankfurter,
): Promise<Map<string, number>> {
  const base = normalizeCurrency(from);
  const quote = normalizeCurrency(to);
  const uniqueDates = [...new Set(dates)].sort();
  const result = new Map<string, number>();
  if (uniqueDates.length === 0) return result;

  if (base === quote) {
    uniqueDates.forEach((date) => result.set(date, 1));
    return result;
  }

  const cached = await findRates(base, quote, uniqueDates[0], uniqueDates[uniqueDates.length - 1]);
  cached.forEach(({ date, rate }) => result.set(date, rate));

  const missing = uniqueDates.filter((date) => !result.has(date));
  if (missing.length === 0) return result;

  const fetched = await fetchRates(base, quote, missing[0], missing[missing.length - 1]);
  const fetchedByDate = new Map<string, StoredRate>(fetched.map((r) => [r.date, r]));
  const unavailable = missing.filter((date) => !fetchedByDate.has(date));
  if (unavailable.length > 0) {
    throw new RateServiceError(`No ${base}/${quote} rate available for ${unavailable.join(', ')}`);
  }

  await saveRates(
    base,
    quote,
    fetched.filter((r) => r.date < today()),
  );
  missing.forEach((date) => result.set(date, fetchedByDate.get(date)!.rate));
  return result;
}

export async function getRate(
  from: string,
  to: string,
  date: string,
  fetchRates?: FetchRates,
): Promise<number> {
  return (await getRates(from, to, [date], fetchRates)).get(date)!;
}

export async function convertCents(
  amountCents: number,
  from: string,
  to: string,
  date: string,
  fetchRates?: FetchRates,
): Promise<number> {
  return convertAmountCents(amountCents, await getRate(from, to, date, fetchRates));
}
