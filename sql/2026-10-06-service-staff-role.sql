-- Allow read-only service staff accounts without changing existing users.
alter table public.staff_users
  drop constraint if exists staff_users_role_check;

alter table public.staff_users
  add constraint staff_users_role_check
  check (role in ('owner', 'admin', 'door', 'service'));
