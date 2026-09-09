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
  assert.match(page, /Crypto & Prediction Markets/);
  assert.match(page, /\/api\/prediction-markets/);
  assert.match(page, /Paper research only/);
  assert.match(route, /gamma-api\.polymarket\.com/);
  assert.match(route, /export async function GET/);
});
