# Market Reliability, Speed & UX Implementation Plan

> **For Hermes:** Execute the slices in order; each product behavior starts with a failing test.

**Goal:** Make every stock and prediction interaction reliable, data-honest, fast, and intuitive while adding a focused set of 20 high-value product improvements.

**Architecture:** Preserve the existing Next.js + Supabase paper-trading architecture. Improve data at its source (Yahoo/Polymarket query resolution and catalog persistence), keep transaction state owned by one persistent ticket, and use lightweight browser polling with explicit freshness states rather than invented ticks.

**Tech stack:** Next.js, TypeScript, Supabase, Yahoo Finance v8 chart API, Polymarket Gamma/CLOB APIs, Recharts, Node test runner.

---

## Root causes confirmed

1. The `1h` stock chart asks Yahoo for 1-minute bars then filters against wall-clock time; outside an active session this returns no data instead of the last tradable hour.
2. The `5d`, `1mo`, and `3mo` chart selections currently request daily bars, making medium ranges unnecessarily coarse. The chart is also labelled “Illustrative” despite real upstream data.
3. Prediction catalog rows are persisted without outcome prices. A newly loaded market may therefore have a null price, disabling the ticket before the CLOB quote path completes.
4. The prediction catalog sync fetches only two 100-market pages, limiting discovery to 200 markets.
5. Catalog and order freshness should use visible status instead of silently appearing broken when a provider is slow or a user has a large position.

## The 20 improvements

### Reliability & data integrity
1. Deterministic range→interval mapping (1H/1D/1W/1M/3M/1Y).
2. Last-tradable-hour fallback for the 1H chart.
3. OHLC-aware stock graph data and honest “Market data” labeling.
4. Per-range timestamp labels and UTC-safe time formatting.
5. Chart request cancellation to prevent stale range responses replacing the selected range.
6. Quote freshness indicator with last-updated time and manual refresh.
7. Prediction quote hydration before a ticket becomes actionable.
8. Separate loading/error/ready states for prediction prices.
9. Price fallback persistence after a successful CLOB quote.
10. Robust sell-all behavior for fractional and large prediction positions.

### Discovery & prediction breadth
11. Raise sync pagination to a bounded 1,000 active binary markets.
12. Deduplicate markets by condition ID across pages.
13. Category chips and quick filters in prediction discovery.
14. Search result count and empty-state recovery action.
15. Position-first prediction filter.
16. Market countdown and resolution-status labeling.

### Faster, clearer UX
17. Optimistic in-ticket quote display with a non-blocking refresh affordance.
18. One destination owner for dashboard “Buy” actions: preconfigure the exact market/stock ticket instead of generic teleporting.
19. Keyboard-ready order input: Enter only executes the terminal transaction control after valid data.
20. Skeleton loading, stable layout dimensions, and route prefetching for market/prediction discovery.

## Delivery slices

### Slice 1 — accurate stock charts
**Files:** `src/lib/prices.ts`, `src/app/api/chart/route.ts`, `src/app/(app)/market/page.tsx`, `tests/market-data-contract.test.mjs` (new).

1. Write a red test for the chart resolution contract: 1H maps to 1m/1d and falls back to the final 60 bars; 1D maps to 5m/1d; 1W maps to 15m/5d; 1M maps to 1h/1mo; 3M/1Y map to 1d.
2. Extract an exported pure resolution helper in `prices.ts`; run that test red, then green.
3. Make `getHistoricalBars` retain the most recent hour of returned bars rather than wall-clock filtering.
4. Return metadata (`interval`, `asOf`) from `/api/chart`; label the chart “Market data”, improve time axes/tooltips, and cancel obsolete fetches.
5. Verify every endpoint returns meaningful bars for AAPL and visual-QA desktop/mobile.

### Slice 2 — prediction quote readiness and large-position closing
**Files:** `src/lib/prediction-sync.ts`, `src/lib/prediction-engine.ts`, `src/app/api/prediction-markets/route.ts`, `src/components/prediction-workspace.tsx`, `tests/prediction-sync.test.mjs`, `tests/prediction-engine.test.mjs`, `tests/predictions-web-workspace-contract.test.mjs`.

1. Red test: a catalog sync hydrates usable Yes/No prices when CLOB price data is available and leaves a valid last-known fallback on an upstream transient failure.
2. Red test: a sell-all request uses the authoritative held share count rather than a rounded browser value.
3. Implement bounded-concurrency quote hydration and persistence.
4. Raise catalog pagination to 10 pages and deduplicate IDs.
5. Surface `Loading live quote`, `Quote unavailable`, and `Live quote` states in the ticket; don’t expose a dead final CTA.
6. Refresh account/position state after a mutation, retain receipt/next action, and test the real request path.

### Slice 3 — speed and discovery UX
**Files:** `src/components/prediction-workspace.tsx`, `src/app/(app)/market/page.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/lib/live-market.ts`, relevant contract tests.

1. Add local filter/search states and result count without changing economic logic.
2. Add category chips, owned-position filter, countdown/status semantics, and empty-state recovery.
3. Make dashboard calls link to a selected instrument ticket with query parameters; no duplicate generic Buy owner.
4. Add manual refresh plus a visible freshness timestamp; preserve polling intervals under provider constraints.
5. Prefetch high-intent navigation, fixed-size skeletons, and abort stale fetches.

### Slice 4 — quality gates
1. Focused tests per slice, then `npm run typecheck && npm test && npm run build`.
2. Real signed-in browser flow: choose a prediction, wait for quote, buy, sell a large/full position, verify receipt and account refresh.
3. Inspect 1H, 1D, 1W, 1M, 3M, and 1Y stock charts at 1440px and 390px; no empty charts or overflow.
4. Test API data freshness and interaction performance via browser network and console checks.
5. Commit, push to `release/vanta-production`, wait for Git-backed `vanta` deployment, promote, alias, and verify production end-user paths.

## Risks and guardrails

- Yahoo limits intraday interval/range combinations. Keep interval mapping conservative and use the last returned tradable-hour window outside sessions rather than fabricating price points.
- CLOB may rate-limit bulk midpoint queries. Hydrate with bounded concurrency, retain a last-known valid price, and display a recoverable quote-unavailable state.
- Do not claim live execution: all trading remains paper-only and every quote shows its timestamp/source state.
- Do not expose secrets in code, plans, commits, or vault notes.
