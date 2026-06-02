create or replace function public.enforce_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  acting_role text := auth.role();
  acting_is_admin boolean := public.is_admin(acting_user_id);
begin
  -- Allow everything if done by service_role (Admin API client)
  if acting_role = 'service_role' then
    return new;
  end if;

  -- Supabase Auth user-created hooks run while the auth user is being saved,
  -- before there is an authenticated browser user in the database context.
  if acting_user_id is null and tg_op = 'INSERT' then
    if exists (select 1 from auth.users where id = new.id) then
      new.role := 'user';
      new.plan_tier := 'gratuito';
      return new;
    end if;
  end if;

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
