# PaperAI Trader: TradeCraft redesign blueprint

## Context pass

- **Core user:** A learner or club member who wants to research a symbol, make a simulated decision, and understand the result without real-money pressure.
- **Core loop:** Review portfolio → discover a symbol → configure and review a paper order → inspect receipt and portfolio impact → reflect or compare in the club.
- **Platforms:** Expo SDK 54 on iPhone and iPad, with the current API and authentication contracts preserved.
- **Release promise:** All money is simulated, account deletion remains accessible, screenshots are captured from the real native UI, and no unfinished feature is presented as shipped.
- **Visual direction:** A warm editorial market journal: paper-toned canvas, navy financial typography, hairline cards, restrained emerald and red semantics, compact native navigation, and deliberate regular-width iPad composition.

## Exactly 25 product and design improvements

| # | Improvement | Product implementation | Design integration | Delivery |
| ---: | --- | --- | --- | --- |
| 1 | Persistent simulation identity | Keep the app’s paper-money state in the global shell and order flow | Compact `PAPER · SIMULATED` badge appears near primary financial context | Implement now |
| 2 | Portfolio command header | Preserve account equity, cash, invested value, and account name | Editorial hero puts equity first and daily/total return second | Implement now |
| 3 | Calm return context | Compute change against starting equity and explain the comparison period | Gain/loss is communicated with sign, text, and semantic color | Implement now |
| 4 | Accessible portfolio chart | Preserve snapshot data and provide a deterministic fallback only when empty | Interactive crosshair, spoken summary, compare mode, and tabular tooltip | Implement now |
| 5 | Allocation and concentration insight | Derive cash/position mix and largest position from current account data | Compact risk card explains concentration without alarmist language | Implement now |
| 6 | Actionable holdings | Reuse position and quote data; every row opens symbol detail | Larger 52-point rows, recognizable mark, owned quantity, value, and change | Implement now |
| 7 | Faster market discovery | Preserve debounced symbol lookup and curated market groups | Search is the first control; segmented chips reveal owned, watched, and themed lists | Implement now |
| 8 | Honest watchlist controls | Reuse the existing watchlist endpoint and indicate current membership | Symbol detail exposes a named watch action with success feedback | Implement now |
| 9 | Rich symbol workspace | Combine quote, position, chart, fundamentals, and alerts | Phone uses progressive sections; iPad uses a chart-and-insight split workspace | Implement now |
| 10 | Clear chart intervals | Preserve supported API ranges and refresh behavior | Scrollable 44-point range controls with explicit selected state | Implement now |
| 11 | Flexible paper-order entry | Preserve market/limit and shares/dollars API inputs | Entry uses two compact segmented groups, presets, Max, and a large numeric field | Implement now |
| 12 | Preflight risk validation | Calculate notional, buying power, owned shares, and invalid constraints locally | Inline explanation appears beside the disabled review action | Implement now |
| 13 | Explicit order review | Add a local configure → review state before any API mutation | Review surface restates side, symbol, quantity, estimated total, and remaining balance | Implement now |
| 14 | Trade receipt and recovery | Hold the normalized order result after submission and refresh account data | Success state confirms simulated status and offers portfolio/symbol next actions | Implement now |
| 15 | Useful price alerts | Reuse above/below alert creation with current-quote presets | Named actions explain the direction and confirmation instead of icon-only controls | Implement now |
| 16 | Strategy reflection prompt | Define a future trade-linked journal record without fabricating persistence | Receipt reserves a concise “What was your thesis?” next-step affordance | Foundation only |
| 17 | Metric education | Attach plain-language definitions to P/E, volume, ranges, and buying power | Context labels and expandable insight copy replace unexplained jargon | Implement now |
| 18 | Privacy-safe competition | Preserve competition-scoped leaderboard data without member email | Podium summary, current-user card, ranked rows, and constructive return language | Implement now |
| 19 | Healthy learning momentum | Use existing rewards later; avoid rewards based on trade frequency | Weekly review/checklist card celebrates analysis and risk habits | Foundation only |
| 20 | Complete state language | Standardize first-load, refresh, empty, offline/error, disabled, and success behavior | Layout-faithful skeletons and recovery panels use the same geometry as content | Implement now |
| 21 | Semantic multi-theme system | Persist System, Light, Dark, and Midnight preference in secure storage | Every theme maps the same surface/text/brand/bullish/bearish/focus roles | Implement now |
| 22 | Deliberate iPhone/iPad layouts | Use window width to select compact or regular composition | Bottom dock becomes an iPad navigation rail; content uses bounded two-column grids | Implement now |
| 23 | Visible account safety | Preserve profile permission copy, sign-out, and destructive deletion endpoint | Account deletion remains plainly labeled, separated, and confirmed | Implement now |
| 24 | Contained live updates | Preserve bounded polling, deduplicate refreshes, and memoize derived values | Refresh indicators do not replace valid data or flash misleading zero values | Implement now |
| 25 | Accurate App Store evidence | Add capture-only deterministic simulated fixtures and native CI matrix | Three real screens per required device family, exact dimensions, no alpha, manifest | Implement now |

## Screen architecture

### Global shell

- Compact iPhone: top-safe-area content, centered content column, persistent bottom navigation.
- Regular-width iPad: persistent left navigation rail, bounded content width, two-column screen compositions.
- Global state remains in `App.tsx` to avoid a risky state-library migration during a release redesign.
- Network-backed values remain visible during refresh; first-load placeholders and recoverable errors are explicit.

### Portfolio

- Hero: simulation badge, greeting, total equity, return context, accessible chart.
- Decision rail: buying power, invested value, allocation, largest mover, and review prompt.
- Below the fold: interactive holdings and recent paper orders.

### Discover and symbol workspace

- Search and categories lead the list view.
- Symbol workspace prioritizes price/change/chart, then position, range, fundamentals, watch, alerts, and Buy/Sell.
- On iPad, price/chart and research/action panels sit side by side.

### Order state machine

```text
configure → local validation → review → API submission → receipt
     ↑             │            │             │
     └──── edit ───┘            └── error ───┘
```

- No API order is sent from the configure action.
- Review and receipt repeatedly say that the order is simulated.
- Invalid buying power or holdings produce an explanation and disabled action.

### Competition and profile

- Competition prioritizes current rank and progress context before the full list.
- Profile contains appearance, account health, API access, safety copy, sign-out, and deletion.
- Email is visible only to the signed-in user in their own profile.

## Semantic design tokens

Each theme defines background, surface, elevated surface, muted surface, border, strong border, primary/secondary/tertiary/inverse text, brand/pressed/soft/on-brand, bullish/soft, bearish/soft, warning, info, focus ring, chart grid/crosshair, scrim, and shadow.

- **Light:** warm paper canvas, white cards, navy ink text, forest brand, and amber editorial labels.
- **Dark:** neutral charcoal canvas, graphite surfaces, warm-white text, and soft mint brand.
- **Midnight:** blue-black canvas, navy graphite surfaces, cool-white text, electric mint brand.
- **System:** resolves to Light or Dark and updates status-bar contrast.

## Native App Store capture matrix

The capture workflow must re-check Apple’s official specification before each release. The initial native matrix is:

| Group | Native simulator target | Portrait pixels |
| --- | --- | ---: |
| iPhone 6.9-inch master | iPhone 16 Pro Max | `1320 × 2868` |
| iPhone 6.5-inch compatibility | iPhone 11 Pro Max or accepted native equivalent | `1242 × 2688` |
| iPhone 6.1-inch compatibility | iPhone 14 | `1170 × 2532` |
| iPad 13-inch | iPad Pro 13-inch (M4) | `2064 × 2752` |

Each device set contains exactly:

1. `01-portfolio.png`
2. `02-research-and-review.png`
3. `03-club-rankings.png`

The capture-only build uses deterministic simulated data but the exact production components and interactions. Final verification rejects loading/error UI, personal data, alpha channels, wrong dimensions, stale copy, and non-native composites.

## Strict release rubric

| Area | Weight | Perfect gate |
| --- | ---: | --- |
| Functional correctness | 2.0 | Auth, refresh, portfolio, search, detail, order state machine, watch, alerts, competition, profile, and deletion pass |
| Trading clarity and safety | 1.5 | Two-step decision flow, visible simulation state, local validation, explicit review, receipt |
| Visual system | 1.5 | Token-driven themes, original hierarchy, tabular data, consistent spacing and radius |
| Accessibility | 1.5 | Contrast, names/roles/states, 44-point targets, chart summary, text scaling, reduced-motion compatibility |
| Responsive quality | 1.0 | Compact iPhone and regular-width iPad compositions have no clipping or stretched emptiness |
| State completeness | 1.0 | Loading, refresh, empty, error, disabled, pressed, review, and success states are useful |
| Privacy and App Review | 1.0 | No identity leak, visible deletion, accurate permission copy, screenshots match the binary |
| Performance and reliability | 0.5 | Polling and renders stay bounded; valid data survives refresh and transient errors |

A perfect score cannot be claimed before native screenshots are inspected and a signed TestFlight build passes device smoke testing. App Review acceptance itself can never be guaranteed.
