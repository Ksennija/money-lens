import type { StoredRate } from "../db/exchangeRateRepository.js";

const BASE_URL = process.env.FRANKFURTER_URL ?? "https://api.frankfurter.dev";

export class InvalidCurrencyError extends Error {}
export class RateServiceError extends Error {}

export type FetchRates = (
  base: string,
  quote: string,
  fromDate: string,
  toDate: string
) => Promise<StoredRate[]>;

// One request returns the daily rates for the whole date range (weekends included).
export const fetchRatesFromFrankfurter: FetchRates = async (
  base,
  quote,
  fromDate,
  toDate
) => {
  const url = `${BASE_URL}/v2/rates?base=${base}&quotes=${quote}&from=${fromDate}&to=${toDate}`;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new RateServiceError("Exchange rate service is unreachable");
  }
  if (response.status === 422)
    throw new InvalidCurrencyError(`Unsupported currency: ${base}/${quote}`);
  if (!response.ok)
    throw new RateServiceError(
      `Exchange rate service returned ${response.status}`
    );

  const body = (await response.json()) as { date: string; rate: number }[];
  return body.map(({ date, rate }) => ({ date, rate }));
};
