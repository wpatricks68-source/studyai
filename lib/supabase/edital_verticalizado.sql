create extension if not exists pgcrypto;

create table if not exists public.edital_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_file_name text,
  source_file_type text,
  source_excerpt text,
  ai_provider text,
  ai_model text,
  last_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists edital_boards_user_updated_idx
  on public.edital_boards (user_id, updated_at desc);

alter table public.edital_boards enable row level security;

drop policy if exists "edital_boards_select_own" on public.edital_boards;
create policy "edital_boards_select_own"
  on public.edital_boards
  for select
  using (auth.uid() = user_id);

drop policy if exists "edital_boards_insert_own" on public.edital_boards;
create policy "edital_boards_insert_own"
  on public.edital_boards
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "edital_boards_update_own" on public.edital_boards;
create policy "edital_boards_update_own"
  on public.edital_boards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "edital_boards_delete_own" on public.edital_boards;
create policy "edital_boards_delete_own"
  on public.edital_boards
  for delete
  using (auth.uid() = user_id);

create table if not exists public.edital_topics (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.edital_boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  disciplina text not null,
  tema text not null,
  subtema text not null,
  estudo boolean not null default false,
  resumo boolean not null default false,
  revisao_1 boolean not null default false,
  revisao_2 boolean not null default false,
  revisao_3 boolean not null default false,
  concluido boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.edital_topics
  add column if not exists revisao_1 boolean not null default false,
  add column if not exists revisao_2 boolean not null default false,
  add column if not exists revisao_3 boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'edital_topics'
      and column_name = 'revisao'
  ) then
    execute '
      update public.edital_topics
      set revisao_1 = true
      where coalesce(revisao, false) = true
        and coalesce(revisao_1, false) = false
    ';
  end if;
end
$$;

create index if not exists edital_topics_board_order_idx
  on public.edital_topics (board_id, disciplina, order_index, created_at);

create index if not exists edital_topics_user_board_idx
  on public.edital_topics (user_id, board_id);

alter table public.edital_topics enable row level security;

drop policy if exists "edital_topics_select_own" on public.edital_topics;
create policy "edital_topics_select_own"
  on public.edital_topics
  for select
  using (auth.uid() = user_id);

drop policy if exists "edital_topics_insert_own" on public.edital_topics;
create policy "edital_topics_insert_own"
  on public.edital_topics
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "edital_topics_update_own" on public.edital_topics;
create policy "edital_topics_update_own"
  on public.edital_topics
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "edital_topics_delete_own" on public.edital_topics;
create policy "edital_topics_delete_own"
  on public.edital_topics
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_generic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists edital_boards_set_updated_at on public.edital_boards;
create trigger edital_boards_set_updated_at
before update on public.edital_boards
for each row
execute function public.set_generic_updated_at();

drop trigger if exists edital_topics_set_updated_at on public.edital_topics;
create trigger edital_topics_set_updated_at
before update on public.edital_topics
for each row
execute function public.set_generic_updated_at();
