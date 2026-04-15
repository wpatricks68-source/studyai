alter table public.profiles
add column if not exists plan_tier text not null default 'gratuito'
check (plan_tier in ('gratuito', 'basico', 'premium'));

create table if not exists public.usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  alto_busca_count integer not null default 0,
  advanced_busca_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_daily_non_negative check (
    alto_busca_count >= 0 and
    advanced_busca_count >= 0
  ),
  constraint usage_daily_unique_user_date unique (user_id, usage_date)
);

create index if not exists usage_daily_user_date_idx
  on public.usage_daily (user_id, usage_date desc);

alter table public.usage_daily enable row level security;

create policy "usage_daily_select_own"
  on public.usage_daily
  for select
  using (auth.uid() = user_id);

create policy "usage_daily_insert_own"
  on public.usage_daily
  for insert
  with check (auth.uid() = user_id);

create policy "usage_daily_update_own"
  on public.usage_daily
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "usage_daily_delete_own"
  on public.usage_daily
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_usage_daily_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists usage_daily_set_updated_at on public.usage_daily;

create trigger usage_daily_set_updated_at
before update on public.usage_daily
for each row
execute function public.set_usage_daily_updated_at();
