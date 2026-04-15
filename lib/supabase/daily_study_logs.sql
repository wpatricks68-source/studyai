create extension if not exists pgcrypto;

create table if not exists public.daily_study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  subject text not null,
  target_status text not null default 'parcial' check (target_status in ('nao_concluido', 'parcial', 'concluido')),
  planned_minutes integer not null default 0,
  effective_minutes integer not null default 0,
  description text,
  material text,
  start_page integer,
  end_page integer,
  questions_resolved integer not null default 0,
  correct_answers integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_study_logs_non_negative check (
    planned_minutes >= 0 and
    effective_minutes >= 0 and
    questions_resolved >= 0 and
    correct_answers >= 0
  ),
  constraint daily_study_logs_correct_answers check (correct_answers <= questions_resolved)
);

create index if not exists daily_study_logs_user_date_idx
  on public.daily_study_logs (user_id, study_date desc, created_at desc);

alter table public.daily_study_logs enable row level security;

create policy "daily_study_logs_select_own"
  on public.daily_study_logs
  for select
  using (auth.uid() = user_id);

create policy "daily_study_logs_insert_own"
  on public.daily_study_logs
  for insert
  with check (auth.uid() = user_id);

create policy "daily_study_logs_update_own"
  on public.daily_study_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_study_logs_delete_own"
  on public.daily_study_logs
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_daily_study_logs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_study_logs_set_updated_at on public.daily_study_logs;

create trigger daily_study_logs_set_updated_at
before update on public.daily_study_logs
for each row
execute function public.set_daily_study_logs_updated_at();
