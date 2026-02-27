alter table public.profiles
add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar_insert_own_folder" on storage.objects;
create policy "avatar_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatar_update_own_folder" on storage.objects;
create policy "avatar_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatar_delete_own_folder" on storage.objects;
create policy "avatar_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.rpc_get_space_member_profiles(target_space_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_path text,
  role text
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

  if not public.is_space_member(target_space_id, current_user_id) then
    raise exception 'NOT_SPACE_MEMBER';
  end if;

  return query
  select
    sm.user_id,
    p.display_name,
    p.avatar_path,
    sm.role
  from public.space_members sm
  left join public.profiles p on p.id = sm.user_id
  where sm.space_id = target_space_id
  order by sm.joined_at asc;
end;
$$;

revoke all on function public.rpc_get_space_member_profiles(uuid) from public;
grant execute on function public.rpc_get_space_member_profiles(uuid) to authenticated;
