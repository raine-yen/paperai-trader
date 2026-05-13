import type { Account, Order, Position, AlpacaAccount, AlpacaOrder, AlpacaPosition } from "@/lib/types";

export function toAlpacaAccount(a: Account): AlpacaAccount {
  return {
    id: a.id,
    account_number: a.id.slice(0, 8).toUpperCase(),
    status: "ACTIVE",
    currency: "USD",
    cash: String(Number(a.cash).toFixed(2)),
    portfolio_value: String(Number(a.equity).toFixed(2)),
    buying_power: String(Number(a.cash).toFixed(2)),
    equity: String(Number(a.equity).toFixed(2)),
    last_equity: String(Number(a.equity).toFixed(2)),
    pattern_day_trader: false,
    trading_blocked: a.status !== "active",
    transfers_blocked: false,
    account_blocked: a.status !== "active",
    created_at: a.created_at,
  };
}

export function toAlpacaOrder(o: Order): AlpacaOrder {
  return {
    id: o.id,
    client_order_id: o.client_order_id,
    created_at: o.created_at,
    updated_at: o.filled_at ?? o.canceled_at ?? o.created_at,
    submitted_at: o.created_at,
    filled_at: o.filled_at,
    expired_at: null,
    canceled_at: o.canceled_at,
    asset_id: o.symbol,
    symbol: o.symbol,
    asset_class: "us_equity",
    qty: String(o.qty),
    filled_qty: String(o.filled_qty),
    filled_avg_price: o.filled_avg_price != null ? String(o.filled_avg_price) : null,
    order_class: "simple",
    order_type: o.type,
    type: o.type,
    side: o.side,
    time_in_force: o.time_in_force,
    limit_price: o.limit_price != null ? String(o.limit_price) : null,
    stop_price: null,
    status: o.status,
  };
}

export function toAlpacaPosition(p: Position, currentPrice: number): AlpacaPosition {
  const qty = Number(p.qty);
  const avg = Number(p.avg_entry_price);
  const marketValue = qty * currentPrice;
  const costBasis = qty * avg;
  const unrealizedPL = marketValue - costBasis;
  const unrealizedPLPC = costBasis === 0 ? 0 : unrealizedPL / costBasis;
  return {
    asset_id: p.symbol,
    symbol: p.symbol,
    exchange: "NASDAQ",
    asset_class: "us_equity",
    qty: String(qty),
    avg_entry_price: String(avg.toFixed(4)),
    side: "long",
    market_value: String(marketValue.toFixed(2)),
    cost_basis: String(costBasis.toFixed(2)),
    unrealized_pl: String(unrealizedPL.toFixed(2)),
    unrealized_plpc: String(unrealizedPLPC.toFixed(6)),
    current_price: String(currentPrice.toFixed(2)),
    lastday_price: null,
    change_today: "0",
  };
}
