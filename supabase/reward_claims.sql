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

alter table reward_claims enable row level security;

drop policy if exists "users see own reward claims" on reward_claims;
create policy "users see own reward claims" on reward_claims for select using (
  exists (select 1 from accounts a where a.id = reward_claims.account_id and a.user_id = auth.uid())
);

notify pgrst, 'reload schema';
