import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("market watchlist persists through the authenticated watchlists API", async () => {
  const page = await source("src/app/(app)/market/page.tsx");
  assert.match(page, /fetch\("\/api\/watchlists"/);
  assert.match(page, /method: watched \? "DELETE" : "POST"/);
  assert.doesNotMatch(page, /from "@\/lib\/watchlist-storage"/);
});

test("market discovery presents crypto and read-only Polymarket research", async () => {
  const page = await source("src/app/(app)/market/page.tsx");
  const route = await source("src/app/api/prediction-markets/route.ts");
  const sync = await source("src/lib/prediction-sync.ts");
  assert.match(page, /Crypto & Prediction Markets/);
  assert.match(page, /\/api\/prediction-markets/);
  assert.match(page, /Paper research only/);
  // Gamma URL now lives in the shared, unit-tested prediction-sync lib;
  // the route imports its fetchers rather than inlining the URL.
  assert.match(route, /from "@\/lib\/prediction-sync"/);
  assert.match(sync, /gamma-api\.polymarket\.com/);
  assert.match(route, /export async function GET/);
});
