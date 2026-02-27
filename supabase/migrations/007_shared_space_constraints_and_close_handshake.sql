create table if not exists public.shared_space_close_requests (
  space_id uuid primary key references public.spaces (id) on delete cascade,
  initiator_user_id uuid not null references auth.users (id) on delete cascade,
  partner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_space_archives (
  id uuid primary key default gen_random_uuid(),
  original_space_id uuid not null,
  initiator_user_id uuid not null references auth.users (id) on delete cascade,
  confirmer_user_id uuid not null references auth.users (id) on delete cascade,
  closed_at timestamptz not null default now(),
  member_user_ids uuid[] not null default '{}',
  snapshot jsonb not null
);

create index if not exists idx_shared_space_archives_original_space_id
  on public.shared_space_archives (original_space_id);

create index if not exists idx_shared_space_archives_closed_at
  on public.shared_space_archives (closed_at desc);

drop trigger if exists trg_shared_space_close_requests_set_updated_at
on public.shared_space_close_requests;

create trigger trg_shared_space_close_requests_set_updated_at
before update on public.shared_space_close_requests
for each row
execute function public.set_updated_at();

alter table public.shared_space_close_requests enable row level security;
alter table public.shared_space_archives enable row level security;

create or replace function public.validate_single_shared_membership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_space_type text;
begin
  select s.type
  into target_space_type
  from public.spaces s
  where s.id = new.space_id;

  if target_space_type = 'shared' and exists (
    select 1
    from public.space_members sm
    join public.spaces s on s.id = sm.space_id
    where sm.user_id = new.user_id
      and s.type = 'shared'
      and sm.space_id <> new.space_id
  ) then
    raise exception 'ALREADY_HAS_SHARED_SPACE';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_space_members_validate_single_shared_membership
on public.space_members;

create trigger trg_space_members_validate_single_shared_membership
before insert or update of space_id, user_id
on public.space_members
for each row
execute function public.validate_single_shared_membership();

create or replace function public.archive_and_close_shared_space(
  p_space_id uuid,
  p_initiator_user_id uuid,
  p_confirmer_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_space public.spaces%rowtype;
  member_ids uuid[];
  members_snapshot jsonb;
  todos_snapshot jsonb;
begin
  select s.*
  into target_space
  from public.spaces s
  where s.id = p_space_id
    and s.type = 'shared'
  limit 1;

  if target_space.id is null then
    raise exception 'SPACE_NOT_SHARED';
  end if;

  select coalesce(array_agg(sm.user_id order by sm.joined_at), '{}'::uuid[])
  into member_ids
  from public.space_members sm
  where sm.space_id = p_space_id;

  select coalesce(jsonb_agg(to_jsonb(sm) order by sm.joined_at), '[]'::jsonb)
  into members_snapshot
  from public.space_members sm
  where sm.space_id = p_space_id;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb)
  into todos_snapshot
  from public.todos t
  where t.space_id = p_space_id;

  insert into public.shared_space_archives (
    original_space_id,
    initiator_user_id,
    confirmer_user_id,
    member_user_ids,
    snapshot
  )
  values (
    p_space_id,
    p_initiator_user_id,
    p_confirmer_user_id,
    member_ids,
    jsonb_build_object(
      'space', to_jsonb(target_space),
      'members', members_snapshot,
      'todos', todos_snapshot
    )
  );

  delete from public.shared_space_close_requests
  where space_id = p_space_id;

  delete from public.spaces
  where id = p_space_id;
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
  existing_shared_space_id uuid;
  existing_shared_owner_id uuid;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select s.id, s.owner_user_id
  into existing_shared_space_id, existing_shared_owner_id
  from public.spaces s
  join public.space_members sm on sm.space_id = s.id
  where s.type = 'shared'
    and sm.user_id = current_user_id
  order by s.created_at asc
  limit 1;

  if existing_shared_space_id is not null then
    if existing_shared_owner_id = current_user_id then
      return existing_shared_space_id;
    end if;

    raise exception 'ALREADY_HAS_SHARED_SPACE';
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

  if exists (
    select 1
    from public.space_members sm
    join public.spaces s on s.id = sm.space_id
    where sm.user_id = current_user_id
      and s.type = 'shared'
      and sm.space_id <> target_space_id
  ) then
    raise exception 'ALREADY_HAS_SHARED_SPACE';
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

create or replace function public.rpc_get_my_shared_space_context()
returns table (
  space_id uuid,
  owner_user_id uuid,
  invite_code text,
  member_count int,
  close_request_initiator_user_id uuid,
  close_request_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  return query
  select
    s.id as space_id,
    s.owner_user_id,
    s.invite_code,
    (select count(*)::int from public.space_members sm_count where sm_count.space_id = s.id) as member_count,
    csr.initiator_user_id as close_request_initiator_user_id,
    csr.created_at as close_request_created_at
  from public.spaces s
  join public.space_members sm on sm.space_id = s.id
  left join public.shared_space_close_requests csr on csr.space_id = s.id
  where s.type = 'shared'
    and sm.user_id = current_user_id
  order by s.created_at asc
  limit 1;
end;
$$;

create or replace function public.rpc_request_close_shared_space(target_space_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_member_count int;
  partner_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (
    select 1 from public.spaces s where s.id = target_space_id and s.type = 'shared'
  ) then
    raise exception 'SPACE_NOT_SHARED';
  end if;

  if not exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
      and sm.user_id = current_user_id
  ) then
    raise exception 'NOT_SHARED_MEMBER';
  end if;

  select count(*)
  into current_member_count
  from public.space_members sm
  where sm.space_id = target_space_id;

  if current_member_count <= 1 then
    perform public.archive_and_close_shared_space(
      target_space_id,
      current_user_id,
      current_user_id
    );

    return 'closed';
  end if;

  if exists (
    select 1
    from public.shared_space_close_requests csr
    where csr.space_id = target_space_id
  ) then
    return 'already_pending';
  end if;

  select sm.user_id
  into partner_user_id
  from public.space_members sm
  where sm.space_id = target_space_id
    and sm.user_id <> current_user_id
  order by sm.joined_at asc
  limit 1;

  if partner_user_id is null then
    perform public.archive_and_close_shared_space(
      target_space_id,
      current_user_id,
      current_user_id
    );

    return 'closed';
  end if;

  insert into public.shared_space_close_requests (
    space_id,
    initiator_user_id,
    partner_user_id
  )
  values (
    target_space_id,
    current_user_id,
    partner_user_id
  );

  return 'pending';
end;
$$;

create or replace function public.rpc_confirm_close_shared_space(target_space_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  close_request_record public.shared_space_close_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (
    select 1 from public.spaces s where s.id = target_space_id and s.type = 'shared'
  ) then
    raise exception 'SPACE_NOT_SHARED';
  end if;

  if not exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
      and sm.user_id = current_user_id
  ) then
    raise exception 'NOT_SHARED_MEMBER';
  end if;

  select *
  into close_request_record
  from public.shared_space_close_requests csr
  where csr.space_id = target_space_id
  limit 1;

  if close_request_record.space_id is null then
    raise exception 'CLOSE_REQUEST_NOT_FOUND';
  end if;

  if close_request_record.initiator_user_id = current_user_id then
    raise exception 'CLOSE_REQUEST_CONFIRM_BY_INITIATOR_FORBIDDEN';
  end if;

  if close_request_record.partner_user_id <> current_user_id then
    raise exception 'NOT_SHARED_MEMBER';
  end if;

  perform public.archive_and_close_shared_space(
    target_space_id,
    close_request_record.initiator_user_id,
    current_user_id
  );

  return 'closed';
end;
$$;

create or replace function public.rpc_cancel_close_shared_space(target_space_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  close_request_record public.shared_space_close_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (
    select 1 from public.spaces s where s.id = target_space_id and s.type = 'shared'
  ) then
    raise exception 'SPACE_NOT_SHARED';
  end if;

  if not exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
      and sm.user_id = current_user_id
  ) then
    raise exception 'NOT_SHARED_MEMBER';
  end if;

  select *
  into close_request_record
  from public.shared_space_close_requests csr
  where csr.space_id = target_space_id
  limit 1;

  if close_request_record.space_id is null then
    raise exception 'CLOSE_REQUEST_NOT_FOUND';
  end if;

  if close_request_record.initiator_user_id <> current_user_id then
    raise exception 'CLOSE_REQUEST_CANCEL_BY_NON_INITIATOR_FORBIDDEN';
  end if;

  delete from public.shared_space_close_requests
  where space_id = target_space_id;

  return 'cancelled';
end;
$$;

revoke all on function public.archive_and_close_shared_space(uuid, uuid, uuid) from public;
revoke all on function public.rpc_create_shared_space(text) from public;
revoke all on function public.rpc_join_shared_space(text) from public;
revoke all on function public.rpc_get_my_shared_space_context() from public;
revoke all on function public.rpc_request_close_shared_space(uuid) from public;
revoke all on function public.rpc_confirm_close_shared_space(uuid) from public;
revoke all on function public.rpc_cancel_close_shared_space(uuid) from public;

grant execute on function public.rpc_create_shared_space(text) to authenticated;
grant execute on function public.rpc_join_shared_space(text) to authenticated;
grant execute on function public.rpc_get_my_shared_space_context() to authenticated;
grant execute on function public.rpc_request_close_shared_space(uuid) to authenticated;
grant execute on function public.rpc_confirm_close_shared_space(uuid) to authenticated;
grant execute on function public.rpc_cancel_close_shared_space(uuid) to authenticated;
