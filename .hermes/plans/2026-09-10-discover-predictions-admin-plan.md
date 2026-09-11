# PlayVanta — Discover/Predictions Redesign + Data & Admin Fixes
Date: 2026-09-10 · Owner: Pixel · Ref: Polymarket mobile (user screenshot) + mobile-v2 prototype

## User asks
1. Predictions data "doesn't exist" — backend/data fix.
2. Prediction market info placement is congested — follow the attached Polymarket mobile layout.
3. Watchlist moves into a list under a **Discover** tab that holds all filters (Owned, Watchlist, Tech stocks, …).
4. Account admin control for **raine_yen@outlook.com**: change user cash, equity/assets, bets, name, remove user, time out.
5. Sequence: **redesign first → plan backend → execute**. (This plan; execution follows it.)

## Root causes (verified live)
- `prediction_markets` catalog is populated only by daily cron (13:00 UTC) or a Gamma fallback that is **never persisted** → `/api/prediction-markets/[id]/history` 404s and trades on non-cataloged markets can fail → "data doesn't exist".
- Gamma `category` field absent on production rows → every market `category: null` → chip filters + card labels broken. Gamma exposes tags on `events`; need tag-based category mapping (Politics, Sports, Crypto, Culture, Econ, Weather, Tech).
- Settle cron once/day, no manual trigger.
- Admin API (`/api/admin`) has: reset, disable, enable, adjust_cash, update_display_name. Missing: **delete user (cascade), suspend with duration (time out), adjust starting cash, mutate/liquidate prediction positions & bets, cancel open orders**.

## PHASE 1 — Redesign (web; mobile app follows same IA)
Authority: attached Polymarket screenshot (placement/behavior) + `design-prototypes/mobile-v2` (visual tokens, neon lime #c8ff00).

### 1A. Discover tab (renames "Market")
- Nav: Market → **Discover**. Discover hosts: search, filter chip row (All · Owned · Watchlist · Stocks · ETFs · Crypto · Predictions…), quote list, and the **watchlist as a filter/list inside Discover** — `WatchlistRail` removed from the app layout (desktop rail retired; data now in Discover's Watchlist filter).
- Filters persisted in URL (`?cat=`), deep-linkable.

### 1B. Predictions landing (less congestion)
Per screenshot placement:
- Category chip row at top (All · Politics · Sports · Crypto · Culture · Econ · Weather · Tech) fed by real mapped categories.
- Market rows = compact single-line rows: thumb · question · meta (vol · ends) on left; **two tappable price buttons (Yes ¢ / No ¢) on the right** (Polymarket-style) — removes the duplicated 4-metric grid on landing.
- Positions section collapses when empty; one summary line instead of card grid when ≤2 positions.
- Live badge + countdown ("Live · 2d 14h") moved onto the row.

### 1C. Prediction detail + order ticket (mockup behavior)
- Sticky right order ticket (mobile: bottom sheet) with **Buy/Sell segment tabs** at top, Yes/No outcome split showing live price + implied %, **quick-amount chips (+$5 +$10 +$25 +$100)** above the input, Max on sell.
- Odds history chart keeps 1d/7d/30d; strip duplicate "Yes odds/No odds" metrics (they live in ticket + chart).
- Review sheet + receipt unchanged (already matches stock ticket pattern).

### 1D. QA (per pixel-design-director)
- Playwright screenshots at 390×844 + 1440×900 for Discover and Predictions; no horizontal overflow (scrollWidth ≤ viewport); keyboard focus visible; contrast on lime chips; rubric ≥90 before done.

## PHASE 2 — Backend fixes
- **Persist-what-you-serve**: when list endpoint falls back to Gamma, upsert rows into `prediction_markets` (fire-and-forget with dedupe) so history/trades stop 404-ing.
- **On-demand catalog ensure in history route**: if market row missing, fetch that market from Gamma by condition id and insert, then serve history.
- **Category mapping**: parse Gamma `events.tags` / `tags` into our 7 categories (shared `predictionCategory` classifier used server + client); backfill via sync run.
- **Settlement**: keep daily cron + add admin-triggered settle run + auto-settle check when a positions page is opened (cheap: only held market ids).
- **Tests**: extend `prediction-sync` unit tests (persistence path, tag mapping, on-demand ensure), admin API tests for new actions; keep suite green (`npm test`).

## PHASE 3 — Admin controls (`/admin`, gated to ADMIN_EMAILS incl. raine_yen@outlook.com)
New actions on `/api/admin` (POST, same email gate + audit log row):
- `suspend` {account_id, minutes} → status='suspended', expires; login blocked while active; `unsuspend`.
- `delete_account` {account_id} → cascade delete positions/orders/prediction fills/positions, watchlists, DMs, account row + auth user (admin service role).
- `adjust_cash` (exists) + `adjust_starting_cash`.
- `set_position_qty` / `liquidate_position` {account_id, symbol} — "assets".
- `cancel_order` {order_id}; `settle_prediction_position` manual (win at current price for paper fairness) — "bets".
- `update_display_name` (exists).
UI: per-account row expands to inline editors (cash, starting cash, display name), actions: Suspend 1h/24h/∞, Unsuspend, Delete (type-to-confirm), positions/orders/predictions sub-tables with per-row actions.

## PHASE 4 — Deploy & verify
- Tests + build → push `release/vanta-production` → promote → alias (never `vanta-repo`).
- Authenticated E2E on prod: signup → Discover filters incl. Watchlist → predictions chips (real categories) → trade → chart renders → positions reflect settle after market closes.
- Admin E2E with raine_yen@outlook.com: adjust cash, suspend/unsuspend, rename, delete test user (created for the test).
- Mobile app: Discover/Predictions IA port in a follow-up EAS build.

## Definition of done
Every named capability exercised through the real end-user path on production with screenshots/evidence; rubric ≥90 on redesign; no unverified claims.
