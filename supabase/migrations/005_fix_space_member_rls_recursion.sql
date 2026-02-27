create or replace function public.is_space_member(
  check_space_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.space_members sm
    where sm.space_id = check_space_id
      and sm.user_id = check_user_id
  );
$$;

revoke all on function public.is_space_member(uuid, uuid) from public;
grant execute on function public.is_space_member(uuid, uuid) to authenticated;

drop policy if exists "spaces_select_member" on public.spaces;
create policy "spaces_select_member"
on public.spaces
for select
using (public.is_space_member(spaces.id));

drop policy if exists "space_members_select_member" on public.space_members;
create policy "space_members_select_member"
on public.space_members
for select
using (public.is_space_member(space_members.space_id));

drop policy if exists "todos_select_member" on public.todos;
create policy "todos_select_member"
on public.todos
for select
using (public.is_space_member(todos.space_id));

drop policy if exists "todos_insert_member" on public.todos;
create policy "todos_insert_member"
on public.todos
for insert
with check (
  created_by = auth.uid()
  and public.is_space_member(todos.space_id)
  and (
    assignee_user_id is null
    or public.is_space_member(todos.space_id, todos.assignee_user_id)
  )
);

drop policy if exists "todos_update_member" on public.todos;
create policy "todos_update_member"
on public.todos
for update
using (public.is_space_member(todos.space_id))
with check (
  public.is_space_member(todos.space_id)
  and (
    assignee_user_id is null
    or public.is_space_member(todos.space_id, todos.assignee_user_id)
  )
);

drop policy if exists "todos_delete_member" on public.todos;
create policy "todos_delete_member"
on public.todos
for delete
using (public.is_space_member(todos.space_id));
