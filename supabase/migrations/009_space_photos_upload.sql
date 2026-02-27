create table if not exists public.space_photos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  object_path text not null unique,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 8388608),
  created_at timestamptz not null default now()
);

create index if not exists idx_space_photos_space_created_at
  on public.space_photos (space_id, created_at desc);

create index if not exists idx_space_photos_uploaded_by
  on public.space_photos (uploaded_by);

alter table public.space_photos enable row level security;

drop policy if exists "space_photos_select_member" on public.space_photos;
create policy "space_photos_select_member"
on public.space_photos
for select
using (public.is_space_member(space_id));

drop policy if exists "space_photos_insert_member" on public.space_photos;
create policy "space_photos_insert_member"
on public.space_photos
for insert
with check (
  uploaded_by = auth.uid()
  and public.is_space_member(space_id)
);

drop policy if exists "space_photos_delete_uploader_or_owner" on public.space_photos;
create policy "space_photos_delete_uploader_or_owner"
on public.space_photos
for delete
using (
  public.is_space_member(space_id)
  and (
    uploaded_by = auth.uid()
    or exists (
      select 1
      from public.spaces s
      where s.id = space_photos.space_id
        and s.owner_user_id = auth.uid()
    )
  )
);

create or replace function public.can_upload_space_photo(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  path_space_id uuid;
  path_user_id uuid;
begin
  if current_user_id is null then
    return false;
  end if;

  begin
    path_space_id := split_part(object_name, '/', 1)::uuid;
    path_user_id := split_part(object_name, '/', 2)::uuid;
  exception
    when others then
      return false;
  end;

  if path_user_id <> current_user_id then
    return false;
  end if;

  return public.is_space_member(path_space_id, current_user_id);
end;
$$;

create or replace function public.can_delete_space_photo(object_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_space_id uuid;
  target_uploaded_by uuid;
  target_owner_user_id uuid;
begin
  if current_user_id is null then
    return false;
  end if;

  select
    sp.space_id,
    sp.uploaded_by,
    s.owner_user_id
  into
    target_space_id,
    target_uploaded_by,
    target_owner_user_id
  from public.space_photos sp
  join public.spaces s on s.id = sp.space_id
  where sp.object_path = object_name
  limit 1;

  if target_space_id is null then
    return false;
  end if;

  if not public.is_space_member(target_space_id, current_user_id) then
    return false;
  end if;

  return target_uploaded_by = current_user_id
    or target_owner_user_id = current_user_id;
end;
$$;

revoke all on function public.can_upload_space_photo(text) from public;
revoke all on function public.can_delete_space_photo(text) from public;
grant execute on function public.can_upload_space_photo(text) to authenticated;
grant execute on function public.can_delete_space_photo(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'space_photos',
  'space_photos',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "space_photos_insert_member_own_folder" on storage.objects;
create policy "space_photos_insert_member_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'space_photos'
  and public.can_upload_space_photo(name)
);

drop policy if exists "space_photos_delete_by_permission" on storage.objects;
create policy "space_photos_delete_by_permission"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'space_photos'
  and public.can_delete_space_photo(name)
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'space_photos'
  ) then
    alter publication supabase_realtime add table public.space_photos;
  end if;
end;
$$;
