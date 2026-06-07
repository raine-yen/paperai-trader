# Codex Handoff: Trading Cockpit Redesign

Last updated: 2026-06-07

## Current Branch
- Repo path: `C:\Users\UX5406AA_SKU1\Documents\Projects\paper-trader-clean`
- This is the production repo to use for the real website, API, Expo mobile app, Supabase schema, and GitHub pushes.
- Do not use `C:\Users\UX5406AA_SKU1\OneDrive\Documents\Projects\paper-trader` for production work. That OneDrive folder is a small Vite/prototype/design folder and does not contain the real Next.js API, Expo app, Supabase schema, or native iOS project.
- Cleanup note: attempted to rename the OneDrive prototype folder to `_archive-paper-trader-prototype-do-not-use` on 2026-06-07, but Windows reported it was open/in use. Added warning/locator files instead:
  - `C:\Users\UX5406AA_SKU1\OneDrive\Documents\Projects\USE_THIS_FOR_PAPER_TRADER.txt`
  - `C:\Users\UX5406AA_SKU1\OneDrive\Documents\Projects\paper-trader\__NOT_THE_REAL_APP_DO_NOT_USE_FOR_BUILDS.txt`
- Branch: `codex/trading-cockpit-redesign`
- Latest pushed commit: `facc9d0 Prepare native iOS project for TestFlight`
- PR URL: `https://github.com/raine-yen/paperai-trader/pull/new/codex/trading-cockpit-redesign`
- GitHub remote: `https://github.com/raine-yen/paperai-trader.git`

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
  - Added stock logo rows and user profile picture picker/upload
  - Added `expo-image-picker`, so this now requires a fresh native build instead of OTA-only rollout
- Native SwiftUI experiment:
  - Separate native project exists at `ios/PaperTrader.xcodeproj`.
  - Commit `2c81c7c Refine native iOS dashboard depth and theming` changed `ios/PaperTrader/ContentView.swift`, `DashboardView.swift`, `MarketView.swift`, and `Theme.swift`.
  - Commit `facc9d0 Prepare native iOS project for TestFlight` set the native project's API URL to `https://paper-trader-lac.vercel.app`, bundle id to `com.papertrader.mobile`, version to `1.0.2`, and build number to `15`.
  - Important: EAS/TestFlight builds from Windows use `mobile/`, not this separate Swift project. SwiftUI changes must be ported into `mobile/App.tsx` to appear in EAS builds.
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
  - `/api/profile/avatar` for Supabase Storage avatar upload
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
- 2026-05-27: Canva generated viewable mobile concept candidates:
  - `https://www.canva.com/d/hBdMkcXTqoBdoan`
  - `https://www.canva.com/d/UIyxHdqD5f9oAgZ`
  - `https://www.canva.com/d/5GIrzSvvSZMsjJv`
  - `https://www.canva.com/d/A2-hSR9vShhxZpZ`
- Attempted local HTTP smoke test, but output was inconclusive due local server command behavior. Build itself passed.

## Current Work In Progress
- As of 2026-06-07, there are uncommitted changes in `mobile/App.tsx`.
- These changes started porting the SwiftUI dashboard feel into the Expo app:
  - Portfolio hero label changed to `Total net worth`.
  - Added a sparkline-style account visual.
  - Added metric rows for practice balance, invested value, and return.
  - Portfolio grid now emphasizes rank, inbox, alerts, and watchlist.
  - Holdings list is capped to the first four positions.
  - Added a collapsible `Recent orders` section.
- Before building/submitting again, inspect and finish this work:
  - Add `snapshots` to the mobile `Me` TypeScript type, or remove the `me?.snapshots` reference.
  - Replace the non-ASCII middle dot in the new order row text with an ASCII separator.
  - Run `cd mobile && npx tsc --noEmit`.
  - Commit and push the finished mobile changes.

## Blockers / Not Finished
- Supabase production migration was NOT applied.
  - Project ref: `fwlbickoywztcikyhvbj`
  - Attempted via Supabase connector.
  - Failed with permission error: `You do not have permission to perform this action`.
  - Later Vercel env pull produced blank Supabase URL/key values locally, and Supabase CLI is not logged in.
  - Until this migration is applied, chat/social/watchlist/alerts/profile-avatar features can fail or return unavailable in production.
- Vercel production deploy succeeded for the real `paper-trader` project.
  - Production URL: `https://paper-trader-lac.vercel.app`
  - Latest inspected deployment id: `dpl_4R9wVc5o1DQa2MwytKPzFMJapjSJ`
- Fresh iOS build was created and submitted because profile pictures added a native dependency.
  - Build ID: `5a88b453-7c24-4798-998b-4dd11cda6a44`
  - App version/runtime: `1.0.1`
  - Build number: `14`
  - Submission URL: `https://expo.dev/accounts/raine.ye/projects/paper-trader-mobile/submissions/adb8f91a-4cb3-44b7-a449-31b3b066eea4`
  - App Store Connect build page: `https://appstoreconnect.apple.com/apps/6771218600/testflight/ios`

## How iOS Is Built And Submitted From Windows
- The TestFlight app is the Expo app in `C:\Users\UX5406AA_SKU1\Documents\Projects\paper-trader-clean\mobile`.
- App Store Connect app id: `6771218600`.
- iOS bundle id: `com.papertrader.mobile`.
- Expo owner/project:
  - Owner: `raine.ye`
  - Slug: `paper-trader-mobile`
  - EAS project id: `0c09d383-ef50-4df0-b7ab-5a77cd306f6d`
- `mobile/eas.json` is already configured:
  - `appVersionSource`: `remote`
  - production build has `autoIncrement: true`
  - submit profile has `ascAppId: "6771218600"`
- To create a new TestFlight binary from Windows:
  ```bash
  cd C:\Users\UX5406AA_SKU1\Documents\Projects\paper-trader-clean\mobile
  npx eas-cli@latest build -p ios --profile production --non-interactive
  ```
- To submit the latest completed iOS EAS build to App Store Connect:
  ```bash
  cd C:\Users\UX5406AA_SKU1\Documents\Projects\paper-trader-clean\mobile
  npx eas-cli@latest submit -p ios --latest --profile production --non-interactive
  ```
- To check recent iOS builds:
  ```bash
  cd C:\Users\UX5406AA_SKU1\Documents\Projects\paper-trader-clean\mobile
  npx eas-cli@latest build:list --platform ios --limit 5 --non-interactive
  ```
- Why this works without a Mac:
  - EAS Build runs the iOS archive on Expo's macOS build servers.
  - Windows only starts the remote build and submission.
  - The separate Swift/Xcode project in `ios/` cannot be archived locally on this Windows machine because there is no Xcode or `xcodebuild`.
- OTA updates:
  - `mobile/app.json` uses `runtimeVersion.policy = "appVersion"` and current version `1.0.1`.
  - Build 14 uses runtime/app version `1.0.1`.
  - JS-only changes can be published OTA only to installed builds with matching runtime `1.0.1`.
  - Changes involving new native dependencies, app config, entitlements, icons, bundle id, or native files require a new EAS build.

## Next Steps
1. Finish the uncommitted Expo dashboard port in `mobile/App.tsx`, typecheck it, commit it, and push it.
2. If only JavaScript changed, decide whether to publish OTA to runtime `1.0.1` or create a fresh TestFlight binary anyway. For a clear beta-test artifact, prefer a new EAS iOS production build and submit it.
3. Apply the SQL additions from `supabase/schema.sql` to Supabase production project `fwlbickoywztcikyhvbj` using the dashboard SQL editor or a session/tool with DDL permission.
4. Wait for Apple to finish processing the newest submitted build, then select it in TestFlight/App Review.
5. In App Store Connect, update the rating questionnaire so Paper Trader is not marked as gambling or simulated gambling.
6. Record the App Review account deletion video on a physical device:
   - Sign in or create a test account.
   - Open Settings.
   - Tap Account deletion / Delete my account.
   - Confirm the destructive prompt.
   - Show the app returning to the signed-out screen.
7. Re-run verification when making further code changes:
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
- Current Expo mobile app already includes `expo-image-picker`, so profile-picture support was handled by build 14. Future JS-only UI edits can use OTA if the runtime version matches, but native/config edits still need a new EAS build.
