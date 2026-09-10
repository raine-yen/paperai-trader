# PlayVanta frontend parity + production/iOS release

**Status:** Web frontend parity shipped and verified in production on 2026-09-10.
**Canonical production URL:** https://playvanta.vercel.app (served by Vercel project `vanta`, no SSO wall, correct Supabase env by capability).

## What shipped this release

1. **Neon lime accent system.** The design tokens (`--brand-lime #c8ff00`, `--content-*`, `--surface-*`, `--border-*`, `--bearish`, `--scrim`, `--focus-ring`) were undefined and silently falling back to browser defaults — this is what made the stock order rail render as broken white/black controls. All tokens are now declared in `globals.css` `:root`/`[data-theme=light]`. The `midnight` theme's mint-green regression (`45 230 157`) was replaced with lime.
2. **Stock order ticket.** Segmented Buy/Sell, Market/Limit, Dollars/Shares controls now use lime active states (was white/black); the lime Confirm button and chart range chips render correctly against the now-defined tokens.
3. **First-party Predictions workspace** (`/predictions`): list + category tabs, detail with odds/probability history chart, Buy Yes/No paper ticket, review → filled receipt, open-position display, partial + Max early close (Polymarket/Robinhood-style, no shorting), wired to `/api/predictions/trade` and `/api/predictions/close`. Discover routes predictions into this in-app ticket instead of external Polymarket links.
4. **Compete "Your standing" rank hero.** The Compete page now surfaces the signed-in trader's own tier, division, rank points, and ladder position inline (Iron→Diamond, Diamond at 40%), while the leaderboard rows stay lean and per-trader rank detail remains opt-in behind the rank icon.
5. **App shell:** 5 destinations (Investing, Discover, Predictions, Compete, Account), mobile bottom nav + desktop rail + right-side watchlist/order-status rail.

## Automated verification
- `npm test` (tsx --test): **54 tests pass** including new `design-tokens-contract`, `prediction-presentation`, `predictions-web-workspace-contract`, expanded `rank-visibility-contract`, and `market-*` contracts.
- Root `npx tsc --noEmit`: clean. Optimized `npm run build`: clean, `/predictions` route registered.

## Production deployment (Vercel)
- Direct CLI uploads (`vercel deploy --prod`) hang and land in **state=BLOCKED** because the commit's GitHub author is `unverified` (login `slickks` ≠ verified repo-owner email). **Use the Git path instead:** push to `release/vanta-production`, let the `vanta` project's Git integration build to READY, `vercel promote <deployment>`, then `vercel alias set <deployment> playvanta.vercel.app`.
- Two projects share the repo: **`vanta`** (public, serves `playvanta`, SSO off — use this) and **`vanta-repo`** (SSO on for `all_except_custom_domains` — its raw `*.vercel.app` URLs are walled; do not alias `playvanta` to a `vanta-repo` deployment).
- Verified deployment `vanta-axh2o8et1` READY, aliased to `playvanta.vercel.app`.

## Production end-to-end verification (real end-user path)
- Fresh signup on https://playvanta.vercel.app → `$10,000` paper cash.
- `/predictions` → Fed market → Buy YES $1 → review → **"Paper buy YES filled — 2.24 YES shares at 45¢"**, position + Sell control appeared.
- Auth capability confirmed public: `/api/auth/login` returns `Invalid login credentials` (Supabase reachable, real env — not SSO-walled, not `Invalid API key`).

## iOS (Expo/EAS → TestFlight)
- Mobile app (`mobile/`) gained a full Predictions tab (list/detail/odds chart/Buy Yes-No/partial+Max close) wired to the same paper prediction APIs; `mobile` theme was already lime. `npx tsc --noEmit` clean.
- EAS iOS production build submitted from Windows using the `EAS_NO_VCS=1` fallback (avoids the MSYS `git clone file:///C:/...` archive failure). Build ID `5cb2d5b6-9366-4681-ae6d-7caeb533ffa6`, v1.0.3, SDK 54, credentials ready (Apple Team 9AC9PRP453). TestFlight submit follows once the build finishes.

## Security hygiene
- The Supabase personal access token supplied earlier in chat was used transiently for the migration and must be rotated/revoked by the user.
