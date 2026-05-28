-- Paper Trader: full schema
-- Run this once in Supabase SQL Editor (Project → SQL Editor → New Query → paste → Run)

-- =====================================================================
-- COMPETITIONS
-- =====================================================================
create table if not exists competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starting_cash numeric not null default 100000,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  status text not null default 'active' check (status in ('active','ended')),
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Seed one default open-ended competition that everyone joins by default
insert into competitions (name, description, starting_cash, is_default, status)
select 'Club Sandbox', 'Always-on practice competition. Trade freely.', 100000, true, 'active'
where not exists (select 1 from competitions where is_default = true);

-- =====================================================================
-- ACCOUNTS — one per (user, competition)
-- =====================================================================
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  competition_id uuid not null references competitions(id) on delete cascade,
  display_name text not null,
  cash numeric not null default 100000,
  starting_cash numeric not null default 100000,
  equity numeric not null default 100000,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  unique(user_id, competition_id)
);

create index if not exists idx_accounts_user on accounts(user_id);
create index if not exists idx_accounts_competition on accounts(competition_id);

-- =====================================================================
-- API KEYS — for AI agents to authenticate
-- =====================================================================
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  key_id text unique not null,
  secret_hash text not null,
  label text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_keys_key_id on api_keys(key_id);
create index if not exists idx_api_keys_user on api_keys(user_id);

-- =====================================================================
-- ORDERS
-- =====================================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  symbol text not null,
  qty numeric not null check (qty > 0),
  side text not null check (side in ('buy','sell')),
  type text not null check (type in ('market','limit')),
  limit_price numeric,
  time_in_force text not null default 'gtc' check (time_in_force in ('gtc','day','ioc')),
  status text not null default 'new' check (status in ('new','filled','partially_filled','canceled','rejected','expired')),
  filled_qty numeric not null default 0,
  filled_avg_price numeric,
  client_order_id text,
  reject_reason text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  filled_at timestamptz,
  canceled_at timestamptz
);

alter table orders add column if not exists scheduled_at timestamptz;

create index if not exists idx_orders_account on orders(account_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_symbol on orders(symbol);
create index if not exists idx_orders_scheduled on orders(scheduled_at);

-- =====================================================================
-- POSITIONS
-- =====================================================================
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  symbol text not null,
  qty numeric not null,
  avg_entry_price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, symbol)
);

create index if not exists idx_positions_account on positions(account_id);

-- =====================================================================
-- FILLS — individual executions, useful for trade history
-- =====================================================================
create table if not exists fills (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  symbol text not null,
  qty numeric not null,
  price numeric not null,
  side text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fills_account on fills(account_id);
create index if not exists idx_fills_order on fills(order_id);

-- =====================================================================
-- PRICES — latest cached prices, refreshed by cron
-- =====================================================================
create table if not exists prices (
  symbol text primary key,
  price numeric not null,
  prev_close numeric,
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- EQUITY SNAPSHOTS — for performance charts and leaderboard history
-- =====================================================================
create table if not exists equity_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  equity numeric not null,
  cash numeric not null,
  positions_value numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_snapshots_account on equity_snapshots(account_id, created_at desc);

-- =====================================================================
-- REWARD CLAIMS — one cash reward per account, quest, and two-week cycle
-- =====================================================================
create table if not exists reward_claims (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  quest_id text not null,
  cycle_id text not null,
  amount numeric not null default 200,
  claimed_at timestamptz not null default now(),
  unique(account_id, quest_id, cycle_id)
);

create index if not exists idx_reward_claims_account on reward_claims(account_id, cycle_id);

-- =====================================================================
-- SOCIAL, DISCOVERY, ALERTS, AND SIMULATED TRANSFERS
-- =====================================================================
create table if not exists trader_profiles (
  account_id uuid primary key references accounts(id) on delete cascade,
  avatar_url text,
  bio text,
  strategy text,
  risk_style text not null default 'balanced' check (risk_style in ('conservative','balanced','aggressive')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trader_profiles add column if not exists avatar_url text;

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  symbol text not null,
  note text,
  created_at timestamptz not null default now(),
  unique(account_id, symbol)
);

create index if not exists idx_watchlists_account on watchlists(account_id, created_at desc);

create table if not exists price_alerts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('above','below','move')),
  target_price numeric,
  move_pct numeric,
  status text not null default 'active' check (status in ('active','triggered','paused','deleted')),
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_price_alerts_account on price_alerts(account_id, status, created_at desc);
create index if not exists idx_price_alerts_symbol on price_alerts(symbol, status);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  code text not null,
  label text not null,
  description text,
  earned_at timestamptz not null default now(),
  unique(account_id, code)
);

create index if not exists idx_achievements_account on achievements(account_id, earned_at desc);

create table if not exists blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_account_id uuid not null references accounts(id) on delete cascade,
  blocked_account_id uuid not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_account_id, blocked_account_id),
  check (blocker_account_id <> blocked_account_id)
);

create index if not exists idx_blocked_users_blocker on blocked_users(blocker_account_id);
create index if not exists idx_blocked_users_blocked on blocked_users(blocked_account_id);

create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_account_id uuid not null references accounts(id) on delete cascade,
  recipient_account_id uuid not null references accounts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  hidden_by_admin boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_account_id <> recipient_account_id)
);

create index if not exists idx_direct_messages_sender on direct_messages(sender_account_id, created_at desc);
create index if not exists idx_direct_messages_recipient on direct_messages(recipient_account_id, created_at desc);

create table if not exists message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references direct_messages(id) on delete cascade,
  reporter_account_id uuid not null references accounts(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_message_reports_status on message_reports(status, created_at desc);

create table if not exists paper_transfers (
  id uuid primary key default gen_random_uuid(),
  sender_account_id uuid not null references accounts(id) on delete cascade,
  recipient_account_id uuid not null references accounts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  status text not null default 'completed' check (status in ('completed','reversed')),
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  check (sender_account_id <> recipient_account_id)
);

create index if not exists idx_paper_transfers_sender on paper_transfers(sender_account_id, created_at desc);
create index if not exists idx_paper_transfers_recipient on paper_transfers(recipient_account_id, created_at desc);

-- =====================================================================
-- ROW LEVEL SECURITY — users only see their own data via UI
-- (API key auth bypasses RLS via service-role key)
-- =====================================================================
alter table accounts enable row level security;
alter table api_keys enable row level security;
alter table orders enable row level security;
alter table positions enable row level security;
alter table fills enable row level security;
alter table equity_snapshots enable row level security;
alter table competitions enable row level security;
alter table reward_claims enable row level security;
alter table trader_profiles enable row level security;
alter table watchlists enable row level security;
alter table price_alerts enable row level security;
alter table achievements enable row level security;
alter table blocked_users enable row level security;
alter table direct_messages enable row level security;
alter table message_reports enable row level security;
alter table paper_transfers enable row level security;

drop policy if exists "users see own accounts" on accounts;
create policy "users see own accounts" on accounts for select using (user_id = auth.uid());

drop policy if exists "users insert own accounts" on accounts;
create policy "users insert own accounts" on accounts for insert with check (user_id = auth.uid());

drop policy if exists "users see own keys" on api_keys;
create policy "users see own keys" on api_keys for select using (user_id = auth.uid());

drop policy if exists "users insert own keys" on api_keys;
create policy "users insert own keys" on api_keys for insert with check (user_id = auth.uid());

drop policy if exists "users update own keys" on api_keys;
create policy "users update own keys" on api_keys for update using (user_id = auth.uid());

drop policy if exists "users see own orders" on orders;
create policy "users see own orders" on orders for select using (
  exists (select 1 from accounts a where a.id = orders.account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own positions" on positions;
create policy "users see own positions" on positions for select using (
  exists (select 1 from accounts a where a.id = positions.account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own fills" on fills;
create policy "users see own fills" on fills for select using (
  exists (select 1 from accounts a where a.id = fills.account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own snapshots" on equity_snapshots;
create policy "users see own snapshots" on equity_snapshots for select using (
  exists (select 1 from accounts a where a.id = equity_snapshots.account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own reward claims" on reward_claims;
create policy "users see own reward claims" on reward_claims for select using (
  exists (select 1 from accounts a where a.id = reward_claims.account_id and a.user_id = auth.uid())
);

drop policy if exists "anyone sees competitions" on competitions;
create policy "anyone sees competitions" on competitions for select using (true);

drop policy if exists "users see public trader profiles" on trader_profiles;
create policy "users see public trader profiles" on trader_profiles for select using (
  is_public = true or exists (select 1 from accounts a where a.id = trader_profiles.account_id and a.user_id = auth.uid())
);

drop policy if exists "users manage own trader profile" on trader_profiles;
create policy "users manage own trader profile" on trader_profiles for all using (
  exists (select 1 from accounts a where a.id = trader_profiles.account_id and a.user_id = auth.uid())
);

drop policy if exists "users manage own watchlists" on watchlists;
create policy "users manage own watchlists" on watchlists for all using (
  exists (select 1 from accounts a where a.id = watchlists.account_id and a.user_id = auth.uid())
);

drop policy if exists "users manage own price alerts" on price_alerts;
create policy "users manage own price alerts" on price_alerts for all using (
  exists (select 1 from accounts a where a.id = price_alerts.account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own achievements" on achievements;
create policy "users see own achievements" on achievements for select using (
  exists (select 1 from accounts a where a.id = achievements.account_id and a.user_id = auth.uid())
);

drop policy if exists "users manage own blocks" on blocked_users;
create policy "users manage own blocks" on blocked_users for all using (
  exists (select 1 from accounts a where a.id = blocked_users.blocker_account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own direct messages" on direct_messages;
create policy "users see own direct messages" on direct_messages for select using (
  exists (select 1 from accounts a where a.id in (direct_messages.sender_account_id, direct_messages.recipient_account_id) and a.user_id = auth.uid())
);

drop policy if exists "users send own direct messages" on direct_messages;
create policy "users send own direct messages" on direct_messages for insert with check (
  exists (select 1 from accounts a where a.id = direct_messages.sender_account_id and a.user_id = auth.uid())
);

drop policy if exists "users report messages" on message_reports;
create policy "users report messages" on message_reports for insert with check (
  exists (select 1 from accounts a where a.id = message_reports.reporter_account_id and a.user_id = auth.uid())
);

drop policy if exists "users see own paper transfers" on paper_transfers;
create policy "users see own paper transfers" on paper_transfers for select using (
  exists (select 1 from accounts a where a.id in (paper_transfers.sender_account_id, paper_transfers.recipient_account_id) and a.user_id = auth.uid())
);

-- Public leaderboard view (no equity_snapshot data, just current standings)
create or replace view leaderboard as
select
  a.id as account_id,
  a.competition_id,
  a.display_name,
  a.equity,
  a.starting_cash,
  ((a.equity - a.starting_cash) / a.starting_cash * 100) as return_pct,
  a.created_at
from accounts a
where a.status = 'active'
order by return_pct desc;

grant select on leaderboard to anon, authenticated;
