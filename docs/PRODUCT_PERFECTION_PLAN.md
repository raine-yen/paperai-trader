# PaperAI Trader Product Perfection Plan

## Design operating charter

### Role and core identity

You are an elite Senior Product Designer and Creative Technologist. You combine deep UX psychology, precise design system engineering, and production-grade frontend execution. You do not just output boilerplate code; you engineer intuitive, visually stunning, accessible, and high-converting user experiences.

### The ten commandments

1. **UX architecture and mental models:** Structure content logically with low cognitive load, progressive disclosure, and intuitive user flows.
2. **Design system and token architecture:** Build using strict design tokens for color, typography, elevation, and spacing. Never hardcode arbitrary values.
3. **Visual hierarchy and composition:** Use whitespace, visual weight, alignment, and focal points to guide attention.
4. **Accessibility:** Meet WCAG AA at minimum, target AAA where practical, preserve keyboard navigation, and provide semantic labels.
5. **Micro-interactions and motion:** Use subtle transitions and feedback cues while respecting reduced-motion preferences.
6. **Mobile-first responsiveness:** Start with mobile, then scale with flexible layout primitives and fluid type.
7. **Exhaustive state design:** Cover default, hover, pressed, focus-visible, disabled, loading, empty, error, offline, and success states.
8. **Psychology and conversion:** Apply Fitts's Law, Hick's Law, progressive disclosure, and clear primary actions.
9. **Platform compliance:** Follow web standards, Apple Human Interface Guidelines, and App Store Review Guidelines.
10. **Production-grade translation:** Produce modular, maintainable, performant React, Next.js, Expo, and React Native code.

### Design system constraints

- Spatial grid: 4, 8, 12, 16, 24, 32, 48, and 64 points.
- Typography: no more than two font families and a consistent modular scale.
- Semantic color roles: primary, secondary, background, surface, elevated surface, border, text, muted text, success, warning, error, and info.
- Minimum body-text contrast: 4.5:1.
- Minimum touch target: 44 by 44 points; preferred primary action height: 48–52 points.
- Motion: 120–240 ms for direct manipulation, 240–400 ms for route or panel transitions.

## Product context

- **Core user goal:** Learn investing by safely researching, simulating, and discussing market decisions.
- **Primary audience:** Investing clubs, classrooms, students, and beginner traders.
- **Secondary audience:** Club leaders, teachers, moderators, and developers connecting trading bots.
- **Platforms:** Responsive Next.js web app and Expo iOS app.
- **Trust promise:** No real-money deposits, withdrawals, payouts, or cash-out mechanics.
- **Release target:** iOS version 1.0.1 after all release gates pass.

## Current audit findings

### Release-blocking

1. The configured iOS icon is Apple’s placeholder grid. It must be replaced everywhere before resubmission.
2. Apple previously rejected the app for missing account deletion. The current code has deletion, but the installed release build must be verified end to end.
3. The mobile Compete tab is a “coming soon” dead end even though the web competition experience is live.
4. The leaderboard exposes member email addresses, which is unnecessary personal information.

### High severity

5. The mobile web dashboard can show a blank black view for several seconds before content appears.
6. Several loading states render zero values before real account data arrives, causing misleading interface flicker.
7. Some form controls have visible text but no programmatically associated labels.
8. Icon-only API-key actions have no accessible names.
9. Dense data tables do not have a deliberate small-screen card or horizontal-scroll treatment.
10. Dark mode is forced on both web and native; there is no user-selectable theme or system preference.

## Ten highest-impact design improvements

| # | Improvement | Why it matters | Implementation | Design integration |
|---|---|---|---|---|
| 1 | Tokenized multi-theme system | Removes hardcoded color debt and adds requested light mode | Semantic CSS variables on web; semantic theme maps and persisted preference in Expo | Theme control in profile/settings with System, Dark, Light, and Midnight options |
| 2 | Honest loading architecture | Prevents blank screens and false `$0` data | Route loading UI, skeleton cards, stale-data preservation, refresh indicators | Skeletons match final geometry; no full-page blank state |
| 3 | Privacy-first identity | Stops exposing email addresses | Remove emails from leaderboard and non-admin social payloads | Display name, avatar, rank, and strategy only |
| 4 | Release-safe brand identity | Fixes an explicit Apple rejection | Replace placeholder icon and verify splash/adaptive/icon assets | One recognizable upward-path mark across app, store, and web |
| 5 | Cross-platform feature parity | Removes confusing dead ends | Connect mobile Compete to real leaderboard data | Podium summary, current-user rank, privacy-safe ranking list |
| 6 | Accessible interaction contracts | Enables keyboard, screen reader, and motor access | Labels, roles, focus rings, accessible names, reduced motion, 44-point targets | Visible focus and error text near the relevant control |
| 7 | Safer trade decision flow | Reduces accidental orders and improves learning | Preview, buying-power validation, holdings validation, confirmation receipt | Three stages: configure, review, result |
| 8 | Responsive information density | Makes tables usable on phones and tablets | Mobile cards, sticky actions, content priority, overflow affordances | Essential data first; secondary metrics behind disclosure |
| 9 | Complete component state model | Makes failures recoverable | Shared loading, empty, error, offline, success, and retry components | Every data surface states what happened and what to do next |
| 10 | Moderated social design | Supports classroom safety | Block/report controls, admin queue, rate limits, privacy-safe profiles | Safety is visible but not alarmist; reports use explicit confirmation |

## Thirty-feature roadmap

The roadmap is intentionally phased. Shipping all 30 at once would increase App Store risk. Release 1.0.1 should include the release-critical foundation and only features that can be fully tested.

### Trading and portfolio

| # | Feature | Product implementation | Interface implementation | Phase |
|---|---|---|---|---|
| 1 | Dollar-based fractional orders | Convert notional amount to fractional quantity using the validated quote | Shares/Dollars segmented control in the order ticket | 1.0.1 |
| 2 | Market and limit orders | Existing order API with validated type and limit price | Order-type segmented control with contextual limit input | 1.0.1 |
| 3 | Scheduled orders | Persist execution time and process through the order engine | “Now/Scheduled” disclosure under order type | 1.1 |
| 4 | Stop-loss and take-profit plans | Add linked conditional orders and trigger processing | Position actions sheet with percentage and price presets | 1.2 |
| 5 | Reusable order presets | Store user-local favorite quantities/notionals | Preset chips above the amount field | 1.1 |
| 6 | Trade receipt | Return normalized fill/queued result and portfolio impact | Success sheet with fill price, quantity, remaining cash, and Done | 1.0.1 |
| 7 | Complete order history | Cursor-paginated API with filters | Orders screen with Open, Filled, Canceled, and Rejected tabs | 1.1 |
| 8 | Portfolio time ranges | Query snapshots by range | 1D, 1W, 1M, 3M, 1Y, and All controls above chart | 1.1 |
| 9 | Benchmark comparison | Normalize SPY or selected benchmark to portfolio start | Compare toggle and secondary chart line | 1.2 |
| 10 | Allocation insights | Compute concentration, cash drag, and sector mix | Allocation card with accessible bars and plain-language insights | 1.1 |

### Research and discovery

| # | Feature | Product implementation | Interface implementation | Phase |
|---|---|---|---|---|
| 11 | Personal watchlist | Existing watchlist API with remove and reorder support | Watchlist filter plus swipe/context remove | 1.0.1 |
| 12 | Multiple named lists | Add list and membership tables | List switcher with “New list” sheet | 1.2 |
| 13 | Custom stock screener | Server-side filters for sector, price, change, volume, and market cap | Filter sheet with removable summary chips | 1.2 |
| 14 | Rich stock detail | Expand quote metadata and historical bars | Price, performance, fundamentals, holdings, and action sections | 1.0.1 |
| 15 | Price alerts | Existing alert API with edit, pause, and delete | Alert builder with direction, target, preview, and active list | 1.0.1 |
| 16 | Earnings and event calendar | Add sourced event feed with cached dates | Calendar card and event markers on stock detail | 1.3 |
| 17 | Curated market news | Add licensed/source-linked feed and topic filters | News cards with source, timestamp, and external-link warning | 1.3 |
| 18 | Research notes | Account-scoped symbol notes | “My thesis” editor on stock detail | 1.2 |

### Learning and decision quality

| # | Feature | Product implementation | Interface implementation | Phase |
|---|---|---|---|---|
| 19 | Guided onboarding | Persist completed tutorial steps | Four-step interactive walkthrough with skip and replay | 1.1 |
| 20 | Weekly learning quests | Existing reward API with idempotent claims | Quest progress cards with clear eligibility and claim state | 1.0.1 |
| 21 | Strategy journal | Store trade-linked notes and review outcomes | Journal timeline with trade references | 1.2 |
| 22 | Plain-language metric glossary | Static, versioned educational content | Tappable info buttons and searchable glossary | 1.1 |
| 23 | AI-assisted trade explanation | Generate educational, non-advisory summaries from order context | “Explain this trade” panel with explicit simulation disclaimer | 1.3 |

### Competition and community

| # | Feature | Product implementation | Interface implementation | Phase |
|---|---|---|---|---|
| 24 | Live privacy-safe leaderboard | Existing refreshed rankings with emails removed | Podium, current-user highlight, ranked cards/table | 1.0.1 |
| 25 | Competition seasons | Add competition, membership, and date-window models | Season switcher with status and countdown | 1.2 |
| 26 | Club invite codes | Single-use or scoped join codes with expiry | Join Club sheet and admin invite manager | 1.2 |
| 27 | Achievement badges | Event-backed badge awards | Profile badge shelf and contextual celebration | 1.2 |
| 28 | Direct messages with moderation | Existing messages, blocks, reports, and admin actions | Trader list, conversation view, block/report actions | 1.1 |

### Account and platform

| # | Feature | Product implementation | Interface implementation | Phase |
|---|---|---|---|---|
| 29 | Theme and accessibility preferences | Persist System, Light, Dark, Midnight, reduced motion, and text scale | Appearance section in Settings/Profile | 1.0.1 |
| 30 | Data control center | Verify delete, add export, and document retention | Privacy section with Export Data and Delete Account | 1.0.1 for delete; 1.2 for export |

## Theme architecture

### Theme names

- **System:** Follows the operating system and resolves to Light or Dark.
- **Light:** Warm white canvas, white surfaces, charcoal text, emerald action color.
- **Dark:** Near-black canvas, charcoal surfaces, off-white text, emerald action color.
- **Midnight:** Blue-black canvas, deep navy surfaces, mint action color.

### Semantic tokens

Each theme must define:

- `background`
- `surface`
- `surfaceElevated`
- `surfaceMuted`
- `border`
- `borderStrong`
- `text`
- `textMuted`
- `textSubtle`
- `primary`
- `onPrimary`
- `success`
- `warning`
- `danger`
- `info`
- `focusRing`
- `chartPositive`
- `chartNegative`

Components consume semantic tokens only. Brand green is not used as body text on light backgrounds unless contrast passes.

## Release 1.0.1 implementation slice

### Foundation

1. Replace placeholder icon with the approved production mark.
2. Add System, Light, Dark, and Midnight theme tokens.
3. Persist theme choice securely on mobile and locally on web.
4. Add theme controls to native Profile and web navigation/settings.
5. Respect system status-bar contrast.

### Trust and compliance

6. Verify in-app deletion removes the authentication user and associated data.
7. Remove emails from leaderboard UI and non-admin responses.
8. Keep educational and no-real-money disclaimers visible in trade and social contexts.
9. Add accessible labels to icon-only controls and form fields.
10. Verify privacy, support, community-guideline, and account-deletion links.

### Product completeness

11. Replace the mobile Compete placeholder with the live leaderboard.
12. Preserve existing data during refresh and show skeletons on first load.
13. Add a proper trade result state.
14. Verify watchlist, alert, profile image, API key, and account deletion flows.

## Strict release rubric

The app cannot ship with any critical item or any unresolved App Store rejection item. A score of 95 or higher is required, but score alone cannot override a critical failure.

| Area | Weight | Passing standard |
|---|---:|---|
| Functional correctness | 25 | Authentication, refresh, portfolio, quotes, buy/sell, limits, watchlists, alerts, leaderboard, profile, API keys, and deletion all pass happy and failure paths |
| UX and visual design | 15 | Clear hierarchy, no blank screens, no misleading zero flashes, complete states, usable at 320–1440 px and iPhone/iPad targets |
| Accessibility | 20 | WCAG AA contrast, semantic labels, 44-point targets, keyboard flow, screen-reader names, reduced motion, and dynamic type resilience |
| Privacy and safety | 15 | No unnecessary email exposure, secure token storage, functional block/report controls, delete-account access, and no secret leakage |
| Performance and reliability | 10 | Responsive startup, bounded polling, no request storms, recoverable offline/errors, no blocking console errors |
| App Store readiness | 15 | Final icon, version/build correctness, screenshots, privacy answers, demo access, export compliance, account deletion, complete metadata, and no placeholder/coming-soon primary tabs |

### Critical automatic failures

- Placeholder icon or splash asset.
- Account deletion unavailable, nonfunctional, or hidden.
- Real user email addresses exposed to other users.
- Trade action submits twice or without confirmation/feedback.
- Authentication tokens or API secrets logged or displayed after the one-time reveal.
- A primary tab is blank, broken, or only “coming soon.”
- App crashes or becomes unusable offline or on a slow network.
- App Store metadata contradicts the app’s functionality.
- Any required permission lacks a purpose string.
- Any App Review issue remains unaddressed.

## Release sequence

1. Implement the 1.0.1 slice on a dedicated branch.
2. Run web typecheck, production build, and focused API tests.
3. Run Expo TypeScript checks and Expo Doctor.
4. Perform visual checks for Light, Dark, and Midnight on web mobile, web desktop, iPhone, and iPad.
5. Test every critical rubric item and record evidence.
6. Build the iOS production artifact with EAS.
7. Upload to TestFlight and complete internal smoke testing.
8. Update App Store Connect metadata, icon/screenshots, privacy answers, review notes, and selected build.
9. Re-grade the release. Fix and repeat until the release gate passes.
10. Ask for action-time confirmation immediately before final App Store submission.

## Important assurance boundary

No designer, developer, or automated test can guarantee that Apple will never reject a submission. The responsible target is to eliminate all known issues, meet documented policies, verify the exact uploaded build, and provide strong review notes and evidence. Final acceptance remains Apple’s decision.
