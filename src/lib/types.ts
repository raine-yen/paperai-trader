// Database row types — mirror schema.sql

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";
export type OrderStatus =
  | "new"
  | "filled"
  | "partially_filled"
  | "canceled"
  | "rejected"
  | "expired";
export type TimeInForce = "gtc" | "day" | "ioc";

export interface Account {
  id: string;
  user_id: string;
  competition_id: string;
  display_name: string;
  cash: number;
  starting_cash: number;
  equity: number;
  status: "active" | "disabled";
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  account_id: string;
  key_id: string;
  secret_hash: string;
  label: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  account_id: string;
  symbol: string;
  qty: number;
  side: OrderSide;
  type: OrderType;
  limit_price: number | null;
  time_in_force: TimeInForce;
  status: OrderStatus;
  filled_qty: number;
  filled_avg_price: number | null;
  client_order_id: string | null;
  reject_reason: string | null;
  scheduled_at: string | null;
  created_at: string;
  filled_at: string | null;
  canceled_at: string | null;
}

export interface Position {
  id: string;
  account_id: string;
  symbol: string;
  qty: number;
  avg_entry_price: number;
  created_at: string;
  updated_at: string;
}

export interface Fill {
  id: string;
  order_id: string;
  account_id: string;
  symbol: string;
  qty: number;
  price: number;
  side: OrderSide;
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  description: string | null;
  starting_cash: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "ended";
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  account_id: string;
  competition_id: string;
  display_name: string;
  equity: number;
  starting_cash: number;
  return_pct: number;
  created_at: string;
}

// Alpaca-style API response shapes
export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  equity: string;
  last_equity: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: OrderType;
  type: OrderType;
  side: OrderSide;
  time_in_force: TimeInForce;
  limit_price: string | null;
  stop_price: string | null;
  status: OrderStatus;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  avg_entry_price: string;
  side: "long" | "short";
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  lastday_price: string | null;
  change_today: string;
}
