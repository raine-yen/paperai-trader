# PaperAI Trader 1.0.1 Release Audit

Audit date: 26 July 2026  
Branch: `codex/product-perfection`  
Status: **release candidate — cloud build approval required**

## Current score

**91 / 100**

This score is intentionally capped until a signed iOS build is installed and exercised on a physical device, uploaded to TestFlight, and the resulting App Store Connect build record passes processing and metadata validation.

## Automatic release blockers

| Gate | Result | Evidence |
| --- | --- | --- |
| Placeholder or template artwork | Pass | New original 1024px PaperAI icon and matching adaptive/splash artwork are referenced by Expo config. |
| In-app account deletion | Pass in source | Destructive confirmation and `/api/account` deletion flow exist on web and mobile. Must be rechecked in the signed build. |
| Dead-end primary navigation | Pass | Mobile Compete now renders the authenticated club leaderboard with current-user rank and empty state. |
| Personal data leakage | Pass | Leaderboard is authenticated, scoped to the viewer’s competition, and no longer requests or returns member emails. |
| Web production compilation | Pass | Next.js 15.5.18 production build compiled, type-checked, linted, and generated all 26 static pages. |
| iOS JavaScript release bundle | Pass | Expo/Metro exported the iOS Hermes bundle with 849 modules after dependency fixes. |
| Expo native compatibility | Pass | Expo Doctor 1.20.1: 18/18 checks passed. |
| Strict TypeScript | Pass | Web and mobile `tsc --noEmit` completed with no errors. |
| Current npm advisory check | Unverified | npm’s advisory endpoint returned malformed compressed data twice; this is an external service failure, not a pass. |
| Signed-device smoke test | Pending | Requires the cloud build and TestFlight install. |
| TestFlight processing | Pending | Requires explicit approval to upload source to Expo’s build service. |
| Final App Review submission | Pending | Requires a processed build, completed metadata, and action-time confirmation immediately before submission. |

## Rubric

| Category | Weight | Score | Notes |
| --- | ---: | ---: | --- |
| Core trading correctness | 20 | 18 | Existing trade validation, buying-power and owned-share checks compile; signed-device/API regression remains. |
| App Review compliance | 20 | 18 | Icon and deletion rejection causes are corrected in source; binary verification remains. |
| Privacy and safety | 15 | 15 | Email exposure removed; leaderboard authorization and competition scoping added. |
| Accessibility | 15 | 13 | Semantic web controls, focus-visible rings, labeled form fields, radio semantics and dynamic status-bar contrast added. Physical VoiceOver pass remains. |
| Visual system and theming | 10 | 10 | Semantic token architecture plus System, Light, Dark, and Midnight themes on web and mobile. |
| Responsive and state quality | 10 | 9 | Visible route loading state, mobile leaderboard empty state, disabled/loading/success/error surfaces. Device matrix remains. |
| Build and dependency health | 10 | 8 | Web build, mobile bundle and Expo Doctor pass; npm advisory service and signed archive remain. |

## Required signed-build test

1. Fresh install and upgrade from the current TestFlight build.
2. Sign in, restore session, sign out, and sign back in.
3. Switch among System, Light, Dark, and Midnight; restart and confirm persistence.
4. Open Portfolio, Discover, Compete, and Profile in each theme.
5. Verify nonzero cash/holdings do not flash as misleading zero values while refreshing.
6. Search a symbol; preview a buy and sell without submitting.
7. Submit one paper order only with the tester’s approval and verify portfolio/order history.
8. Create and revoke a test API key, verifying the one-time secret treatment.
9. Change profile image and verify the permission message.
10. Verify the complete in-app account-deletion flow on a disposable review account.
11. Run VoiceOver, Dynamic Type, keyboard, reduced-motion, and 200% zoom checks.
12. Validate iPhone SE, standard iPhone, Pro Max, and iPad layouts.

## App Store Connect checklist

- Version: `1.0.1`
- Bundle identifier: `com.papertrader.mobile`
- Encryption declaration: non-exempt encryption is not used
- Photo Library usage string describes profile-picture selection
- Support, privacy, terms, and community-guideline URLs load without authentication
- Review notes must state that trading is simulated and provide a working review account
- Replace any attached build 21/22/24 with the newly processed 1.0.1 build
- Do not resubmit the rejected build 19 or the currently attached build 21
- Confirm screenshots and metadata match the shipped System/Light/Dark/Midnight experience

## Assurance boundary

No developer can truthfully guarantee that Apple will never reject an app. This audit reduces known technical and policy risk, documents every remaining gate, and prohibits submission while an automatic blocker is unresolved.
