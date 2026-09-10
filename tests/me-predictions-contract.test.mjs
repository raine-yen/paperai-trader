// Contract: /api/me stays additive (mobile Me type still parses) and folds
// prediction value into combined equity, per Task 11.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("/api/me computes equity as cash + stock positions + prediction positions", async () => {
  const route = await source("src/app/api/me/route.ts");
  assert.match(route, /const equity = Number\(account\.cash\) \+ positionsValue \+ predictionPositionsValue;/);
});

test("/api/me response adds prediction fields without removing existing keys", async () => {
  const route = await source("src/app/api/me/route.ts");
  // Existing top-level keys the mobile client already parses must remain.
  for (const key of ["user:", "account:", "performance,", "positions:", "orders:", "fills:", "snapshots:", "watchlist:", "alerts:", "profile:", "unread_messages:", "competition:"]) {
    assert.ok(route.includes(key), `expected /api/me response to still include ${key}`);
  }
  // New additive fields.
  assert.match(route, /prediction_positions: predictionPositionsWithMarket/);
  assert.match(route, /prediction_positions_value: predictionPositionsValue/);
  assert.match(route, /prediction_fills: predictionFills/);
  assert.match(route, /prediction_positions_value: predictionPositionsValue.*\}/); // present on account too
});

test("mobile Me type gains optional prediction fields, existing fields untouched", async () => {
  const types = await source("mobile/src/types.ts");
  assert.match(types, /prediction_positions\?: PredictionPosition\[\]/);
  assert.match(types, /prediction_positions_value\?: number/);
  assert.match(types, /prediction_fills\?: PredictionFill\[\]/);
  // Original required/optional Me fields still present (additive, not renamed).
  assert.match(types, /account: Account \| null/);
  assert.match(types, /positions: Position\[\]/);
  assert.match(types, /orders: Order\[\]/);
});
