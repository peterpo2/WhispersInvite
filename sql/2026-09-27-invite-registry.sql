alter table public.guest_list
  add column if not exists phone text,
  add column if not exists ticket_token text,
  add column if not exists updated_at timestamptz not null default now();

update public.guest_list
set ticket_token = replace(gen_random_uuid()::text, '-', ''),
    updated_at = now()
where ticket_token is null;

create unique index if not exists guest_list_ticket_token_unique
  on public.guest_list (ticket_token)
  where ticket_token is not null;
