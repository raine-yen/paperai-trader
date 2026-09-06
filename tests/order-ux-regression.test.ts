import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("market order ticket reuses the shared success overlay and keeps configure then review explicit", () => {
  const market = read("src/app/(app)/market/page.tsx");

  assert.match(market, /import\s+\{\s*OrderSuccessOverlay\s*,\s*type\s+OrderReceipt\s*\}\s+from\s+"@\/components\/order-flow"/);
  assert.match(market, /const \[stage, setStage\] = useState<"configure" \| "review">\("configure"\)/);
  assert.match(market, /aria-label="Sell NVDA paper order"|aria-label=\{`Sell \$\{symbol\} paper order`\}/);
  assert.match(market, /Review paper order/);
  assert.match(market, /Confirm paper trade/);
  assert.match(market, /<OrderSuccessOverlay[\s\S]*receipt=\{receipt\}/);
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

test("new visitors default to the canonical midnight Vanta canvas", () => {
  const layout = read("src/app/layout.tsx");
  const provider = read("src/components/theme-provider.tsx");

  assert.match(layout, /getItem\("paper-trader-theme"\)\|\|"midnight"/);
  assert.match(provider, /useState<ThemePreference>\("midnight"\)/);
  assert.match(provider, /\? stored : "midnight"/);
});
