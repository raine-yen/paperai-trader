export type PerformancePosition = {
  qty: number;
  avg_entry_price: number;
  current_price?: number;
  market_value?: number;
};

export type InvestedPerformance = {
  cost_basis: number;
  market_value: number;
  gain_amount: number;
  growth_pct: number;
};

/**
 * Measures the growth of capital currently deployed in open positions.
 * This intentionally avoids the account's fixed starting_cash value: buying
 * and selling changes the amount actually invested over time.
 */
export function calculateInvestedPerformance(positions: PerformancePosition[]): InvestedPerformance {
  let costBasis = 0;
  let marketValue = 0;

  for (const position of positions) {
    const qty = finiteNumber(position.qty);
    const averageEntry = finiteNumber(position.avg_entry_price);
    const positionMarketValue = Number.isFinite(Number(position.market_value))
      ? Number(position.market_value)
      : qty * finiteNumber(position.current_price ?? averageEntry);

    costBasis += qty * averageEntry;
    marketValue += positionMarketValue;
  }

  const gainAmount = marketValue - costBasis;
  return {
    cost_basis: costBasis,
    market_value: marketValue,
    gain_amount: gainAmount,
    growth_pct: costBasis > 0 ? (gainAmount / costBasis) * 100 : 0,
  };
}

function finiteNumber(value: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
