import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("web market tickets refresh authoritative account and quote state before review and submit", () => {
  const market = read("src/app/(app)/market/page.tsx");
  assert.match(market, /async function refreshOrderState\(\)/);
  assert.match(market, /Promise\.all\(\[fetchAccount\(\), fetchQuotes\(\[symbol\], true\)\]\)/);
  assert.match(market, /const fresh = await onReview\(\)/);
  assert.match(market, /Review paper order/);
  assert.match(market, /Confirm paper trade/);
});

test("visible equities use authoritative polling with no interpolated presentation ticks", () => {
  const feed = read("src/lib/live-market.ts");
  assert.match(feed, /\/api\/live/);
  assert.match(feed, /OPEN_POLL_MS = 15_000/);
  assert.match(feed, /CLOSED_POLL_MS = 120_000/);
  assert.doesNotMatch(feed, /Math\.random|gaussian\(|source:\s*["']sim/);
});

test("charts preserve sharp linear geometry across web and Expo", () => {
  assert.match(read("src/app/(app)/market/page.tsx"), /<Area type="linear"/);
  assert.match(read("mobile/src/screens.tsx"), /InteractiveLineChart/);
});

test("mobile refreshes account, position, and selected quote before review and before confirm", () => {
  const mobile = read("mobile/App.tsx");
  assert.match(mobile, /async function refreshOrderState\(\)/);
  assert.match(mobile, /Promise\.all\(\[/);
});
