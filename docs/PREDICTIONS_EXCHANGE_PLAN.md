# Vanta Predictions Exchange — Design Plan
Plan only — no code written yet. Awaiting approval before implementation.

## Goal
Turn the current read-only Polymarket preview into a full paper-betting market,
parallel to stock trading: users spend simulated cash to take Yes/No positions
on Polymarket-sourced questions, hold/exit positions before resolution, and get
paid out (or lose stake) when the market resolves — all backed by real,
fast-refreshing Polymarket odds data. It must NOT touch real money or place
real Polymarket orders; it mirrors Polymarket's live prices as the pricing
oracle for a simulated internal book.

## 1. Data source & real-time strategy

Polymarket has three tiers of public data (confirmed via docs.polymarket.com):
- **Gamma API** (`gamma-api.polymarket.com/markets`) — market metadata,
  outcomes, current outcome prices. ~1s indexing lag. What we use today.
- **CLOB REST** (`clob.polymarket.com/prices-history?market=<tokenId>&interval=1d&fidelity=1`)
  — historical price series per outcome token, for the chart.
- **CLOB WebSocket** (`wss://ws-subscriptions-clob.polymarket.com/ws/market`)
  — public, unauthenticated `price_change` / `last_trade_price` events per
  `asset_id` (outcome token), sub-second latency. This is how we hit "every 1
  second if possible" without hammering REST.

**Design:** a server-side relay, not a per-browser socket to Polymarket
(avoids CORS/rate-limit issues and keeps token-id plumbing off the client):

- A lightweight Node worker (`src/lib/polymarket-feed.ts`, or a small
  standalone service if Vercel's serverless model can't hold a persistent
  socket — needs research/decision, see Open Questions) subscribes to the
  CLOB market websocket for every actively-bet-on market's token IDs, keeps
  an in-memory (or Supabase `realtime`-backed) latest-price cache, and
  broadcasts to connected clients via **Supabase Realtime** (Postgres
  `LISTEN/NOTIFY`-backed channel) or **Server-Sent Events**.
- Clients subscribe to that relay for markets they're currently viewing/holding
  — 1s-cadence UI updates come from the relay pushing on every price tick, not
  from polling.
- Fallback: if the websocket relay is infeasible on the hosting platform
  (see Open Questions), poll `clob.polymarket.com/prices-history` +
  `gamma-api.polymarket.com/markets` every 1–2s server-side, cache, and push
  to clients via SSE. Same UI contract either way — this is an implementation
  detail behind one interface (`getLivePrediction(marketId)`).
- Historical chart: seed from `prices-history` (1m fidelity) on first view,
  then append live ticks as they arrive — same UX pattern as the existing
  stock `PriceChart` component (recharts area chart), reused not rebuilt.

## 2. Data model (new Supabase tables, additive — no changes to existing stock tables)

```
prediction_markets          -- cached Polymarket market metadata (server-refreshed)
  id (Polymarket market id, text, pk)
  slug, question, category, image
  clob_token_ids jsonb        -- [{ outcome: "Yes", token_id: "..." }, ...]
  outcomes jsonb              -- ["Yes","No"] (supports >2 later)
  active, closed boolean
  end_date timestamptz
  last_synced_at timestamptz

prediction_prices            -- latest known price per outcome token (hot cache)
  market_id references prediction_markets
  outcome text
  price numeric              -- 0..1, i.e. implied probability
  updated_at timestamptz
  primary key (market_id, outcome)

prediction_positions          -- per-account holding of outcome shares (mirrors `positions`)
  id, account_id references accounts
  market_id references prediction_markets
  outcome text                -- "Yes" | "No" (etc.)
  shares numeric               -- shares held, priced 0..1 like Polymarket "shares"
  avg_entry_price numeric
  created_at, updated_at

prediction_orders             -- mirrors `orders`; market buy/sell of outcome shares
  id, account_id, market_id, outcome, side (buy/sell), qty, price_filled,
  status, created_at

prediction_ledger             -- mirrors `ledger`; immutable fills + settlement payouts
  id, account_id, market_id, outcome, side, qty, price, total, cash_after,
  kind ('trade' | 'settlement'), created_at

prediction_resolutions        -- when Vanta detects/marks a market resolved
  market_id pk, winning_outcome text, resolved_at timestamptz,
  source text default 'polymarket-gamma'
```

Rationale for separate tables rather than reusing `positions`/`orders`/
`ledger`: outcome shares behave differently from equities (price is bounded
0..1, positions settle to $0 or $1/share at resolution rather than trading
indefinitely), and keeping them separate avoids `side/symbol` check-constraint
contortions and keeps stock-trading code untouched (isolation = lower risk).

## 3. Trading mechanics (paper)

- **Buy**: user spends `qty_dollars` to buy shares of an outcome at current
  price `p` (0 < p < 1): `shares = qty_dollars / p`. Cash decreases by
  `qty_dollars` (+ optional flat simulated fee, off by default to match
  Polymarket's near-zero taker fee reality).
- **Sell (exit before resolution)**: sell held shares at current market price;
  cash increases by `shares_sold * current_price`.
- **Resolution / settlement**: a cron (reuse the existing `/api/cron/tick`
  pattern, or a new `/api/cron/predictions-settle`) polls Gamma for
  `closed:true` markets with a resolved outcome, marks
  `prediction_resolutions`, and for every open position on that market:
  winning-outcome shares pay out `$1/share` to cash, losing-outcome shares
  pay out `$0` — both logged to `prediction_ledger` as `kind:'settlement'`,
  then the position row is zeroed/closed.
- **Portfolio equity**: dashboard/leaderboard equity calculation (already
  portfolio-relative, see prior work) extends to include
  `sum(prediction_positions.shares * current_price)` alongside stock position
  market value — one number, "your money," whether it's in AAPL or a Polymarket
  question.

## 4. API surface (new routes, following existing `/api/trade`, `/api/watchlists` conventions)

- `GET /api/predictions` — list active markets w/ latest cached price (already
  exists as `/api/prediction-markets`; will extend response shape to include
  `clobTokenIds` needed by the client feed subscription, and multi-outcome
  price arrays instead of just yes/no).
- `GET /api/predictions/[marketId]` — single market detail + chart history
  (calls Polymarket `prices-history`, cached ~5s).
- `GET /api/predictions/stream` (SSE) or Supabase Realtime channel
  `predictions:prices` — push live price ticks to subscribed clients.
- `POST /api/predictions/trade` — `{ marketId, outcome, side: 'buy'|'sell', amountUsd | shares }`
  → mirrors `placeOrder`, returns fill.
- `GET /api/predictions/positions` — account's open prediction positions with
  live mark-to-market P/L (mirrors `/api/me` position shape).
- Cron: `/api/cron/predictions-settle` — resolution sweep, auth'd the same way
  as the existing tick cron (`CRON_SECRET`).

## 5. UI/UX plan (Vanta design system, no new visual language)

Reuse the **exact same interaction model as stock trading** so it feels like
one app, not two:

- Market page gets a **"Predictions" category tab** next to Owned / Watchlist /
  Crypto / etc. (same `vanta-category-tabs`), listing prediction markets as
  rows in the same list style as `DiscoveryRow`, but showing the leading
  outcome odds instead of $price/%change.
- Tapping a market opens the **same `MarketWorkspace` two-pane layout** used
  for stocks: left = live price chart (recharts area, same component,
  y-domain 0–100% instead of $) with a 1s-refreshing "ticker" line; right =
  order rail, but instead of dollars/shares toggle for a single side, it's a
  **Yes/No (or multi-outcome) segmented control**, then dollars-in / shares-out
  entry, then a Buy button styled identically to `vanta-buy-action`.
- Position rows (in Owned tab) show outcome, shares, avg entry odds, current
  odds, unrealized P/L — same visual grammar as stock position rows
  (`vanta-position-grid`).
- A small always-visible badge: "Paper prediction — settles when Polymarket
  resolves the real-world event. No real Polymarket orders are placed."
  (compliance/expectation-setting, non-negotiable given real-money confusion
  risk).
- Leaderboard/dashboard equity note: total equity breakdown could show a
  "Stocks / Crypto / Predictions" split — nice-to-have, not required for v1.

## 6. Update-speed plan ("every 1 sec if possible")

- Chart + top-of-book price: sub-second via CLOB websocket relay (~100ms per
  Polymarket docs) → capped to update the UI at max 1/sec via
  requestAnimationFrame-throttled state update, matching human-perceivable
  refresh without redraw thrash.
- If a websocket relay isn't viable in this hosting environment (see Open
  Questions), fall back to 1s server-side polling of
  `clob.polymarket.com/prices-history` for the *currently open* market only
  (not all markets at once — cost/rate-limit control), and 5–10s polling for
  markets just shown in list rows (matches the existing equities pattern of
  `OPEN_POLL_MS = 15_000` for lists vs. faster refresh for the open detail view).

## 7. Risk / compliance guardrails
- Every screen referencing predictions must say "paper" / "simulated" /
  "no real orders placed on Polymarket" — same bar as the existing crypto
  disclaimer language already in the codebase.
- Settlement must be idempotent (checked by `prediction_resolutions` unique
  key) so a cron re-run never double-pays.
- No real wallet/crypto custody, no real Polymarket API keys — everything is
  read-only against Polymarket's public data, write-only against our own
  Supabase tables.

## 8. Decisions (confirmed by user 2026-09-09)
1. **Real-time strategy**: ship v1 now with fast polling (~1–2s), no new
   infra. Note for later: user has a local box "GX10" that could become the
   always-on worker for a true websocket relay if/when it's worth it — revisit
   as a fast-follow, not blocking v1. Hosting is Vercel serverless
   (`vercel.json` is cron-only, no long-running Node process), so a
   persistent CLOB websocket relay isn't viable without that extra box.
2. **Outcome scope**: binary (Yes/No) markets only for v1.
3. **Market universe**: all active Polymarket markets (no category curation
   for v1) — still exclude anything Gamma flags as closed/inactive.
4. **Bankroll**: single shared portfolio cash balance across stocks, crypto,
   and predictions — one equity number, matches the portfolio-relative %
   change work already shipped.

## 9. Rollout order (once approved)
1. Schema migration (new tables above) + typecheck.
2. `/api/predictions/*` routes with the polling-fallback feed first (fastest
   to ship correctly), SSE/live-tick delivery to client.
3. Market workspace UI reusing existing chart/order-rail components.
4. Settlement cron + ledger.
5. Contract tests (mirroring existing `market-feature-contract.test.mjs`
   pattern) + `tsc --noEmit` + `npm run build` + local dev walkthrough,
   exactly like the search/watchlist/ranks batch before this.
