alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.todos enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "spaces_select_member"
on public.spaces
for select
using (
  exists (
    select 1
    from public.space_members sm
    where sm.space_id = spaces.id
      and sm.user_id = auth.uid()
  )
);

create policy "spaces_insert_owner"
on public.spaces
for insert
with check (owner_user_id = auth.uid());

create policy "spaces_update_owner"
on public.spaces
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "spaces_delete_owner"
on public.spaces
for delete
using (owner_user_id = auth.uid());

create policy "space_members_select_member"
on public.space_members
for select
using (
  exists (
    select 1
    from public.space_members self
    where self.space_id = space_members.space_id
      and self.user_id = auth.uid()
  )
);

create policy "todos_select_member"
on public.todos
for select
using (
  exists (
    select 1
    from public.space_members sm
    where sm.space_id = todos.space_id
      and sm.user_id = auth.uid()
  )
);

create policy "todos_insert_member"
on public.todos
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.space_members sm
    where sm.space_id = todos.space_id
      and sm.user_id = auth.uid()
  )
  and (
    assignee_user_id is null
    or exists (
      select 1
      from public.space_members sm
      where sm.space_id = todos.space_id
        and sm.user_id = todos.assignee_user_id
    )
  )
);

create policy "todos_update_member"
on public.todos
for update
using (
  exists (
    select 1
    from public.space_members sm
    where sm.space_id = todos.space_id
      and sm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.space_members sm
    where sm.space_id = todos.space_id
      and sm.user_id = auth.uid()
  )
  and (
    assignee_user_id is null
    or exists (
      select 1
      from public.space_members sm
      where sm.space_id = todos.space_id
        and sm.user_id = todos.assignee_user_id
    )
  )
);

create policy "todos_delete_member"
on public.todos
for delete
using (
  exists (
    select 1
    from public.space_members sm
    where sm.space_id = todos.space_id
      and sm.user_id = auth.uid()
  )
);
