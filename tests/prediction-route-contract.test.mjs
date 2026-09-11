import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const route = readFileSync(resolve(root, "src/app/api/prediction-markets/route.ts"), "utf8");

test("a failed legacy quote repair preserves the readable cached catalog", () => {
  assert.match(route, /catalogNeedsQuoteRepair\(rows\)[\s\S]*?try\s*\{/);
  assert.match(route, /Legacy catalog repair failed; serving cached rows/);
});
