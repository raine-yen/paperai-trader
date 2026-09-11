# PlayVanta — Full Backend Wiring Implementation Plan

> **For the implementer:** You have zero prior context and questionable taste — every task below names exact files, exact commands, and exact expected output. Do the tasks in order (Task 1 → 15, with Task 9b between 9 and 10). Do NOT overwrite the standalone HTML demo or the Vercel-deployed `paper-trader-mobile.html`. This plan is backend-only; the demo is the visual source of truth.

**Goal:** Turn the reviewed PlayVanta prediction/stock/crypto demo into a real, secure, persistent backend: authenticated sessions, a shared paper bankroll spanning stocks + crypto + predictions, real Polymarket-backed prediction markets with binary Yes/No settlement, a diamond rank system, and background jobs — all deployable on Vercel serverless.

**Architecture:** Next.js 15 App Router API routes (`src/app/api/**` for the browser/mobile app; `src/app/v2/**` for the Alpaca-compatible API-key surface) on top of Supabase Postgres. Client polls; the server never assumes an always-on socket. All money is virtual: $10,000 granted exactly once at account creation, no deposits/withdrawals/top-ups ever.

**Tech Stack:** Next.js 15, TypeScript, Supabase (`@supabase/supabase-js`), Zod validation, Vitest for unit/contract tests, a local Supabase instance for integration tests, Expo 54 mobile client (`mobile/App.tsx`).

**Repo:** `C:\Users\raine_5tga1yf\vanta-release`, branch `feat/search-watch-ranks-markets`.

---

## Preflight (do once, before Task 1)

**Step 1: Read the vault context (read-only).**
- Read `C:\Users\raine_5tga1yf\Documents\p14brain\Agents\_Shared\Agent P14Brain Preflight Policy.md`
- Read `C:\Users\raine_5tga1yf\Documents\p14brain\Agents\Pixel\PlayVanta Prediction Outcome Ticket Design 2026-09-09.md`
- Read `C:\Users\raine_5tga1yf\vanta-release\docs\PREDICTIONS_EXCHANGE_PLAN.md`

**Step 2: Confirm the working branch and clean baseline.**
```bash
cd C:/Users/raine_5tga1yf/vanta-release
git status --short --branch
```
Expected: `## feat/search-watch-ranks-markets` with only the already-in-progress `market/page.tsx` and `prediction-markets/route.ts` modified. Do NOT touch `paper-trader-mobile*.html` anywhere.

**Step 3: Install/confirm test tooling.**
```bash
npx tsc --noEmit
node --test tests/*.mjs
npm run build
```
Expected: all pass (this is the known-green starting point). If any fails, STOP and report — do not build on a red baseline.

---

## ✅ RESOLVED DECISIONS (locked by the user 2026-09-09)

1. **Diamond threshold = 40%.** `src/lib/ranks.ts` stays at `minPct: 40` for Diamond; the demo's 30% is superseded. Task 12 implements this with no gate.
2. **Predictions support early sell / close.** Users can exit a prediction before resolution exactly like Polymarket and Robinhood: **sell any fraction (or "Max") of held outcome shares at the current market price.** Proceeds = `sharesSold × currentPrice`; realized P&L = `proceeds − sharesSold × avg_cost`. Winning shares held to resolution still redeem at $1 (Task 10). This adds Task 9b (engine sell) and a `Close position` path. There is no separate short — closing/reducing is selling the shares you hold, and switching sides means buying the opposite outcome.
3. **Rank display is opt-in, not ambient.** The leaderboard/competition surfaces must NOT render tier/division badges inline. Rank detail (tier, division, movement, ladder) appears only on a dedicated rank view reached by tapping the rank icon. The `/api/leaderboard` response therefore stays lean (Task 12), and a separate `/api/rank` endpoint powers the drill-in.

---

## PHASE A — Data model: shared bankroll + predictions

### Task 1: Create the predictions schema migration

**Objective:** Add prediction market tables that share the existing `accounts.cash` bankroll.

**Files:**
- Create: `supabase/20260909_predictions.sql`

**Step 1: Write the migration.**
```sql
-- Prediction markets mirrored from Polymarket (read model) + paper positions.
create table if not exists prediction_markets (
  id text primary key,                       -- Polymarket market id / conditionId
  question text not null,
  category text,
  yes_token_id text,                         -- CLOB token id for the YES outcome
  no_token_id text,                          -- CLOB token id for the NO outcome
  yes_price numeric,                         -- 0..1 implied probability, last seen
  no_price numeric,
  volume_24h numeric,
  end_date timestamptz,
  status text not null default 'active'
    check (status in ('active','closed','resolved')),
  resolved_outcome text check (resolved_outcome in ('yes','no')),
  image text,
  url text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pred_markets_status on prediction_markets(status, volume_24h desc);

-- One paper position per (account, market, outcome).
create table if not exists prediction_positions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  market_id text not null references prediction_markets(id) on delete cascade,
  outcome text not null check (outcome in ('yes','no')),
  shares numeric not null default 0,
  avg_cost numeric not null default 0,        -- avg price paid per share, 0..1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, market_id, outcome)
);
create index if not exists idx_pred_pos_account on prediction_positions(account_id);

-- Immutable paper fills for predictions (parallel to ledger).
create table if not exists prediction_fills (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  market_id text not null references prediction_markets(id) on delete cascade,
  outcome text not null check (outcome in ('yes','no')),
  side text not null check (side in ('buy','sell','settle')),
  shares numeric not null,
  price numeric not null,                     -- 0..1
  total numeric not null,                     -- shares*price (settle: shares*$1 or $0)
  cash_after numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pred_fills_account on prediction_fills(account_id, created_at desc);
```

**Step 2: Apply it to local Supabase.**
```bash
supabase db reset   # local only; applies schema.sql + migrations
```
Expected: no errors; `prediction_markets`, `prediction_positions`, `prediction_fills` exist. (Production is applied manually in the Supabase SQL editor at release time — do NOT auto-apply to prod.)

**Step 3: Commit.**
```bash
git add supabase/20260909_predictions.sql
git commit -m "feat(db): prediction markets, positions, and fills sharing the account bankroll"
```

### Task 2: RLS for the new tables

**Objective:** Users read markets freely; they see and write only their own positions/fills.

**Files:** Modify: `supabase/20260909_predictions.sql` (append policies).

**Step 1: Append.**
```sql
alter table prediction_markets enable row level security;
alter table prediction_positions enable row level security;
alter table prediction_fills enable row level security;

drop policy if exists "anyone reads markets" on prediction_markets;
create policy "anyone reads markets" on prediction_markets for select using (true);

drop policy if exists "own prediction positions" on prediction_positions;
create policy "own prediction positions" on prediction_positions for select
  using (exists (select 1 from accounts a where a.id = account_id and a.user_id = auth.uid()));

drop policy if exists "own prediction fills" on prediction_fills;
create policy "own prediction fills" on prediction_fills for select
  using (exists (select 1 from accounts a where a.id = account_id and a.user_id = auth.uid()));
```
(Writes go through the service-role engine only, exactly like `orders`/`ledger` today — no client insert policy.)

**Step 2:** `supabase db reset` → expect clean. **Step 3:** commit `feat(db): RLS for prediction tables`.

---

## PHASE B — Prediction data pipeline (Polymarket)

### Task 3: Expand the Polymarket proxy to all active binary markets

**Objective:** Replace the current top-8 in-memory proxy with paginated, binary-only ingestion that captures CLOB token ids.

**Files:** Modify: `src/app/api/prediction-markets/route.ts`

**Contract:** Keep the existing `{ items: PredictionMarket[] }` response shape (the market page already consumes it). Add `yesTokenId`/`noTokenId` to each item. Filter to markets whose `outcomes` are exactly `["Yes","No"]` (case-insensitive). Page the Gamma API with `limit=100&offset=…` until fewer than `limit` rows return or a hard cap of 500 markets. Keep the 60s in-memory cache and the `unavailable`/stale fallback already present.

**Step 1:** Add a `fetchGammaPage(offset)` helper; loop offsets; flatten. Parse `clobTokenIds` (JSON-encoded array on the Gamma row) into `yes_token_id`/`no_token_id` aligned to the `outcomes` order.

**Step 2: Verify against live Gamma.**
```bash
node -e "fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=3').then(r=>r.json()).then(d=>console.log(JSON.stringify(d[0],null,2)))"
```
Expected: a market object showing `outcomes`, `outcomePrices`, `clobTokenIds`. Confirm the field names before mapping.

**Step 3: Contract test.** Create `tests/prediction-markets-contract.test.mjs` asserting every returned item has non-empty `id`, `question`, both token ids, and `yesPrice` in `[0,1]`. Run `node --test tests/prediction-markets-contract.test.mjs`.

**Step 4:** commit `feat(predictions): paginate all active binary Polymarket markets with CLOB token ids`.

### Task 4: Persist markets + a refresh job

**Objective:** Upsert the proxy output into `prediction_markets` so positions can reference stable rows and settlement can read resolution.

**Files:**
- Create: `src/lib/prediction-sync.ts` (upsert markets via `supabaseAdmin()`)
- Create: `src/app/api/cron/predictions/route.ts` (GET, `CRON_SECRET`-guarded, calls the sync)
- Modify: `vercel.json` (add a cron entry)

**Step 1:** `syncPredictionMarkets()` fetches the proxy items and upserts id/question/category/token ids/prices/volume/end_date/image/url and `status='active'`.

**Step 2:** Cron route mirrors `src/app/api/cron/snapshot/route.ts` exactly for the auth guard (`Bearer ${process.env.CRON_SECRET}`), `export const dynamic="force-dynamic"`, `maxDuration=60`.

**Step 3:** In `vercel.json` add:
```json
{ "path": "/api/cron/predictions", "schedule": "*/10 * * * *" }
```
(Vercel Hobby caps cron granularity; 10 min is the market *catalog* refresh. Live *prices* come from client polling in Task 6, NOT this cron — state this clearly to the user; do not promise per-minute server refresh on Hobby.)

**Step 4:** Integration test against local Supabase: call `syncPredictionMarkets()`, assert ≥1 row upserted, assert re-running does not duplicate (id is PK). `git commit -m "feat(predictions): persist markets via a scheduled sync job"`.

### Task 5: Live probability endpoint (CLOB midpoint) + history

**Objective:** Serve current Yes/No cents and a probability timeline for the detail chart.

**Files:**
- Create: `src/app/api/prediction-markets/[id]/route.ts` (GET current quote by token id via CLOB `/midpoint`)
- Create: `src/app/api/prediction-markets/[id]/history/route.ts` (GET timeline via CLOB `/prices-history`)

**Contract:** `GET …/[id]` → `{ id, yes: number, no: number, updatedAt }` (cents as 0..1). `GET …/[id]/history?range=1D|1W|1M|ALL` → `{ points: [{ t: epochSeconds, yes: 0..1 }] }`. Server-side cache 15s; on upstream failure return the last `prediction_markets.yes_price` with `stale:true` and HTTP 200 (never a hard error mid-trade).

**Step 1:** Verify CLOB shape first:
```bash
node -e "fetch('https://clob.polymarket.com/prices-history?market=TOKEN_ID&interval=1d&fidelity=60').then(r=>r.json()).then(d=>console.log(JSON.stringify(d).slice(0,400)))"
```
(Substitute a real `yes_token_id` from Task 3 output.) Confirm the `history[].t/.p` shape before mapping.

**Step 2:** Contract test asserts `yes` in `[0,1]` and history points monotonically increasing in `t`. Commit `feat(predictions): live midpoint quote and probability history endpoints`.

### Task 6: Client polling contract (documented, not a socket)

**Objective:** Define the ~1–2s foreground polling the prediction detail uses.

**Files:** Create: `docs/PREDICTIONS_POLLING.md` (spec only — the client code lands when the RN screen is built).

**Contract to document:** Poll `…/[id]` every 1500ms only while the detail is foreground and `document.visibilityState==='visible'`; pause when hidden; exponential backoff to 10s on repeated failure; never overwrite a fresher `updatedAt` with a stale one (mirror `src/lib/live-market.ts` guard). Commit `docs(predictions): foreground polling + stale-guard contract`.

---

## PHASE C — Prediction trading engine (shared bankroll)

### Task 7: Prediction order math (pure, tested first — TDD)

**Objective:** One pure function converting a paper-dollar stake into shares/payout, matching the reviewed demo exactly.

**Files:**
- Create: `src/lib/prediction-engine.ts`
- Create: `tests/prediction-math.test.mjs`

**Step 1: Write the failing test.**
```js
import { test } from "node:test"; import assert from "node:assert";
import { quoteBuy } from "../src/lib/prediction-engine.ts";
test("50 dollars of 0.62 Yes buys ~80.6 shares paying ~129 if correct", () => {
  const q = quoteBuy({ stake: 50, price: 0.62 });
  assert.ok(Math.abs(q.shares - 80.645) < 0.01);
  assert.ok(Math.abs(q.payoutIfCorrect - 80.645) < 0.01); // $1/share
  assert.ok(Math.abs(q.potentialProfit - (80.645 - 50)) < 0.01);
});
```
**Step 2:** Run `node --test tests/prediction-math.test.mjs` → FAIL (module missing).
**Step 3:** Implement `quoteBuy({stake, price})` → `{ shares: stake/price, cost: stake, payoutIfCorrect: shares*1, potentialProfit: shares - stake }`; guard `0 < price < 1`.
**Step 4:** Re-run → PASS. **Step 5:** commit `feat(predictions): pure buy-quote math with tests`.

### Task 8: `placePredictionOrder` — atomic buy against `accounts.cash`

**Objective:** Deduct cash, upsert the position, write a fill — the prediction analog of `src/lib/engine.ts::placeOrder`.

**Files:** Modify: `src/lib/prediction-engine.ts` (add `placePredictionOrder`).

**Contract:** Input `{ account, marketId, outcome, stake, clientOrderId? }`. Re-read the live price from `…/[id]` (never trust a client price). Reject if `stake > cash`. New `avg_cost = (oldShares*oldAvg + newShares*price)/(oldShares+newShares)`. Update `accounts.cash = cash - stake` and upsert `prediction_positions`, insert `prediction_fills` with `cash_after`. Use `client_order_id` uniqueness for idempotency (same pattern as `orders`). Return `{ ok, position, fill }` or `{ ok:false, error }`.

**Step 1:** Integration test on local Supabase: seed an account with $10,000, buy $50 Yes at a stubbed 0.62, assert cash `9950`, shares `≈80.6`, one fill row. Re-submit same `client_order_id` → no double charge.
**Step 2:** commit `feat(predictions): atomic paper buy sharing the account bankroll`.

### Task 9: `/api/predictions/trade` route

**Objective:** Authenticated browser/mobile endpoint, mirroring `src/app/api/trade/route.ts`.

**Files:** Create: `src/app/api/predictions/trade/route.ts`

**Contract:** `POST` guarded by `getSessionUser(req)`; Zod body `{ market_id, outcome: 'yes'|'no', stake: number, client_order_id?: string }`; loads the account via the same `.eq("user_id").order("created_at").limit(1)` pattern; calls `placePredictionOrder`; `422` on engine rejection, `401` unauth. Add `export const dynamic="force-dynamic"`.

**Step 1:** Contract test with a mocked session asserts `401` without auth, `422` on over-stake, `200` + fill on success.
**Step 2:** commit `feat(predictions): authenticated paper-trade endpoint`.

### Task 9b: `sellPredictionShares` + close/exit endpoint

**Objective:** Let users exit early like Polymarket/Robinhood — sell any fraction (or Max) of held outcome shares at the current market price, crediting cash and realizing P&L.

**Files:**
- Modify: `src/lib/prediction-engine.ts` (add `sellPredictionShares`)
- Create: `src/app/api/predictions/close/route.ts`
- Create: `tests/prediction-sell.test.mjs`

**Step 1: Write the failing sell-math test.**
```js
import { test } from "node:test"; import assert from "node:assert";
import { quoteSell } from "../src/lib/prediction-engine.ts";
test("selling 40 shares bought at 0.50 now worth 0.65 yields 26 proceeds, +6 realized", () => {
  const q = quoteSell({ shares: 40, price: 0.65, avgCost: 0.50 });
  assert.ok(Math.abs(q.proceeds - 26) < 0.001);       // 40 * 0.65
  assert.ok(Math.abs(q.realizedPnl - 6) < 0.001);     // 26 - 40*0.50
});
```
**Step 2:** `node --test tests/prediction-sell.test.mjs` → FAIL.
**Step 3:** Implement `quoteSell({shares, price, avgCost})` → `{ proceeds: shares*price, realizedPnl: shares*(price-avgCost) }`; then `sellPredictionShares({ account, marketId, outcome, shares, clientOrderId? })`:
- Re-read the live price from `…/[id]` (never trust the client).
- Load the position; reject if `shares > heldShares + 1e-6` (`insufficient shares`).
- `accounts.cash += proceeds`; reduce `prediction_positions.shares` by `shares` (delete row when it hits ~0, leave `avg_cost` unchanged on a partial); insert a `prediction_fills` row `side='sell'` with `cash_after`.
- Idempotent via `client_order_id`.

**Contract (`POST /api/predictions/close`):** guarded by `getSessionUser`; Zod `{ market_id, outcome:'yes'|'no', shares?: number, close_all?: boolean, client_order_id?: string }`. `close_all=true` (the "Max"/`Close position` button) sells the entire held quantity; otherwise sell the requested `shares`. `422` on insufficient shares or a closed/resolved market, `401` unauth.
**Step 4:** Re-run sell-math test → PASS. Add an integration test: buy $50 Yes at 0.50 (100 shares), price moves to 0.65, sell 40 → cash rises by 26, position left at 60 shares, one sell fill; then `close_all` → position gone, cash credited at live price.
**Step 5:** commit `feat(predictions): early sell/close at live market price with realized P&L`.

### Task 10: Settlement job

**Objective:** When a market resolves, pay winners $1/share and losers $0, then close positions. (Early exit before resolution is handled by Task 9b; this is the hold-to-resolution path.)

**Files:**
- Modify: `src/lib/prediction-sync.ts` (detect `closed`/resolved markets from Gamma, set `status`, `resolved_outcome`)
- Create: `src/lib/prediction-settle.ts` (`settleResolvedMarkets()`)
- Modify: `src/app/api/cron/predictions/route.ts` (call settle after sync)

**Contract:** For each market flipped to `resolved`: for every open `prediction_positions` row, credit `accounts.cash += shares*1` if `outcome === resolved_outcome` else `+= 0`; write a `prediction_fills` row with `side='settle'`; delete/zero the position. Idempotent: never settle a market twice (guard on `status` transition + a settled marker).

**Step 1:** Integration test: two accounts hold opposing outcomes; resolve YES; assert the YES holder's cash rises by `shares*$1`, the NO holder's is unchanged, both positions closed, exactly one settle fill each. Re-run settle → no change.
**Step 2:** commit `feat(predictions): binary $1/$0 settlement on resolution`.

### Task 11: Fold predictions into `/api/me`

**Objective:** The dashboard returns prediction positions + a combined equity so the shared bankroll and rank are correct.

**Files:** Modify: `src/app/api/me/route.ts`

**Contract:** Add a parallel `prediction_positions` fetch; value each open position at the live `yes_price`/`no_price` (`shares * priceForOutcome`); add `prediction_positions_value` to the response and include it in `equity = cash + positions_value + prediction_positions_value`. Also return recent `prediction_fills` (last 25) so the client can show prediction trade history (including realized P&L from sells and settlements) under Account → Portfolio activity. Keep the existing keys unchanged (mobile `Me` type still parses). Extend `mobile/src/types.ts` `Me` with optional `prediction_positions?`, `prediction_positions_value?`, and `prediction_fills?`.

**Step 1:** Integration test: account with 1 stock position + 1 prediction position → `equity` equals cash + both market values within a cent.
**Step 2:** commit `feat(me): shared bankroll equity across stocks, crypto, and predictions`.

---

## PHASE D — Ranks, search, and hardening

### Task 12: Rank denominator uses combined equity; keep the leaderboard lean

**Objective:** Make `src/lib/ranks.ts` the single source of truth (Diamond = 40%, per the locked decision), wire it to combined equity, and keep tier/division badges OUT of the leaderboard — they live only behind the rank icon.

**Files:** Modify: `src/app/api/leaderboard/route.ts`, `src/app/api/me/route.ts`; Create: `src/app/api/rank/route.ts`.

**Step 1: Leaderboard stays lean.** In `src/app/api/leaderboard/route.ts`, compute `portfolioReturnPct({ equity: combinedEquity, startingCash })` where `combinedEquity` includes prediction value, and return ranked entries with `display_name`, `equity`, `return_pct`, `position` ONLY. Do NOT add `tier`/`division`/`movement` fields to this response — the competition screen must not render rank badges inline. If those fields already leaked in from earlier work, remove them here.

**Step 2: Dedicated rank endpoint.** Create `src/app/api/rank/route.ts` (GET, `getSessionUser`-guarded) returning the drill-in payload for the current user only: `{ tier, tierName, division, returnPct, rankPoints, movement, movementAmount, ladder }` using `rankForAccount` + `rankMovement` from `src/lib/ranks.ts` and the `rank_history` table for movement. `ladder` is the static tier list (Iron→Diamond) for the ladder UI. This is what the rank icon opens.

**Step 3:** Confirm `src/lib/ranks.ts` Diamond `minPct` is `40` (locked decision) — leave as-is; no change needed.

**Step 4: Tests.**
- Integration: an account at exactly 40% combined return → `/api/rank` returns `tierName:"Diamond"`, `division:1`; at 39.99% → `"Gold"`.
- Contract: `/api/leaderboard` response objects have NO `tier`/`division`/`movement` keys (assert `Object.keys` excludes them) — this guards the "no clutter" rule against regressions.
**Step 5:** commit `feat(ranks): combined-equity denominator; rank detail behind /api/rank, leaderboard stays lean`.

### Task 13: Prediction search in the unified catalog

**Objective:** Let the existing smart search surface prediction markets alongside instruments.

**Files:** Modify: `src/app/api/instruments/search/route.ts`, `src/lib/instrument-catalog.ts`

**Contract:** Add an optional prediction source: when a query matches a market `question`/`category` (reuse the existing Levenshtein/alias scorer), return a result with `assetClass:'prediction'` and the `market_id`. Keep the flattened `{ results: [...] }` contract the market page depends on.
**Step 1:** Extend `scripts/test-instrument-catalog.mjs`: `"fed"` returns the Fed-cut market; `"aapl"` still returns AAPL first. Run it → all checks pass.
**Step 2:** commit `feat(search): predictions in the unified smart search`.

### Task 14: Security hardening pass (existing routes)

**Objective:** Close the gaps found during inspection without breaking the mobile client.

**Files & fixes (one commit each, test each):**
- `src/app/api/trader/[accountId]/route.ts` — GET returns another user's full holdings publicly. Gate detailed holdings behind `trader_profiles.is_public = true`; otherwise return name/return only. Test: private account → holdings omitted.
- `src/app/api/profile/avatar/route.ts` — the upsert force-sets `is_public:true` on every avatar change. Remove `is_public` from the avatar upsert so it never silently flips privacy. Test: upload avatar for a private profile → still private.
- `src/app/api/messages/route.ts` — GET marks messages read as a side effect of listing. Split read-marking into an explicit `PATCH`; GET must be side-effect free. Test: GET twice → `read_at` unchanged.
- `src/lib/app-data.ts::getCurrentAccount` — does not filter `status='active'`; a disabled account can still act. Add `.eq("status","active")`. Test: disabled account → `403`.

Commit prefix `fix(security): …` per item.

### Task 15: Full green gate + release notes

**Objective:** Prove the whole surface builds and the suite passes; record the outcome.

**Step 1:**
```bash
cd C:/Users/raine_5tga1yf/vanta-release
rm -rf .next
npx tsc --noEmit && node --test tests/*.mjs && node scripts/test-instrument-catalog.mjs && npm run build
```
Expected: TypeScript clean, all Vitest/node tests pass, catalog checks pass, production build succeeds. Paste the real tail of output into the PR — do not summarize as "passed" without the actual lines.
**Step 2:** Manual end-to-end on `http://localhost:3000` (real user path, per the release-verification standard): sign up → dashboard → buy a stock → buy a prediction Yes → **sell part of the prediction and confirm cash rises by shares×live price with correct realized P&L** → tap the rank icon and confirm the tier/division/ladder view opens (and that the leaderboard itself shows NO rank badges) → see combined equity update → history (including the prediction sell) under Account. Record each step's observed result.
**Step 3:** Write `docs/BACKEND_WIRING_RELEASE.md` with the verified outcomes, the two approval-gate decisions, and the manual E2E transcript. Commit `docs: backend wiring release verification`.

---

## Files likely to change (index)
- New DB: `supabase/20260909_predictions.sql`
- New libs: `src/lib/prediction-engine.ts`, `src/lib/prediction-sync.ts`, `src/lib/prediction-settle.ts`
- New routes: `src/app/api/predictions/trade/route.ts`, `src/app/api/predictions/close/route.ts`, `src/app/api/prediction-markets/[id]/route.ts`, `src/app/api/prediction-markets/[id]/history/route.ts`, `src/app/api/cron/predictions/route.ts`, `src/app/api/rank/route.ts`
- Modified: `src/app/api/prediction-markets/route.ts`, `src/app/api/me/route.ts`, `src/app/api/leaderboard/route.ts`, `src/lib/ranks.ts`, `src/app/api/instruments/search/route.ts`, `src/lib/instrument-catalog.ts`, `src/app/api/trader/[accountId]/route.ts`, `src/app/api/profile/avatar/route.ts`, `src/app/api/messages/route.ts`, `src/lib/app-data.ts`, `vercel.json`, `mobile/src/types.ts`
- New tests: `tests/prediction-markets-contract.test.mjs`, `tests/prediction-math.test.mjs`, `tests/prediction-sell.test.mjs`, plus integration tests against local Supabase
- New docs: `docs/PREDICTIONS_POLLING.md`, `docs/BACKEND_WIRING_RELEASE.md`

## Risks & tradeoffs
- **Serverless polling, not sockets.** Live prices are client-pulled; there is no always-on relay on Vercel Hobby. A future GX10 worker could add a socket, but nothing here depends on it.
- **Polymarket upstream changes.** Gamma/CLOB field names must be re-verified with the probe commands before mapping — do not trust this plan's field names blindly.
- **Money integrity.** Every cash mutation goes through the service-role engine with idempotency keys; no client path can mint cash. Settlement must be idempotent or it will double-pay.
- **Do not regress the mobile client.** `/api/me` and search response shapes are load-bearing for `mobile/App.tsx`; only add keys, never rename.

## Open questions (need the user)
_All prior gates resolved 2026-09-09 (Diamond = 40%; early sell/close enabled; rank display behind the rank icon only). Remaining minor item:_
1. Catalog refresh at a **10-minute** cron is the Vercel Hobby limit — acceptable, or upgrade the plan for tighter cadence? (Live prices still poll client-side regardless.)
