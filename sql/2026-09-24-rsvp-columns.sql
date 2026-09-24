-- Brings an existing production rsvps table in line with sql/schema.sql.
-- Idempotent: safe to run more than once. Run it in the Supabase SQL editor.
--
-- Read-only diagnostics (run these first to see what is missing):
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'rsvps' order by ordinal_position;
--
--   select indexname from pg_indexes where schemaname = 'public' and tablename = 'rsvps';
--
-- The unique indexes below fail if duplicates already exist. Check with:
--   select event_key, lower(plus_one_email), count(*) from public.rsvps
--   where plus_one_email is not null group by 1, 2 having count(*) > 1;
--   select ticket_token, count(*) from public.rsvps
--   where ticket_token is not null group by 1 having count(*) > 1;

alter table public.rsvps
  add column if not exists plus_one_name text,
  add column if not exists plus_one_email text,
  add column if not exists seal_code text,
  add column if not exists ticket_token text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists submitted_at timestamptz default now();

create unique index if not exists rsvps_event_plus_one_email_unique
  on public.rsvps (event_key, lower(plus_one_email))
  where plus_one_email is not null;

create unique index if not exists rsvps_ticket_token_unique
  on public.rsvps (ticket_token)
  where ticket_token is not null;

create index if not exists rsvps_checked_in_at_idx
  on public.rsvps (checked_in_at);

grant select, insert, update on table public.rsvps to service_role;
notify pgrst, 'reload schema';
