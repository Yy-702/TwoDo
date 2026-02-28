create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null,
  event_date date not null,
  note text,
  is_yearly boolean not null default true,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anniversaries_title_length
    check (char_length(btrim(title)) between 1 and 60),
  constraint anniversaries_note_length
    check (char_length(coalesce(note, '')) <= 200)
);

create index if not exists idx_anniversaries_space_event_date
  on public.anniversaries (space_id, event_date);

create index if not exists idx_anniversaries_space_created_at
  on public.anniversaries (space_id, created_at desc);

drop trigger if exists trg_anniversaries_set_updated_at
on public.anniversaries;

create trigger trg_anniversaries_set_updated_at
before update on public.anniversaries
for each row
execute function public.set_updated_at();

alter table public.anniversaries enable row level security;

drop policy if exists "anniversaries_select_member" on public.anniversaries;
create policy "anniversaries_select_member"
on public.anniversaries
for select
using (public.is_space_member(space_id));

drop policy if exists "anniversaries_insert_member" on public.anniversaries;
create policy "anniversaries_insert_member"
on public.anniversaries
for insert
with check (
  created_by = auth.uid()
  and public.is_space_member(space_id)
);

drop policy if exists "anniversaries_update_member" on public.anniversaries;
create policy "anniversaries_update_member"
on public.anniversaries
for update
using (public.is_space_member(space_id))
with check (public.is_space_member(space_id));

drop policy if exists "anniversaries_delete_member" on public.anniversaries;
create policy "anniversaries_delete_member"
on public.anniversaries
for delete
using (public.is_space_member(space_id));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anniversaries'
  ) then
    alter publication supabase_realtime add table public.anniversaries;
  end if;
end;
$$;
