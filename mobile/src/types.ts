export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

export type Tab = "portfolio" | "discover" | "compete" | "profile";
export type DiscoverView = "list" | "detail" | "order";
export type Side = "buy" | "sell";
export type OrderType = "market" | "limit";
export type AmountMode = "shares" | "dollars";

export type Account = {
  id: string;
  display_name: string;
  cash: number;
  equity: number;
  starting_cash: number;
  positions_value: number;
  status?: string;
};

export type Position = {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
};

export type Order = {
  id: string;
  symbol: string;
  qty: number;
  side: Side;
  type: OrderType;
  status: string;
  filled_avg_price?: number | null;
  created_at?: string | null;
};

export type Fill = {
  id: string;
  symbol: string;
  qty: number;
  price: number;
  side: string;
  created_at: string;
};

export type Snapshot = {
  equity: number;
  cash?: number;
  positions_value?: number;
  created_at: string;
};

export type WatchItem = {
  id?: string;
  symbol: string;
  note?: string | null;
  price?: number | null;
  changePct?: number | null;
};

export type PriceAlert = {
  id: string;
  symbol: string;
  direction: "above" | "below" | "move" | string;
  target_price?: number | null;
  move_pct?: number | null;
  status: string;
  created_at?: string;
};

export type TraderProfile = {
  avatar_url?: string | null;
  bio?: string | null;
  strategy?: string | null;
  risk_style?: string | null;
};

export type Me = {
  user?: { id?: string; email?: string };
  account: Account | null;
  positions: Position[];
  orders: Order[];
  fills?: Fill[];
  snapshots?: Snapshot[];
  watchlist?: WatchItem[];
  alerts?: PriceAlert[];
  unread_messages?: number;
  competition?: { rank: number | null; participants: number; return_pct: number };
  profile?: TraderProfile | null;
  transfers?: Array<Record<string, unknown>>;
  is_admin?: boolean;
};

export type Quote = {
  symbol?: string;
  price: number;
  prevClose?: number | null;
  name?: string | null;
  exchange?: string | null;
  change?: number | null;
  changePercent?: number | null;
  marketCap?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  epsTrailingTwelveMonths?: number | null;
  volume?: number | null;
  averageVolume?: number | null;
  open?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
  updatedAt?: string;
};

export type Bar = {
  t: string;
  o?: number;
  h?: number;
  l?: number;
  c: number;
  v?: number;
};

export type ApiKey = {
  id: string;
  key_id: string;
  label?: string | null;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
};

export type AdminAccount = Account & {
  email?: string;
  return_pct?: number;
  position_count?: number;
  order_count?: number;
  positions?: Array<{
    symbol: string;
    qty: number;
    avg_entry_price: number;
    current_price: number;
    market_value: number;
  }>;
};

export type AdminReport = {
  id: string;
  status: string;
  reason: string;
  message_id: string;
  created_at: string;
  direct_messages?: { body?: string; sender_account_id?: string; recipient_account_id?: string };
};

export type AdminData = {
  accounts: AdminAccount[];
  stats: {
    total_users: number;
    total_orders: number;
    total_equity: number;
    avg_return_pct: number;
    open_reports: number;
    transfers?: number;
  };
  moderation: {
    reports: AdminReport[];
    transfers?: Array<Record<string, unknown>>;
    blocks?: Array<Record<string, unknown>>;
  };
};

export type ApiCall = <T>(path: string, options?: RequestInit) => Promise<T>;
