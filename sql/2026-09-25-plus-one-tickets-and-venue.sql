-- 1) Every plus-one gets their own ticket: own token, own seal code, own check-in.
-- 2) event_details holds the venue. Tickets show it only once reveal_at has passed.
-- Idempotent: safe to run more than once. Run it in the Supabase SQL editor
-- BEFORE the code that uses these columns is deployed.

alter table public.rsvps
  add column if not exists plus_one_ticket_token text,
  add column if not exists plus_one_seal_code text,
  add column if not exists plus_one_checked_in_at timestamptz;

create unique index if not exists rsvps_plus_one_ticket_token_unique
  on public.rsvps (plus_one_ticket_token)
  where plus_one_ticket_token is not null;

create unique index if not exists rsvps_event_plus_one_seal_code_unique
  on public.rsvps (event_key, plus_one_seal_code)
  where plus_one_seal_code is not null;

-- Existing attending plus-ones: issue their ticket now.
update public.rsvps r
set plus_one_ticket_token = replace(gen_random_uuid()::text, '-', ''),
    plus_one_seal_code = 'WSP·10·' || (
      select string_agg(substr('ACDEFGHJKMNPQRTUVWXYZ234679', 1 + floor(random() * 27)::int, 1), '')
      from generate_series(1, 4) where r.id is not null
    )
where r.status = 'attending'
  and r.plus_one_name is not null
  and r.plus_one_ticket_token is null;

create table if not exists public.event_details (
  event_key text primary key,
  venue_name text,
  venue_address text,
  map_url text,
  reveal_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.event_details enable row level security;

-- The brief: the address reaches guests at 18:00 on the 9th (Sofia time).
insert into public.event_details (event_key, reveal_at)
values ('whispers-2026-10-10', '2026-10-09 18:00:00+03')
on conflict (event_key) do nothing;

notify pgrst, 'reload schema';

-- ── When the location is confirmed, run (edit the values): ─────────────
--   update public.event_details
--   set venue_name = 'Hotel Juno',
--       venue_address = 'street, number, Sofia',
--       map_url = 'https://maps.app.goo.gl/...',
--       updated_at = now()
--   where event_key = 'whispers-2026-10-10';
--
-- To show it on tickets straight away instead of at 18:00 on the 9th:
--   update public.event_details set reveal_at = now() where event_key = 'whispers-2026-10-10';
