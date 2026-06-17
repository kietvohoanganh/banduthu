create table if not exists public.seller_app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.seller_app_state enable row level security;

drop policy if exists "seller app state anon read" on public.seller_app_state;
create policy "seller app state anon read"
on public.seller_app_state
for select
to anon
using (true);

drop policy if exists "seller app state anon insert" on public.seller_app_state;
create policy "seller app state anon insert"
on public.seller_app_state
for insert
to anon
with check (true);

drop policy if exists "seller app state anon update" on public.seller_app_state;
create policy "seller app state anon update"
on public.seller_app_state
for update
to anon
using (true)
with check (true);
