# Title

Overview and Insights use the latest cached exchange rate when the rate service is unavailable

**Type:** Improvement

## Context

`GET /api/comparison` and `GET /api/category-changes` convert every foreign-currency transaction with the rate of its own booking day (`currencyConversionService.ts`). Past rates are cached forever once fetched, so a rate is missing only for:

- days that were never fetched, for example the first load after an import
- today, because today's rate is never cached

If the Frankfurter API fails for one of those days, the whole request fails with 502 `rates-unavailable`, and the user sees "Exchange rates are currently unavailable". A user with a transaction dated today in a foreign currency hits the API on every load, so a short outage breaks the page even when nearly all rates are cached.

## Scope

- When the API cannot give a rate for a day, use the nearest earlier cached rate of the same currency pair instead of failing
- Tell the user that the numbers use an older rate
- Applies to both endpoints (overview totals and category changes)

## Behaviour

- **When it applies:** only for days where the API call failed, or returned no rate for that day. Days with a cached rate or a fetched rate stay exact
- **Which rate:** the latest cached rate of the same base and quote that is dated before the missing day, at most 7 days earlier
- **Not stored:** a fallback rate is never saved. When the API works again, the day gets its real rate and that is cached
- **No usable rate:** if no cached rate of the pair exists within 7 days, the request still fails with 502 `rates-unavailable` as today
- **Same currency:** unchanged, the rate is 1 and nothing is looked up
- **Response:** both success bodies get `ratesApproximate`, `true` when at least one day used a fallback rate, otherwise `false`
- **Frontend:** when `ratesApproximate` is `true`, the overview and the Insights page show a short notice, for example "Some amounts use an older exchange rate because current rates are unavailable."
- **Service:** `getRates` reports which days used a fallback. The two services pass that on to their routes

## Acceptance criteria

1. The API fails for today, and the rate of yesterday is cached. The overview returns 200, converts today's transaction at yesterday's rate, and `ratesApproximate` is `true`
2. The API works and every rate is available. `ratesApproximate` is `false` and the totals are the same as before this change
3. The API fails and the last cached rate is 8 days old. The response is 502 `rates-unavailable`
4. The API fails and no rate of the pair is cached. The response is 502 `rates-unavailable`
5. A fallback rate is not stored. After a failed call, the exchange rate table has no new row, and the next call with a working API stores and uses the real rate
6. The API returns rates for some missing days and not for others. The returned days are exact and stored, and the missing days use the fallback
7. The same behaviour applies to `GET /api/category-changes`, so category changes and the overview agree during an outage
8. The Insights page and the overview show the notice only when `ratesApproximate` is `true`
9. A transaction in the reporting currency never causes the notice

## Out of scope

- A retry of the API call before the fallback is used
- A currency dropdown (a separate ticket)
- Approximate rates when the pair has no cached rate at all, for example a brand-new user
- A background job that refreshes rates

## Open questions

- Is 7 days the right limit? A rate that old can differ noticeably from the real one
- `monthComparisonSpec.md` and `currencyConversionSpec.md` say a month's totals do not change when rates move later. This ticket breaks that promise for approximate totals, so the specs must say so
- Should the notice show how old the rate is, for example "rate from 3 days ago", or only that it is approximate?
- Should the route test for 502 (still missing) be written together with this ticket, since it changes when 502 happens?
