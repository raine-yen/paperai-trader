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
  created_at timestamptz not null default now(),
  filled_at timestamptz,
  canceled_at timestamptz
);

create index if not exists idx_orders_account on orders(account_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_symbol on orders(symbol);

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

drop policy if exists "anyone sees competitions" on competitions;
create policy "anyone sees competitions" on competitions for select using (true);

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
