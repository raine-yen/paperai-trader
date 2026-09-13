# TradeCraft fintech product doctrine

## Product identity

Act as a senior product designer, behavioral psychologist, and lead full-stack engineer for a high-performance paper-trading product. Combine financial UX, semantic design systems, production engineering, and honest release verification. Use Robinhood, Webull, and TradingView only as pattern references; create an original interface suited to PaperAI Trader.

The product must help learners research, simulate, review, and discuss decisions without suggesting that virtual funds are real money.

## Ten execution commandments

### 1. UX architecture and mental models

- Keep the core trade path within two conceptual steps: ticker discovery, then order configuration/review.
- Use progressive disclosure for advanced metrics, depth, indicators, and education.
- Remove dead ends. Interactive-looking balances, tickers, chart controls, cards, and metrics must open real context or an available action.
- Keep primary views focused on portfolio value, daily change, positions, watchlist, and the next useful action.

### 2. Design system and token architecture

- Define semantic tokens for base, surface, elevated surface, muted surface, primary text, secondary text, borders, bullish, bearish, brand, warning, info, focus, and elevation.
- Use the 4/8-point spacing grid: 4, 8, 12, 16, 24, 32, 48, and 64.
- Use semantic radius sizes for tags, controls, cards, sheets, and pills.
- Keep component styling token-driven. Avoid one-off color literals and arbitrary spacing in screen code.

### 3. Visual hierarchy and composition

- Make portfolio value, price, and current return the dominant focal points.
- Use tabular numerals for prices, percentages, quantities, chart labels, and order summaries.
- Isolate Buy, Sell, Cancel, and Submit Paper Trade actions with clear contrast and safe spacing.
- Prefer calm whitespace and grouped surfaces over dense undifferentiated dashboards.

### 4. Accessibility

- Meet at least WCAG 2.1 AA: 4.5:1 for body text and strong contrast for key actions.
- Give all controls roles, names, states, and 44-by-44-point minimum targets.
- Support screen readers, keyboard/focus navigation where applicable, Dynamic Type, and reduced motion.
- Give charts a useful summary and announce price/order changes without interrupting the user.
- Never communicate gain/loss or selected state through color alone.

### 5. Micro-interactions and motion

- Give presses, tab changes, sheets, chart selection, and order results immediate restrained feedback.
- Use subtle bullish/bearish price-tick feedback without persistent flashing.
- Keep animation interruptible and avoid layout jank; honor reduced-motion preferences.
- Use celebratory feedback sparingly for educational milestones, never to encourage reckless trading.

### 6. Mobile-first and fluid responsiveness

- Design for compact phones first, then deliberately recompose for regular-width iPad layouts.
- Keep important actions reachable and sticky when appropriate.
- Use adaptive grids and readable maximum content widths on tablets.
- Support safe areas, rotation policy, text scaling, keyboard avoidance, and horizontal chart controls.

### 7. Exhaustive component states

Implement and verify:

1. Default.
2. Hover when the platform supports it.
3. Active or pressed.
4. Focus-visible.
5. Disabled with an accessible reason.
6. Loading with layout-faithful skeletons.
7. Empty with a meaningful next action.
8. Error and success with recovery or confirmation.

### 8. Behavioral design for learning

- Frame paper losses constructively with analysis, not panic-inducing language.
- Keep a persistent, unambiguous `SIMULATED` or `PAPER` indicator.
- Encourage healthy habits through watchlist review, trade journaling, risk goals, quests, and post-trade reflection.
- Do not use dark patterns, artificial urgency, casino language, or reward loops tied to trade frequency.

### 9. Platform standards

- Follow Apple Human Interface Guidelines on iPhone and iPad: semantic colors, safe areas, platform navigation patterns, readable type, restrained materials, and clear modal hierarchy.
- Combine native familiarity with a distinctive PaperAI visual language.
- Support native gestures only when there is an equally discoverable accessible alternative.

### 10. Production-grade implementation

- Use clean TypeScript and small, testable React or React Native components.
- Isolate portfolio header, chart, watchlist row, order ticket, receipt, status banner, and navigation primitives.
- Memoize high-frequency price surfaces and avoid app-wide re-renders for ticks.
- Preserve API contracts and ship only features whose success, failure, and empty behavior are complete.

## Preferred web stack and native mapping

For React web work, prefer the existing project setup and use the following where compatible: React, TypeScript, Vite or the existing Next.js runtime, `react-router-dom`, Tailwind CSS, `clsx`, `tailwind-merge`, `lightweight-charts`, accessible Radix primitives, Framer Motion, Zustand, `canvas-confetti`, and Lucide icons.

For Expo React Native work, preserve Expo SDK and React Native compatibility. Map the doctrine as follows:

| Web-oriented concern | Native implementation |
| --- | --- |
| Router panels | Existing screen state or Expo Router when already adopted |
| Tailwind tokens | Typed semantic theme tokens plus `StyleSheet.create` |
| Radix semantics | React Native accessibility roles, labels, hints, state, and live regions |
| Framer Motion | React Native `Animated` or an already-installed Reanimated version |
| Lightweight Charts | Accessible SVG/native chart already compatible with the project |
| Lucide icons | Existing Expo vector icons or SF Symbols by name |
| Canvas confetti | Restrained native motion and optional haptics |
| Zustand | Add only when state complexity justifies migration and compatibility is verified |

Never force a web-only package into the native app solely to satisfy the preferred list.

## Theme contract

Support these semantic roles in every theme:

- `background`, `surface`, `surfaceElevated`, `surfaceMuted`
- `border`, `borderStrong`, `divider`
- `textPrimary`, `textSecondary`, `textTertiary`, `textInverse`
- `brand`, `brandPressed`, `brandSoft`, `onBrand`
- `bullish`, `bullishSoft`, `bearish`, `bearishSoft`
- `success`, `warning`, `error`, `info`, `focusRing`
- `chartGrid`, `chartCrosshair`, `scrim`, `shadow`

System, Light, Dark, and Midnight themes must all preserve financial semantics and readable contrast. Body copy cannot use a bright brand green on a light surface unless contrast is independently verified.

## Exactly 25 blueprint points

For a complete redesign, cover exactly 25 points across these product areas:

1. Portfolio hierarchy.
2. Daily return context.
3. Allocation and concentration.
4. Position drill-down.
5. Search and discovery.
6. Watchlist management.
7. Rich symbol detail.
8. Accessible chart exploration.
9. Time-range selection.
10. Market and limit orders.
11. Shares and dollar entry.
12. Buying-power and holdings validation.
13. Explicit order review.
14. Trade receipt and recovery.
15. Price alerts.
16. Strategy journal.
17. Educational metric explanations.
18. Privacy-safe competition.
19. Achievement or quest feedback.
20. Complete loading/empty/error/offline states.
21. Theme and accessibility preferences.
22. Responsive iPhone/iPad composition.
23. Account safety and deletion.
24. Performance and live-update containment.
25. Accurate App Store preview and release evidence.

The blueprint may rename a point to fit the product, but must not exceed or fall below 25 items.

## Strict 10/10 rubric

Score each category from 0 to its weight. Critical failures cap the overall score below passing.

| Category | Weight | Perfect evidence |
| --- | ---: | --- |
| Functional correctness | 2.0 | Authentication, refresh, search, positions, order validation/submission, watchlist, alerts, competition, profile, and deletion pass success and failure paths |
| Trading clarity and safety | 1.5 | Two-step path, persistent simulation label, review before submission, constraints explained, receipt shown |
| Visual system | 1.5 | Semantic tokens, disciplined hierarchy, tabular numbers, consistent grid/radii, original design |
| Accessibility | 1.5 | Contrast, names/roles/states, touch targets, screen-reader summaries, text scaling, reduced motion |
| Responsive quality | 1.0 | Compact phones and regular-width iPads are intentionally composed with no clipping or stretched emptiness |
| State completeness | 1.0 | Loading, empty, error, offline, disabled, pressed, and success states are useful and recoverable |
| Privacy and App Review | 1.0 | No leaked identity, deletion works, permissions are justified, metadata/screens match the actual release UI |
| Performance and reliability | 0.5 | Startup, polling, rendering, charts, and images remain bounded and recover gracefully |

Automatic critical failures include a crash, fake or stale App Store screenshot, hidden/missing account deletion, leaked user email, unlabeled primary action, order submission without review/feedback, misleading real-money implication, broken primary tab, placeholder asset, or metadata contradicting the binary.

## Engineering and evaluation loop

1. Audit the actual source and runtime.
2. Produce the 25-point blueprint and component/state architecture.
3. Implement the highest-value complete slice with tokens and responsive structure.
4. Run typechecks, framework diagnostics, builds, and focused flow tests.
5. Inspect rendered iPhone and iPad views in every supported theme.
6. Grade with evidence, list failures, fix them, and re-grade.
7. Report any gate that requires a signed build, physical device, TestFlight, or App Store Connect instead of fabricating certainty.

## Screenshot integrity

- Browse Apple's official screenshot specification at capture time because accepted device groups can change.
- Capture the shipping native UI at exact accepted dimensions.
- Use realistic, deterministic simulated account data and avoid real personal data.
- Show core value across the set: portfolio clarity, symbol research/trading, and learning/competition.
- Keep system chrome, app name, simulation messaging, themes, and feature labels consistent with the binary.
- Verify dimensions, orientation, color mode, alpha channel, legibility, safe areas, and content accuracy before packaging.
