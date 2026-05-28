# Codex Handoff: Trading Cockpit Redesign

Last updated: 2026-05-27

## Current Branch
- Repo path: `C:\Users\UX5406AA_SKU1\Documents\Projects\paper-trader-clean`
- Branch: `codex/trading-cockpit-redesign`
- Latest pushed commit: `be9ecc9 Refine App Store safety copy`
- PR URL: `https://github.com/raine-yen/paperai-trader/pull/new/codex/trading-cockpit-redesign`

## What Was Implemented
- Full web cockpit redesign:
  - Desktop left rail navigation
  - Darker premium UI system
  - New `Messages` page
  - New `Settings` page
  - Dashboard now shows competition pulse, alerts, unread messages
  - Market stock detail now supports watchlist + quick price alerts
  - Admin now includes message reports and practice-credit moderation panels
- Full mobile Expo redesign:
  - Replaced old mobile app with 4 tabs: `Portfolio`, `Discover`, `Compete`, `Settings`
  - Added watchlist, alerts, trade ticket, leaderboard, direct messages, report flow
  - Removed mobile paper-cash gift UI to avoid Apple simulated-gambling/payment confusion
  - Added darker near-black theme, tighter flat panels, and a reactive bottom nav that compresses while scrolling
  - No new native dependencies, so this should be OTA-publishable after backend/web deploy
- Backend/API additions:
  - `/api/watchlists`
  - `/api/alerts`
  - `/api/competitions`
  - `/api/trader/[accountId]`
  - `/api/messages`
  - `/api/social/block`
  - `/api/social/report`
  - `/api/transfers`
  - `/api/account` DELETE for App Store-compliant account deletion
  - Extended `/api/me`
  - Extended `/api/admin`
- Supabase schema updated locally in `supabase/schema.sql` for:
  - `trader_profiles`
  - `watchlists`
  - `price_alerts`
  - `achievements`
  - `blocked_users`
  - `direct_messages`
  - `message_reports`
  - `paper_transfers`
- App-review pages added/updated:
  - `/terms`
  - `/community-guidelines`
  - `/privacy` updated for messages, practice-credit activity, reports, blocks, and in-app account deletion
  - Settings now exposes account deletion on web and mobile

## Verification Completed
- 2026-05-27 after latest commit: `npm run typecheck` passed.
- 2026-05-27 after latest commit: `npm run build` passed locally.
- 2026-05-27 after latest commit: `cd mobile && npx tsc --noEmit` passed.
- 2026-05-27 after latest commit: `cd mobile && npx expo export --platform web` passed.
- Attempted local HTTP smoke test, but output was inconclusive due local server command behavior. Build itself passed.

## Blockers / Not Finished
- Supabase production migration was NOT applied.
  - Project ref: `fwlbickoywztcikyhvbj`
  - Attempted via Supabase connector.
  - Failed with permission error: `You do not have permission to perform this action`.
  - Until this migration is applied, new social/watchlist/alerts/transfer features will gracefully return empty/unavailable in production.
- Vercel production deploy succeeded for the real `paper-trader` project.
  - Production URL: `https://paper-trader-lac.vercel.app`
  - Latest inspected deployment id: `dpl_A97om3KtxrKScL2FJRG5w2ybTEtR`
- Expo OTA was published to branch `production`.
  - Latest update group: `5dd3d3af-6792-4363-a24a-47835cfa87e0`
  - Runtime version: `1.0.0`
  - Platforms: iOS and Android
- No new EAS/TestFlight build was started.

## Next Steps
1. Apply the SQL additions from `supabase/schema.sql` to Supabase production project `fwlbickoywztcikyhvbj` using the dashboard SQL editor or a session/tool with DDL permission.
2. In App Store Connect, update the rating questionnaire so Paper Trader is not marked as gambling or simulated gambling.
3. Record the App Review account deletion video on a physical device:
   - Sign in or create a test account.
   - Open Settings.
   - Tap Account deletion / Delete my account.
   - Confirm the destructive prompt.
   - Show the app returning to the signed-out screen.
4. If OTA does not reach the TestFlight/App Review build, create a new production iOS build and submit:
   ```bash
   npx eas-cli@latest build -p ios --profile production
   npx eas-cli@latest submit -p ios --latest --profile production
   ```
5. Re-run verification when making further code changes:
   ```bash
   npm run typecheck
   npm run build
   cd mobile
   npx tsc --noEmit
   npx expo export --platform web
   ```

## Important Notes
- Keep `/v2/*` Alpaca-compatible API stable; do not mix social features into it.
- Avoid App Store-facing "cash gift", "bonus", gambling, betting, wager, prize, or cash-out language. Use "practice balance" and "practice credits" for simulated educational balances.
- App Store Connect rating should indicate no gambling/simulated gambling if the app is educational paper trading only.
- App Review screen recording path: sign in or create test account -> Settings -> Account deletion -> Delete my account -> confirm destructive system prompt -> account returns to auth screen.
- Direct messages require report/block/admin moderation for App Store safety expectations.
- Mobile changes did not add native dependencies, so start with Expo OTA before making a new binary.
