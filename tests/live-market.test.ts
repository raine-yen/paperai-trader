import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const feedFile = readFileSync(resolve(import.meta.dirname, "../src/lib/live-market.ts"), "utf8");

test("equity presentation feed never generates a random or simulated quote", () => {
  assert.doesNotMatch(feedFile, /Math\.random|gaussian\(|micro-walk|source:\s*["']sim/);
  assert.match(feedFile, /fetch\(`\/api\/live/);
  assert.match(feedFile, /providerTimestamp/);
});

test("closed-market polling is deliberately slow and authoritative polling remains available", () => {
  assert.match(feedFile, /export const OPEN_POLL_MS = 15_000/);
  assert.match(feedFile, /export const CLOSED_POLL_MS = 120_000/);
  assert.match(feedFile, /marketState === "open"/);
});
