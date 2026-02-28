create table if not exists public.challenge_checkins (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  challenge_date date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint challenge_checkins_space_date_user_unique
    unique (space_id, challenge_date, user_id)
);

create index if not exists idx_challenge_checkins_space_date
  on public.challenge_checkins (space_id, challenge_date desc);

create index if not exists idx_challenge_checkins_space_user_date
  on public.challenge_checkins (space_id, user_id, challenge_date desc);

alter table public.challenge_checkins enable row level security;

drop policy if exists "challenge_checkins_select_member" on public.challenge_checkins;
create policy "challenge_checkins_select_member"
on public.challenge_checkins
for select
using (public.is_space_member(space_id));

drop policy if exists "challenge_checkins_insert_self_member" on public.challenge_checkins;
create policy "challenge_checkins_insert_self_member"
on public.challenge_checkins
for insert
with check (
  user_id = auth.uid()
  and public.is_space_member(space_id)
  and exists (
    select 1
    from public.spaces s
    where s.id = challenge_checkins.space_id
      and s.type = 'shared'
  )
);

drop policy if exists "challenge_checkins_delete_self_member" on public.challenge_checkins;
create policy "challenge_checkins_delete_self_member"
on public.challenge_checkins
for delete
using (
  user_id = auth.uid()
  and public.is_space_member(space_id)
  and exists (
    select 1
    from public.spaces s
    where s.id = challenge_checkins.space_id
      and s.type = 'shared'
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'challenge_checkins'
  ) then
    alter publication supabase_realtime add table public.challenge_checkins;
  end if;
end;
$$;
