# Feature Batch — 2026-09-08 (smart search, watchlist, ranks, portfolio-relative %, coins & Polymarket)

## Scope (user request)
1. Smart search: names + typo tolerance ("aple" → AAPL).
2. Watchlist actually functional (server-persisted, shared with API).
3. Ranking system with Diamond tier + rank up/down movement.
4. Per-user % change based on their own portfolio, not the fixed starting 10k.
5. New section: coins/memecoins + Polymarket prediction markets.

## Findings
- Smart search exists on `origin/feat/smart-search-ui` + catalog on `feat/instrument-search-catalog`; not merged. Catalog = curated seeds (stocks/ETFs/20 crypto incl. meme coins) with alias/prefix/subsequence tiers + live Yahoo fuzzy augmentation. Tests all pass.
- Watchlist pin (local-storage) exists on `playvanta/t_07088bdb` (40af9c7) built on an OLD market page; the server `/api/watchlists` GET/POST/DELETE already exists against the `watchlists` table.
- % change: `/api/leaderboard` and `/api/me` ranked everyone by *invested cost-basis growth* (0% for all-cash traders, no cross-user comparability). Dashboard mixes both. Must be portfolio-relative: `(equity − starting_cash) / starting_cash`.
- Schema already has `clubs`, `seasons`, `ranks` tables (tier 1..5, division 1..3, rank_points, position_in_tier) but nothing computes them.
- Yahoo crypto quotes work (`BTC-USD`…); trade engine prices any Yahoo-resolvable symbol → crypto trades work end-to-end.
- Polymarket Gamma API (`gamma-api.polymarket.com/markets`) works read-only: question, outcomes, outcomePrices, volume24hr, endDate, image. Paper-only representation (browse + track, no fake fills).

## Design decisions
- Ranks: rank_points = portfolio return % (portfolio-relative), point tiers:
  1 Iron <1%, 2 Bronze <5%, 3 Silver <15%, 4 Gold <40%, 5 Diamond ≥40%.
  Divisions (1–3) split each tier by position. `movement` = previous position − current position
  (up/down/same), persisted each recomputation so rank up/downs survive refreshes.
- Recompute inside `/api/leaderboard` GET (admin client) so dashboard/leaderboard always show fresh ranks; zero-cron.
- Portfolio-relative `return_pct` everywhere (`(equity - starting_cash)/starting_cash*100`), invested-capital growth kept as a separate labeled metric.
- Markets page: adds Watchlist tab backed by server watchlists (local-storage seeds migrated), smart-search combobox, and a new "Crypto & Prediction Markets" section: top coins (Yahoo quotes) + trending Polymarket markets (Gamma, cached 60s), each linking out to Polymarket.

## Verification plan
- Node contract tests for rank engine + portfolio-relative math.
- tsc --noEmit, next build.
- Live browser QA on https://playvanta.vercel.app after deploy.
