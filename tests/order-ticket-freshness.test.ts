import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("web market tickets refresh authoritative account and quote state before review and submit", () => {
  const market = read("src/app/(app)/market/page.tsx");

  assert.match(market, /async function refreshOrderState\(\)/);
  assert.match(market, /await Promise\.all\(\[fetchAccount\(\), fetchQuotes\(\[symbol\], true\)\]\)/);
  assert.match(market, /onReview=\{refreshOrderState\}/);
  assert.match(market, /const fresh = await onReview\(\);/);
  assert.match(market, /setReviewing\(true\)/);
  assert.match(market, /await onTraded\(\)/);
});

test("visible web equities are driven by the shared live feed and real anchors poll every 750ms", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const feed = read("src/lib/live-market.ts");

  assert.match(market, /import \{ getMarketFeed \} from "@\/lib\/live-market"/);
  assert.match(market, /feed\.watch\(visibleSymbols\)/);
  assert.match(market, /feed\.subscribe/);
  assert.match(feed, /export const EQUITY_ANCHOR_MS = 750/);
  assert.match(feed, /}, EQUITY_ANCHOR_MS\)/);
});

test("charts preserve sharp linear geometry across web and Expo", () => {
  const market = read("src/app/(app)/market/page.tsx");
  const equity = read("src/components/equity-chart.tsx");
  const mobile = read("mobile/src/charts.tsx");

  assert.match(market, /<Area type="linear"/);
  assert.doesNotMatch(market, /<Area type="monotone"/);
  assert.match(equity, /type="linear"/);
  assert.match(equity, /stroke=\{isUp \? "#c8ff00"/);
  assert.match(mobile, /curveLinear/);
  assert.match(mobile, /\.curve\(curveLinear\)/);
  assert.match(mobile, /strokeLinejoin="miter" strokeLinecap="square"/);
});

test("mobile refreshes account, position, and selected quote before review and before confirm", () => {
  const app = read("mobile/App.tsx");

  assert.match(app, /async function refreshOrderState\(\)/);
  assert.match(app, /const \[nextMe, nextQuote\] = await Promise\.all\(/);
  assert.match(app, /const fresh = await refreshOrderState\(\);/);
  assert.match(app, /setOrderStageState\("review"\)/);
  assert.match(app, /const fresh = await refreshOrderState\(\);/);
  assert.match(app, /await refreshAll\(false\);/);
});
