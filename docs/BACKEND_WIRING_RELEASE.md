# PlayVanta backend wiring — verified backend/API release

**Status:** Backend/API release verified on 2026-09-10  
**Scope decision:** Ship the prediction backend and API integration while keeping Discover explicitly **Polymarket research only**. Prediction trade ticket/portfolio-history UI and the rank-detail ladder remain follow-up work; this document does not represent them as shipped browser features.

## Product decisions carried into this release

1. **Diamond is 40% portfolio-relative return.**
2. **Prediction positions support early close:** partial sale or `close_all`, at the live outcome price. Proceeds are `shares × live price`; realized P&L is compared with average cost. No short positions are supported.
3. **Rank detail is opt-in:** leaderboard rows remain lean; tier, division, movement, and rank points are available from the dedicated authenticated rank-detail API.

## Hosted database verification

Applied `supabase/20260909_predictions.sql` to the hosted Supabase project through the checked-in Management API migration runner.

- **16/16 SQL statements succeeded.**
- Verified through PostgREST: `prediction_markets`, `prediction_positions`, and `prediction_fills` each returned **HTTP 200**.
- Verified PostgreSQL policies:
  - `prediction_markets`: public catalog `SELECT` only.
  - `prediction_positions`: owner-scoped `SELECT` policy.
  - `prediction_fills`: owner-scoped `SELECT` policy.

### Configuration correction discovered during E2E

The local non-versioned `SUPABASE_SERVICE_ROLE_KEY` was configured with an `anon` JWT role, causing `/api/predictions/refresh` catalog upserts to fail RLS. It was replaced locally with the project’s `service_role` credential and verified as `role=service_role` without logging credential material.

**Deployment requirement:** before deploying this backend, verify Vercel’s `SUPABASE_SERVICE_ROLE_KEY` is the actual **service-role** key, not the anon/publishable key. The migration tables are already present in the hosted database.

## Automated verification

Executed after the final code changes:

```text
npx tsc --noEmit
# exit 0

npm test
# tests 45
# pass 45
# fail 0
# duration_ms 1196.7685

node --experimental-strip-types scripts/test-instrument-catalog.mjs
# PASS 'fed' surfaces the Fed-cut prediction market
# PASS 'aapl' still returns AAPL first even with predictions in the pool
# ALL PASS

npm run build
# ✓ Compiled successfully in 12.3s
# ✓ Generating static pages (28/28)
# Finalizing page optimization ...
# Collecting build traces ...
```

The optimized build registers the prediction routes, including:

- `GET /api/prediction-markets`
- `GET /api/prediction-markets/[id]/history`
- `POST /api/predictions/trade`
- `POST /api/predictions/close`
- `POST /api/predictions/refresh`
- `GET /api/rank`
- daily `predictions` and `predictions-settle` cron routes

## Live authenticated E2E transcript

Performed on `http://localhost:3003` using a disposable account against the hosted Supabase database and live Polymarket data.

| Step | Verified result |
| --- | --- |
| Sign-up and provisioning | Disposable account created and redirected to `/dashboard`; paper balance was `$10,000`. |
| Stock browser flow | Discover → AAPL workspace → `$10` UI order. Visible receipt: **0.0317 AAPL filled at $315.34**; buying power showed `$9,990.00`. |
| Catalog refresh | Authenticated `POST /api/predictions/refresh` returned **200**, `synced: 200`, `settled: { marketsChecked: 0, marketsResolved: 0, payouts: 0 }`. |
| Catalog pricing | `GET /api/prediction-markets` returned 20 entries. Tested Fed decision market at **YES $0.455 / NO $0.545**. |
| Prediction buy | Authenticated `$10` YES buy returned **21.97 shares**, cost `$10`, price `$0.455`, cash `$9,990`; `/api/me` showed the open prediction position, live prediction value, and buy fill. |
| Idempotency | Replaying the same `client_order_id` returned `duplicate: true` and kept cash at `$9,990`. |
| Partial early sell | Sold **5 shares**. Response: proceeds `$2.28`, realized P&L `$0`, cash `$9,992.28`, position remaining **16.97 shares**. `/api/me` included the sell fill. |
| Close all / Max behavior | `close_all: true` sold the remaining **16.97 shares**, proceeds `$7.72`, cash `$10,000`, `closed: true`; no prediction position remained. |
| Combined equity | `/api/me` folded prediction market value into `account.equity` while the position was open, then returned prediction value to `0` after close-all. |
| Unified search | `GET /api/instruments/search?q=fed` returned a prediction result with `assetClass: "prediction"`, canonical `marketId`, and an `https://polymarket.com/event/...` URL. |
| Search click | Browser test captured exactly one `window.open` call to the expected Polymarket event URL. A regression test prevents falling back solely to the featured-card cache. |
| Lean leaderboard | Authenticated `/api/leaderboard` returned 32 entries; first entry had no `tier`, `division`, `movement`, or `rank_points` key. Browser rows showed no inline rank badges. |
| Rank drill-in | Tapping the E2E account’s **View rank** icon opened the popover; the endpoint returned tier, division, movement, rank points, and return percent. The current browser popover renders tier, return, and movement. |

## Scope retained as explicit follow-up

The user approved a backend/API release only. These browser items are intentionally **not** claimed as complete:

1. **Prediction ticket and portfolio/history UI:** there is no browser prediction buy/sell ticket and no Account/Settings screen that displays `prediction_positions` or `prediction_fills`. The APIs are live and verified; Discover remains research-only.
2. **Rank-detail division/ladder:** `GET /api/rank` returns `division` and `rank_points`, but the current popover renders only tier, return, and movement. Add a focused rank ladder/division detail design before presenting it as a complete rank view.

## E2E-found fixes included

Commit `549b5be` fixes two live search-to-research issues:

- Preserves the canonical Polymarket URL through unified prediction search results.
- Makes the market-page click handler use `result.url` before the featured-market cache, so valid search hits outside that cache still open research correctly.

## Release recommendation

**Safe to release as backend/API functionality** after the production environment’s service-role credential is verified. Do not market this deployment as a full in-browser prediction-trading experience until the follow-up UI items above are designed, implemented, and E2E verified.
