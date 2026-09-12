import assert from "node:assert/strict";
import test from "node:test";
import { getAdaptiveQuests, getDailyQuestCycle } from "../src/lib/adaptive-quests.ts";

const emptyStats = { lifetimeOrders: 0, filledOrders: 0, uniqueSymbols: 0, buyOrders: 0, sellOrders: 0, limitOrders: 0, predictionTrades: 0 };

test("daily quest cycle changes with the calendar day", () => {
  assert.equal(getDailyQuestCycle(new Date("2026-09-12T23:59:59Z")).id, "daily-2026-09-12");
  assert.equal(getDailyQuestCycle(new Date("2026-09-13T00:00:00Z")).id, "daily-2026-09-13");
});

test("quest difficulty rises with completed-order experience while progress stays daily", () => {
  const starter = getAdaptiveQuests({ ...emptyStats, lifetimeOrders: 9 });
  const active = getAdaptiveQuests({ ...emptyStats, lifetimeOrders: 10 });
  const advanced = getAdaptiveQuests({ ...emptyStats, lifetimeOrders: 50 });
  assert.equal(starter.tier, "starter");
  assert.equal(active.tier, "active");
  assert.equal(advanced.tier, "advanced");
  assert.equal(advanced.quests.find((quest) => quest.id === "advanced-session")?.goal, 4);
  assert.equal(advanced.quests.find((quest) => quest.id === "advanced-session")?.progress, 0);
});
