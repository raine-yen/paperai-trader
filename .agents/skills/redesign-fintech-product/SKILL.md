---
name: redesign-fintech-product
description: Design, redesign, implement, and audit production fintech and paper-trading experiences. Use for PaperAI Trader or TradeCraft work involving product architecture, trading flows, portfolio dashboards, market research, responsive iPhone/iPad layouts, semantic theme systems, accessibility, component states, behavioral engagement, App Store screenshots, or strict release-quality evaluation.
---

# Redesign Fintech Product

Engineer a trustworthy, fast, native-feeling financial product instead of a decorative mockup. Preserve real functionality while improving decision speed, learning value, accessibility, and visual hierarchy.

## Load the doctrine

Read [references/tradecraft-doctrine.md](references/tradecraft-doctrine.md) completely before planning or changing a fintech interface. Treat it as the product and design-system contract.

## Execute the workflow

1. **Context pass**
   - Identify the core user, trading goal, risk level, supported platforms, current source of truth, and release target.
   - Inspect the real app and existing behavior before proposing visual changes.
   - Preserve working APIs, authentication, privacy controls, and App Review requirements.

2. **Product audit**
   - Trace portfolio, discover, symbol detail, order, competition, profile, loading, empty, error, and offline flows.
   - Find dead elements, misleading data, long decision paths, inaccessible controls, privacy leaks, and device-specific layout failures.
   - Separate release-critical fixes from later roadmap work.

3. **Twenty-five-point blueprint**
   - For a full redesign, produce exactly 25 distinct features, design principles, or interaction hooks.
   - State how each improves readability, decision speed, risk understanding, learning, or retention.
   - Define the delivery labels before using them. Distinguish existing source, implemented in the current change, foundation-only, and planned; never imply an unfinished feature ships.

4. **Skeletal pass**
   - Design mobile first around a two-step conceptual path: find a symbol, then configure and review a simulated order. Review belongs to the decision step but must still require a separate confirmation before any order mutation.
   - Use progressive disclosure for advanced metrics.
   - Make tablet layouts intentionally adaptive, not stretched phone layouts.

5. **Theme pass**
   - Build the complete semantic token contract in the doctrine for background, surfaces, text, border, focus, brand, bullish, bearish, warning, info, chart, scrim, shadow, and elevation roles.
   - Support System, Light, Dark, and Midnight unless the product explicitly calls for fewer themes.
   - Use the 4/8-point spacing grid, no more than two font families, and tabular numerals for financial data.

6. **Interaction and state pass**
   - Implement default, pressed/active, focus-visible, disabled-with-reason, loading, empty, error, and success states for every important component.
   - Maintain 44-by-44-point touch targets, explicit accessibility names, live announcements for changed prices/results, and reduced-motion compatibility.
   - Isolate irreversible or high-impact actions and make simulated-money status unmistakable.

7. **Production translation**
   - Follow the repository's existing framework and version constraints.
   - Map web-oriented doctrine packages to native equivalents when working in React Native; do not install incompatible dependencies merely to match a package list.
   - Keep components modular, token-driven, memoized where data updates frequently, and free of dead handlers.

8. **Quality loop**
   - Build and run type, framework, accessibility, and release checks.
   - Grade against the doctrine rubric using evidence. A claimed perfect score requires every applicable gate to pass; otherwise report the honest score and remaining gate.
   - Fix failures and re-grade until no safe in-scope improvement remains.
   - Perform only phases authorized by the current request, and mark device, TestFlight, or submission phases pending when they are outside scope.

9. **App Store capture**
   - Re-check Apple's current official screenshot specification before capture.
   - Capture the actual release UI from the real native app. Do not substitute AI mockups, browser composites, or stale screens.
   - Use deterministic preview data only when it exercises interfaces that exist in the shipping app, visibly label simulated trading, remove alpha, verify exact pixel dimensions, and inspect every final image.

## Release boundary

Never guarantee App Review acceptance. Eliminate known rejection causes, verify the exact binary and metadata, and distinguish source-level confidence from signed-device or App Store Connect evidence.
