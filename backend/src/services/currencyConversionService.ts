import { findLatestRateBefore, findRates, saveRates, type StoredRate } from '../db/exchangeRateRepository.js';
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

// How far back a cached rate may be used when the API has none for a day.
const MAX_FALLBACK_DAYS = 7;

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export type ResolvedRates = {
  rates: Map<string, number>;
  approximateDays: Set<string>; // days that use an older cached rate because the API had none
};

async function resolveRates(
  from: string,
  to: string,
  dates: string[],
  fetchRates: FetchRates,
  allowFallback: boolean,
): Promise<ResolvedRates> {
  const base = normalizeCurrency(from);
  const quote = normalizeCurrency(to);
  const uniqueDates = [...new Set(dates)].sort();
  const result = new Map<string, number>();
  const approximateDays = new Set<string>();
  if (uniqueDates.length === 0) return { rates: result, approximateDays };

  if (base === quote) {
    uniqueDates.forEach((date) => result.set(date, 1));
    return { rates: result, approximateDays };
  }

  const cached = await findRates(base, quote, uniqueDates[0], uniqueDates[uniqueDates.length - 1]);
  cached.forEach(({ date, rate }) => result.set(date, rate));

  const missing = uniqueDates.filter((date) => !result.has(date));
  if (missing.length === 0) return { rates: result, approximateDays };

  let fetched: StoredRate[] = [];
  try {
    fetched = await fetchRates(base, quote, missing[0], missing[missing.length - 1]);
  } catch (error) {
    // Only a failed rate service may be covered by an older rate, never a bad currency code.
    if (!allowFallback || !(error instanceof RateServiceError)) throw error;
  }
  const fetchedByDate = new Map<string, StoredRate>(fetched.map((r) => [r.date, r]));
  const unavailable = missing.filter((date) => !fetchedByDate.has(date));
  if (unavailable.length > 0 && !allowFallback) {
    throw new RateServiceError(`No ${base}/${quote} rate available for ${unavailable.join(', ')}`);
  }

  await saveRates(
    base,
    quote,
    fetched.filter((r) => r.date < today()),
  );
  missing.forEach((date) => {
    const rate = fetchedByDate.get(date);
    if (rate) result.set(date, rate.rate);
  });

  // An older rate is used for the day only and never stored, so the real rate is cached later.
  for (const date of unavailable) {
    const older = await findLatestRateBefore(base, quote, date, shiftDays(date, -MAX_FALLBACK_DAYS));
    if (!older) throw new RateServiceError(`No ${base}/${quote} rate available for ${date}`);
    result.set(date, older.rate);
    approximateDays.add(date);
  }
  return { rates: result, approximateDays };
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
  return (await resolveRates(from, to, dates, fetchRates, false)).rates;
}

// Like getRates, but a day the API has no rate for uses the newest cached rate of the pair from
// the 7 days before it, and is reported in approximateDays. Fails when there is no such rate.
export async function getRatesWithFallback(
  from: string,
  to: string,
  dates: string[],
  fetchRates: FetchRates = fetchRatesFromFrankfurter,
): Promise<ResolvedRates> {
  return resolveRates(from, to, dates, fetchRates, true);
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
