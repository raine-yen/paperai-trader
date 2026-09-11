import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveChartRequest } from "../src/lib/prices.ts";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("stock chart ranges select provider-supported resolutions", () => {
  assert.deepEqual(resolveChartRequest("1h"), { interval: "1m", yahooRange: "1d", trailingBars: 60 });
  assert.deepEqual(resolveChartRequest("1d"), { interval: "5m", yahooRange: "1d", trailingBars: null });
  assert.deepEqual(resolveChartRequest("5d"), { interval: "15m", yahooRange: "5d", trailingBars: null });
  assert.deepEqual(resolveChartRequest("1mo"), { interval: "1h", yahooRange: "1mo", trailingBars: null });
  assert.deepEqual(resolveChartRequest("3mo"), { interval: "1d", yahooRange: "3mo", trailingBars: null });
  assert.deepEqual(resolveChartRequest("1y"), { interval: "1d", yahooRange: "1y", trailingBars: null });
});

test("stock charts cancel obsolete range loads and identify real market data", () => {
  const market = read("src/app/(app)/market/page.tsx");
  assert.match(market, /new AbortController\(\)/);
  assert.match(market, /signal: controller\.signal/);
  assert.match(market, /Market data unavailable/);
  assert.doesNotMatch(market, /Illustrative chart data unavailable/);
  assert.doesNotMatch(market, /Illustrative price/);
});
