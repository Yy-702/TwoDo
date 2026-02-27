create or replace function public.rpc_join_shared_space(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_invite_code text := upper(trim(invite_code));
  target_space_id uuid;
  current_member_count int;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if normalized_invite_code is null or length(normalized_invite_code) <> 8 then
    raise exception 'INVALID_CODE';
  end if;

  select s.id
  into target_space_id
  from public.spaces s
  where s.type = 'shared'
    and s.invite_code = normalized_invite_code
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

revoke all on function public.rpc_join_shared_space(text) from public;
grant execute on function public.rpc_join_shared_space(text) to authenticated;
