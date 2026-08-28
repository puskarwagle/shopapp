-- Standard Supabase pattern: one row per auth user, storing their app role.
-- The trigger below auto-creates a row whenever an account is added via
-- Authentication -> Users -> Add user (or any future signup).
-- Set roles in the dashboard: Table Editor -> profiles -> role column
-- (or: update profiles set role = 'admin' where email in ('...','...'));

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'employee',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_read_all" on profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();