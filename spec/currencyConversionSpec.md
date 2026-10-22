# Title

The system can convert transaction amounts between currencies using cached daily exchange rates

## Context

The CSV import stores each transaction in its own currency and does not convert (see `csvImportSpec.md`). Comparing months or summing spending needs every amount in one currency, so a conversion service is required. Rates come from the free Frankfurter API (`https://api.frankfurter.dev/v2/rates`): no API key, no quota, but requests are rate-limited without a published number, and the project asks users to keep traffic light by storing observations locally. Daily rates for past days never change, so each one needs to be fetched only once.

This is a backend service used by other features. It has no HTTP endpoint and no UI.

## Scope

- Look up the exchange rate between two currencies for a given day
- Convert a signed amount in cents using the rate of the transaction's day
- Cache past rates in the database so each (day, base, quote) is fetched from the API at most once
- Fetch all missing days of one request in a single API call

## Behaviour

Service: `src/services/currencyConversionService.ts`. Dates are `YYYY-MM-DD`. Currency codes are case-insensitive and normalized to upper case.

| Function | Result |
| --- | --- |
| `getRate(from, to, date)` | Rate for one day: 1 unit of `from` = rate units of `to` |
| `getRates(from, to, dates[])` | Map of date to rate for all given days (duplicates ignored) |
| `convertCents(amountCents, from, to, date)` | Amount in cents of the `to` currency |

- **Same currency:** the rate is 1, nothing is read from the database or the API
- **Cache hit:** a rate stored in the database is returned without calling the API
- **Cache miss:** all missing days are fetched with one request covering their earliest to latest date, then stored. Days in between that were not asked for are stored too if the API returns them
- **Today and later:** a rate for today is returned but not stored, because it can still change during the day. Past rates are stored
- **Rounding:** the converted amount is rounded to whole cents, half away from zero, so a refund converts to exactly the negative of the matching payment. Amounts are never stored as floating point; the rate is the only decimal value
- **Weekends and holidays:** the API returns a rate for every calendar day, so no fallback to a previous business day is needed

## Errors

| Case | Error |
| --- | --- |
| Code is not exactly three letters | `InvalidCurrencyError`, no API call |
| API answers 422 (unknown currency) | `InvalidCurrencyError` |
| API unreachable, times out (10 s) or answers 429, 5xx or any other non-OK status | `RateServiceError` |
| API response has no rate for a requested day | `RateServiceError` naming the days |

When any error occurs, nothing from that call is stored.

## Data

`ExchangeRate`: date, base, quote, rate (float), fetchedAt. Primary key is (date, base, quote). Storing is idempotent: an existing rate is kept, so concurrent requests for the same day cannot fail on a duplicate.

## Configuration

- `FRANKFURTER_URL`: base URL of the rate API, default `https://api.frankfurter.dev`. Set it to point at a self-hosted instance

## Acceptance criteria

- Asking twice for the same past day calls the API once and stores one row
- Asking for three days that are not cached makes one API call; asking again for two of them plus a new day makes one more call that covers only the new day
- Converting within the same currency never calls the API
- `convertCents(-1000, 'zza', 'ZZB', day)` with rate 0.9 returns -900
- Today's rate is fetched on every call and never stored
- A day missing from the API response fails the whole call and stores nothing
- A malformed currency code is rejected before any API call

## Out of scope

- Using the service in the month-over-month comparison (needs a decision on the user's home currency)
- An HTTP endpoint or a UI for rates
- Retrying or backing off on 429 and 5xx
- Expiring or refreshing stored rates (past rates are treated as final)
- Providers other than the default blended source, and choosing a provider
- Rates for dates in the future

## Dependencies

- `ExchangeRate` table (migration `20261020120000_add_exchange_rate`), which has to be applied to the database
- CSV import (done) as the source of transactions in different currencies

## Open questions

- Which currency is the user's home currency, and is it a user setting or inferred from the most common transaction currency?
- A single date range request also returns the days between far-apart dates (for example 2024 and 2026). Acceptable for now (one request, a few hundred rows), but could be split by gaps if imports get large
- Should a `RateServiceError` during import be surfaced to the user, or should the transaction be kept unconverted and retried later?
- Rates are stored as floats; if converted totals ever have to match a bank to the cent, a decimal type may be needed
