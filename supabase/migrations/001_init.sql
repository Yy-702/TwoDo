create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal', 'shared')),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_user_id uuid references auth.users (id) on delete set null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_spaces_owner_user_id on public.spaces (owner_user_id);
create index if not exists idx_spaces_invite_code on public.spaces (invite_code);
create index if not exists idx_space_members_user_id on public.space_members (user_id);
create index if not exists idx_todos_space_id on public.todos (space_id);
create index if not exists idx_todos_assignee_user_id on public.todos (assignee_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_spaces_set_updated_at
before update on public.spaces
for each row
execute function public.set_updated_at();

create trigger trg_todos_set_updated_at
before update on public.todos
for each row
execute function public.set_updated_at();

create or replace function public.validate_todo_assignee()
returns trigger
language plpgsql
as $$
begin
  if new.assignee_user_id is not null
    and not exists (
      select 1
      from public.space_members sm
      where sm.space_id = new.space_id
        and sm.user_id = new.assignee_user_id
    ) then
    raise exception 'ASSIGNEE_NOT_MEMBER';
  end if;

  return new;
end;
$$;

create trigger trg_todos_validate_assignee
before insert or update on public.todos
for each row
execute function public.validate_todo_assignee();
