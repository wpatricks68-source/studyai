alter table public.profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));

alter table public.profiles enable row level security;

create index if not exists profiles_role_idx
  on public.profiles (role);

create index if not exists profiles_plan_tier_idx
  on public.profiles (plan_tier);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'usage_daily'
  ) then
    execute 'create index if not exists usage_daily_usage_date_idx on public.usage_daily (usage_date desc)';
  end if;
end;
$$;

create or replace function public.enforce_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  acting_is_admin boolean := public.is_admin(acting_user_id);
begin
  if acting_user_id is null then
    raise exception 'Authentication required to change profiles.';
  end if;

  if tg_op = 'INSERT' then
    if not acting_is_admin then
      if new.id is distinct from acting_user_id then
        raise exception 'You can only create your own profile.';
      end if;

      new.role := 'user';
      new.plan_tier := 'gratuito';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if not acting_is_admin then
      if new.id is distinct from acting_user_id then
        raise exception 'You can only update your own profile.';
      end if;

      if new.role is distinct from old.role then
        raise exception 'Only admins can change role.';
      end if;

      if new.plan_tier is distinct from old.plan_tier then
        raise exception 'Only admins can change plan tier.';
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_admin_fields on public.profiles;

create trigger profiles_enforce_admin_fields
before insert or update on public.profiles
for each row
execute function public.enforce_profile_admin_fields();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own_or_admin'
  ) then
    execute $policy$
      create policy "profiles_select_own_or_admin"
        on public.profiles
        for select
        using (auth.uid() = id or public.is_admin(auth.uid()))
    $policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own_or_admin'
  ) then
    execute $policy$
      create policy "profiles_insert_own_or_admin"
        on public.profiles
        for insert
        with check (auth.uid() = id or public.is_admin(auth.uid()))
    $policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own_or_admin'
  ) then
    execute $policy$
      create policy "profiles_update_own_or_admin"
        on public.profiles
        for update
        using (auth.uid() = id or public.is_admin(auth.uid()))
        with check (auth.uid() = id or public.is_admin(auth.uid()))
    $policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_delete_admin'
  ) then
    execute $policy$
      create policy "profiles_delete_admin"
        on public.profiles
        for delete
        using (public.is_admin(auth.uid()))
    $policy$;
  end if;
end;
$$;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_user_id_idx
  on public.admin_audit_logs (admin_user_id, created_at desc);

create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs (action, created_at desc);

alter table public.admin_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_logs'
      and policyname = 'admin_audit_logs_select_admin'
  ) then
    execute $policy$
      create policy "admin_audit_logs_select_admin"
        on public.admin_audit_logs
        for select
        using (public.is_admin(auth.uid()))
    $policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_audit_logs'
      and policyname = 'admin_audit_logs_insert_admin'
  ) then
    execute $policy$
      create policy "admin_audit_logs_insert_admin"
        on public.admin_audit_logs
        for insert
        with check (public.is_admin(auth.uid()) and auth.uid() = admin_user_id)
    $policy$;
  end if;
end;
$$;
