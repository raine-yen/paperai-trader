import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("market order ticket is one-tap: confirm button at the bottom of the bar, receipt animates inline on that bar", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const css = read("src/app/globals.css");

  // No separate full-screen success overlay anymore.
  assert.doesNotMatch(market, /<OrderSuccessOverlay/);
  // No two-stage review dialog.
  assert.doesNotMatch(market, /Review paper order/);
  assert.doesNotMatch(market, /vanta-review-scrim/);
  // A single prominent confirm button carries the live side/symbol/notional and submits directly.
  assert.match(market, /className=\{cn\("vanta-confirm-button", side === "sell" && "is-sell"\)\}\s*disabled=\{!valid \|\| submitting\}\s*onClick=\{submit\}/);
  assert.match(market, /Enter" && valid && !submitting\) submit\(\)/);
  // The receipt renders inside the same order bar (is-receipt), not a separate overlay.
  assert.match(market, /vanta-order-rail is-open is-receipt/);
  assert.match(market, /vanta-rail-receipt/);
  assert.match(market, /role="status" aria-live="polite"/);
  assert.match(css, /\.vanta-confirm-button \{[^}]*min-height:\s*54px/s);
  assert.match(css, /\.vanta-order-rail\.is-receipt \{[^}]*animation:/s);
  assert.match(css, /@keyframes rail-receipt-in/);
});

test("shared receipt is a keyboard-dismissible dialog and respects reduced motion", () => {
  const flow = read("src/components/order-flow.tsx");

  assert.match(flow, /role="dialog"/);
  assert.match(flow, /aria-modal="true"/);
  assert.match(flow, /event\.key === "Escape"/);
  assert.match(flow, /prefers-reduced-motion: reduce/);
  assert.match(flow, /closeRef\.current\?\.focus\(\)/);
});

test("Expo has a real submitting-paper-order stage before its receipt", () => {
  const types = read("mobile/src/types.ts");
  const app = read("mobile/App.tsx");
  const screens = read("mobile/src/screens.tsx");

  assert.match(types, /OrderStage = "configure" \| "review" \| "processing" \| "receipt"/);
  assert.match(app, /setOrderStageState\("processing"\)/);
  assert.match(app, /setOrderStageState\("receipt"\)/);
  assert.match(screens, /orderStage === "processing"/);
  assert.match(screens, /Submitting paper order…|Submitting paper orderâ€¦/);
});

test("order UI preserves the flat black-lime rail and neutral sell treatment", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const css = read("src/app/globals.css");
  const flow = read("src/components/order-flow.tsx");
  const mobile = read("mobile/src/screens.tsx");

  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+284px/);
  assert.match(market, /label="Order side"/);
  assert.match(market, /label="Order type"/);
  assert.match(market, /label="Amount mode"/);
  assert.match(market, /role="tablist" aria-label=\{label\}/);
  assert.match(market, />Max<|>Max\s*</);
  assert.match(css, /\.vanta-amount input[^}]*font-size:\s*30px/s);
  assert.doesNotMatch(flow, /bullish\s*\?\s*"bg-accent-green\/15"\s*:\s*"bg-accent-red\/15"/);
  assert.doesNotMatch(flow, /order-sheet card/);
  assert.doesNotMatch(mobile, /side === "buy" \? colors\.bullishSoft : colors\.bearishSoft/);
});

test("dashboard launches a selected paper buy or sell flow instead of a generic market page", () => {
  const dashboard = read("src/app/(app)/dashboard/page.tsx");

  assert.match(dashboard, /openTradeLauncher\("buy"\)/);
  assert.match(dashboard, /openTradeLauncher\("sell"\)/);
  assert.match(dashboard, /role="dialog"/);
  assert.match(dashboard, /aria-labelledby="paper-trade-launcher-title"/);
  assert.match(dashboard, /id="dashboard-trade-symbol"/);
  assert.match(dashboard, /Continue to \{tradeSide === "buy" \? "buy" : "sell"\}/);
  assert.match(dashboard, /\/market\?symbol=\$\{encodeURIComponent\(symbol\)\}&side=\$\{tradeSide\}/);
  assert.match(dashboard, /Paper funds only/);
});

test("order success and rail animations are defined and honor reduced motion", () => {
  const css = read("src/app/globals.css");
  const flow = read("src/components/order-flow.tsx");

  assert.match(css, /@keyframes order-scrim/);
  assert.match(css, /@keyframes order-ring-draw/);
  assert.match(css, /@keyframes order-check-draw/);
  assert.match(css, /@keyframes rail-highlight/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(flow, /prefers-reduced-motion: reduce/);
  assert.match(flow, /setStage\("done"\)/);
});

test("the Apple workspace keeps the full page usable until a Buy or Sell ticket is opened", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const css = read("src/app/globals.css");

  assert.match(market, /cn\("vanta-workspace", ticketSide && "has-open-ticket"\)/);
  assert.match(css, /\.vanta-workspace \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /\.vanta-workspace\.has-open-ticket \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 284px/s);
  assert.match(css, /\.vanta-order-rail \{[^}]*display:\s*none/s);
  assert.match(css, /\.vanta-order-rail\.is-open \{[^}]*display:\s*block/s);
  assert.match(css, /\.vanta-order-content \{[^}]*min-width:\s*0/s);
  assert.match(css, /\.vanta-amount \{[^}]*min-width:\s*0[^}]*width:\s*100%/s);
  assert.match(market, /railRef\.current\?\.scrollIntoView\(\{ behavior: reduce \? "auto" : "smooth", block: "start" \}\)/);
  assert.match(market, /requestAnimationFrame\(\(\) => amountRef\.current\?\.focus\(\)\)/);
});

test("new visitors default to the canonical midnight Vanta canvas", () => {
  const layout = read("src/app/layout.tsx");
  const provider = read("src/components/theme-provider.tsx");

  assert.match(layout, /getItem\("paper-trader-theme"\)\|\|"midnight"/);
  assert.match(provider, /useState<ThemePreference>\("midnight"\)/);
  assert.match(provider, /\? stored : "midnight"/);
});

test("a side deep-link from the dashboard launcher opens the order ticket immediately", () => {
  const market = read("src/app/(app)/market/page.tsx");

  // MarketWorkspace must auto-open the ticket when arriving with ?side=buy|sell
  assert.match(market, /workspaceParams\.get\("side"\)/);
  assert.match(market, /setTicketSide\(side\)/);
  // Guarded so it fires once per mount, not on every searchParam change
  assert.match(market, /autoOpenedRef\.current/);
});
