// Pure, DB-free math for binary prediction contracts (Polymarket/Robinhood model).
// Prices are implied probabilities 0..1; shares settle at $1 (win) or $0 (lose).

export type Outcome = "yes" | "no";

export const MAX_TICKET_USD = 10_000;

export function isOutcome(v: unknown): v is Outcome {
  return v === "yes" || v === "no";
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BuyQuote {
  ok: boolean;
  error?: string;
  shares?: number;
  cost?: number;
}

/** shares = stake_usd / price, floored to whole shares (Polymarket uses whole shares). */
export function quoteBuy(stakeUsd: number, price: number): BuyQuote {
  if (!Number.isFinite(stakeUsd) || stakeUsd <= 0) return { ok: false, error: "stake must be > 0" };
  if (stakeUsd > MAX_TICKET_USD) return { ok: false, error: `stake exceeds ${MAX_TICKET_USD} limit` };
  if (!Number.isFinite(price) || price <= 0 || price >= 1) return { ok: false, error: "price must be between 0 and 1 exclusive" };
  return { ok: true, shares: Math.floor((stakeUsd / price) * 100) / 100, cost: round2((Math.floor((stakeUsd / price) * 100) / 100) * price) };
}

export interface SellQuote {
  ok: boolean;
  error?: string;
  proceeds?: number;
  realizedPnl?: number;
}

/** Close-early sell: proceeds = shares * current price; P&L vs avg cost. */
export function quoteSell(shares: number, avgCost: number, price: number, heldShares: number): SellQuote {
  if (!Number.isFinite(shares) || shares <= 0) return { ok: false, error: "shares must be > 0" };
  if (shares > heldShares + 1e-9) return { ok: false, error: `insufficient shares (have ${heldShares})` };
  if (!Number.isFinite(price) || price < 0 || price > 1) return { ok: false, error: "price must be between 0 and 1" };
  const proceeds = round2(shares * price);
  const cost = round2(shares * avgCost);
  return { ok: true, proceeds, realizedPnl: round2(proceeds - cost) };
}

/** Mark-to-market value of an open position at the live price. */
export function positionValue(shares: number, price: number): number {
  return round2(shares * price);
}

/** Settlement payout for held shares: $1 per winning share, $0 for losing. */
export function settlePayout(shares: number, won: boolean): number {
  return won ? round2(shares) : 0;
}
