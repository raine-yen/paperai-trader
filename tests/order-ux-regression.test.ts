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
