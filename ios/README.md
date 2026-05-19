# Paper Trader iOS

This folder contains a native SwiftUI iOS client for the existing Paper Trader backend.

## Architecture

1. The Next.js app remains the trusted backend.
2. Supabase auth and service-role database access stay server-side.
3. The iOS app signs in through `/api/auth/login`, stores the server-issued cookies in `URLSession`, and then calls the same authenticated routes as the website:
   - `/api/me`
   - `/api/trade`
   - `/api/quote`
   - `/api/chart`
   - `/api/leaderboard`
   - `/api/keys`
4. No Supabase service-role key or secret environment variable is bundled into the iOS app.

## End-to-end launch plan

1. Keep the web backend working locally with `npm run dev`.
2. Open `ios/PaperTrader.xcodeproj` in Xcode.
3. Select the `PaperTrader` scheme and an iOS 17+ simulator.
4. Run the app. The default backend URL is `http://localhost:3000`.
5. Sign up or log in with the same credentials as the website.
6. Verify the core flows:
   - Dashboard loads cash, equity, positions, orders, and snapshots.
   - Market search loads live Yahoo Finance quotes and charts through the backend.
   - Trade submits buy/sell market or limit orders through `/api/trade`.
   - Leaderboard loads live rankings through `/api/leaderboard`.
   - API Keys can be generated and revoked.
7. For TestFlight or App Store builds, change `API_BASE_URL` in `PaperTrader/Info.plist` to your HTTPS Vercel URL.
8. Remove local HTTP App Transport Security exceptions before App Store submission if you only use HTTPS in production.
9. Set a real bundle identifier and development team in Xcode Signing & Capabilities.
10. Add final production assets:
    - App icon
    - Launch screen branding
    - Privacy manifest / nutrition labels based on your school or club data policy
11. Archive in Xcode, validate, upload to App Store Connect, then distribute with TestFlight before public release.

## Backend URL overrides

The app reads `API_BASE_URL` from `PaperTrader/Info.plist`.

For temporary simulator testing, you can also pass an environment variable from the Xcode scheme:

```text
PAPER_TRADER_API_BASE_URL=https://your-project.vercel.app
```

## Local development notes

- iOS Simulator can usually reach the Mac host at `http://localhost:3000`.
- Physical iPhones cannot reach your computer's localhost. Use your LAN IP with an ATS exception for development, or use your deployed HTTPS Vercel URL.
- The app intentionally uses the existing cookie-authenticated backend routes to preserve the current Supabase RLS and server-only secret boundaries.
