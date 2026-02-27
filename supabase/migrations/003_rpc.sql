create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  new_code text;
begin
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.spaces s where s.invite_code = new_code
    );
  end loop;

  return new_code;
end;
$$;

create or replace function public.rpc_ensure_personal_space()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  personal_space_id uuid;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select s.id
  into personal_space_id
  from public.spaces s
  where s.owner_user_id = current_user_id
    and s.type = 'personal'
  limit 1;

  if personal_space_id is null then
    insert into public.spaces (name, type, owner_user_id)
    values ('我的清单', 'personal', current_user_id)
    returning id into personal_space_id;

    insert into public.space_members (space_id, user_id, role)
    values (personal_space_id, current_user_id, 'owner')
    on conflict (space_id, user_id) do nothing;
  else
    insert into public.space_members (space_id, user_id, role)
    values (personal_space_id, current_user_id, 'owner')
    on conflict (space_id, user_id) do nothing;
  end if;

  insert into public.profiles (id)
  values (current_user_id)
  on conflict (id) do nothing;

  return personal_space_id;
end;
$$;

create or replace function public.rpc_create_shared_space(space_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  shared_space_id uuid;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  insert into public.spaces (name, type, owner_user_id, invite_code)
  values (
    coalesce(nullif(trim(space_name), ''), '我们的共享空间'),
    'shared',
    current_user_id,
    public.generate_invite_code()
  )
  returning id into shared_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (shared_space_id, current_user_id, 'owner')
  on conflict (space_id, user_id) do nothing;

  insert into public.profiles (id)
  values (current_user_id)
  on conflict (id) do nothing;

  return shared_space_id;
end;
$$;

create or replace function public.rpc_join_shared_space(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_space_id uuid;
  current_member_count int;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select s.id
  into target_space_id
  from public.spaces s
  where s.type = 'shared'
    and s.invite_code = upper(trim(invite_code))
  limit 1;

  if target_space_id is null then
    raise exception 'INVALID_CODE';
  end if;

  if exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
      and sm.user_id = current_user_id
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  select count(*)
  into current_member_count
  from public.space_members sm
  where sm.space_id = target_space_id;

  if current_member_count >= 2 then
    raise exception 'SPACE_FULL';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (target_space_id, current_user_id, 'member');

  insert into public.profiles (id)
  values (current_user_id)
  on conflict (id) do nothing;

  return target_space_id;
end;
$$;

revoke all on function public.rpc_ensure_personal_space() from public;
revoke all on function public.rpc_create_shared_space(text) from public;
revoke all on function public.rpc_join_shared_space(text) from public;

grant execute on function public.rpc_ensure_personal_space() to authenticated;
grant execute on function public.rpc_create_shared_space(text) to authenticated;
grant execute on function public.rpc_join_shared_space(text) to authenticated;
