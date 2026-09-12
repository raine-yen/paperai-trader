export type QuestTier = "starter" | "active" | "advanced";

export type AdaptiveQuest = { id: string; title: string; description: string; progress: number; goal: number; reward: string };
export type DailyQuestStats = { lifetimeOrders: number; filledOrders: number; uniqueSymbols: number; buyOrders: number; sellOrders: number; limitOrders: number; predictionTrades: number };

export function getDailyQuestCycle(now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return { id: `daily-${date}`, label: date };
}

export function getQuestTier(lifetimeOrders: number): QuestTier {
  if (lifetimeOrders >= 50) return "advanced";
  if (lifetimeOrders >= 10) return "active";
  return "starter";
}

export function getAdaptiveQuests(stats: DailyQuestStats): { tier: QuestTier; quests: AdaptiveQuest[] } {
  const tier = getQuestTier(stats.lifetimeOrders);
  const common: AdaptiveQuest[] = [
    { id: "prediction-desk", title: "Outcome Reader", description: "Place one prediction-market paper trade today.", progress: stats.predictionTrades, goal: 1, reward: "200 recognition points" },
    { id: "limit-plan", title: "Price Plan", description: "Submit one limit order today.", progress: stats.limitOrders, goal: 1, reward: "200 recognition points" },
  ];
  if (tier === "starter") return { tier, quests: [
    { id: "opening-trade", title: "Opening Trade", description: "Complete one stock or crypto paper trade today.", progress: stats.filledOrders, goal: 1, reward: "200 recognition points" },
    { id: "two-symbol-scan", title: "Market Scan", description: "Trade two different symbols today.", progress: stats.uniqueSymbols, goal: 2, reward: "200 recognition points" },
    ...common,
    { id: "two-trade-session", title: "Practice Session", description: "Complete two stock or crypto paper trades today.", progress: stats.filledOrders, goal: 2, reward: "200 recognition points" },
  ] };
  if (tier === "active") return { tier, quests: [
    { id: "active-session", title: "Active Session", description: "Complete three stock or crypto paper trades today.", progress: stats.filledOrders, goal: 3, reward: "200 recognition points" },
    { id: "three-symbol-scan", title: "Broad Scan", description: "Trade three different symbols today.", progress: stats.uniqueSymbols, goal: 3, reward: "200 recognition points" },
    ...common,
    { id: "two-sided-desk", title: "Two-Sided Desk", description: "Complete both a buy and a sell today.", progress: Math.min(stats.buyOrders, stats.sellOrders), goal: 1, reward: "200 recognition points" },
  ] };
  return { tier, quests: [
    { id: "advanced-session", title: "Advanced Session", description: "Complete four stock or crypto paper trades today.", progress: stats.filledOrders, goal: 4, reward: "200 recognition points" },
    { id: "four-symbol-scan", title: "Wide Scan", description: "Trade four different symbols today.", progress: stats.uniqueSymbols, goal: 4, reward: "200 recognition points" },
    ...common,
    { id: "two-sided-desk", title: "Two-Sided Desk", description: "Complete both a buy and a sell today.", progress: Math.min(stats.buyOrders, stats.sellOrders), goal: 1, reward: "200 recognition points" },
  ] };
}
