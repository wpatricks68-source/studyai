create extension if not exists pgcrypto;

create table if not exists public.planner_revision_rows (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_type text check (revision_type is null or revision_type in ('partial', 'general')),
  subject_ids text[] not null default '{}',
  comment text,
  revision_date date,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planner_revision_rows_user_order_idx
  on public.planner_revision_rows (user_id, order_index, created_at);

alter table public.planner_revision_rows enable row level security;

drop policy if exists "planner_revision_rows_select_own" on public.planner_revision_rows;
create policy "planner_revision_rows_select_own"
  on public.planner_revision_rows
  for select
  using (auth.uid() = user_id);

drop policy if exists "planner_revision_rows_insert_own" on public.planner_revision_rows;
create policy "planner_revision_rows_insert_own"
  on public.planner_revision_rows
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "planner_revision_rows_update_own" on public.planner_revision_rows;
create policy "planner_revision_rows_update_own"
  on public.planner_revision_rows
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "planner_revision_rows_delete_own" on public.planner_revision_rows;
create policy "planner_revision_rows_delete_own"
  on public.planner_revision_rows
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_planner_revision_rows_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planner_revision_rows_set_updated_at on public.planner_revision_rows;

create trigger planner_revision_rows_set_updated_at
before update on public.planner_revision_rows
for each row
execute function public.set_planner_revision_rows_updated_at();
