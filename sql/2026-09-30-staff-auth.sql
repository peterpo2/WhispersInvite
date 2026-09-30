create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role text not null check (role in ('owner', 'admin', 'door')),
  active boolean not null default true,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_users_username_unique
  on public.staff_users (lower(username));

alter table public.staff_users enable row level security;

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  session_token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists staff_sessions_token_hash_unique
  on public.staff_sessions (session_token_hash);
create index if not exists staff_sessions_user_idx
  on public.staff_sessions (staff_user_id);
create index if not exists staff_sessions_expires_idx
  on public.staff_sessions (expires_at);

alter table public.staff_sessions enable row level security;
