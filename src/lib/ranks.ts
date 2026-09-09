export const STARTING_CASH = 10_000;

export const RANK_TIERS = [
  { tier: 1, name: "Iron", minPct: -Infinity },
  { tier: 2, name: "Bronze", minPct: 1 },
  { tier: 3, name: "Silver", minPct: 5 },
  { tier: 4, name: "Gold", minPct: 15 },
  { tier: 5, name: "Diamond", minPct: 40 },
] as const;

export type RankTierName = (typeof RANK_TIERS)[number]["name"];

export interface RankInput {
  equity: number;
  startingCash: number;
}

export interface Rank {
  /** Portfolio-relative return in percent: (equity - startingCash) / startingCash * 100. */
  returnPct: number;
  tier: number;
  tierName: RankTierName;
  division: number;
  rankPoints: number;
}

export function tierForReturnPct(returnPct: number): (typeof RANK_TIERS)[number] {
  let selected = RANK_TIERS[0];
  for (const candidate of RANK_TIERS) if (returnPct >= candidate.minPct) selected = candidate;
  return selected;
}

/**
 * Portfolio-relative return. Never divides by invested cost basis and never
 * assumes the default 10k for accounts that were re-seeded with other amounts.
 */
export function portfolioReturnPct({ equity, startingCash }: RankInput): number {
  const start = Number(startingCash);
  if (!Number.isFinite(start) || start <= 0) return 0;
  return ((Number(equity) - start) / start) * 100;
}

/**
 * Rank profile for one account. Divisions split a tier into bands of three
 * point-percentiles each (Diamond starts at 40%, then 50%, 60%, …).
 */
export function rankForAccount({ equity, startingCash }: RankInput): Rank {
  const returnPct = portfolioReturnPct({ equity, startingCash });
  const tierInfo = tierForReturnPct(returnPct);
  const rankPoints = Math.max(0, Math.round(returnPct * 100) / 100);
  const division =
    tierInfo.tier === 5 ? 1 + Math.floor(Math.max(0, returnPct - 40) / 10) : 1 + Math.floor(Math.max(0, returnPct - tierInfo.minPct) / 3);
  return { returnPct, tier: tierInfo.tier, tierName: tierInfo.name, division: Math.min(division, 10), rankPoints };
}

export type RankMovement = "up" | "down" | "new" | "same";

export interface MovementInput {
  current: number;
  previous?: number | null;
  previousSeen?: boolean;
}

/** Movement is expressed in positions: positive means the user climbed the board. */
export function rankMovement({ current, previous, previousSeen = true }: MovementInput): { movement: RankMovement; movementAmount: number } {
  if (!previousSeen || previous == null) return { movement: "new", movementAmount: 0 };
  const delta = previous - current;
  if (delta > 0) return { movement: "up", movementAmount: delta };
  if (delta < 0) return { movement: "down", movementAmount: -delta };
  return { movement: "same", movementAmount: 0 };
}
