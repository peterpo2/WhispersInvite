-- Seal codes are now generated on the server (WSP·10·XXXX) and must be unique per event.
-- Idempotent: safe to run more than once. Run it in the Supabase SQL editor.
--
-- The unique index fails if duplicate seal codes already exist. The old client-side
-- code was a hash of name|email, so a guest who submitted twice, or two guests with
-- the same name, share a code. Check first (read-only):
--   select event_key, seal_code, count(*) from public.rsvps
--   where seal_code is not null group by 1, 2 having count(*) > 1;
--
-- If that returns rows, give every later duplicate a fresh code, then re-run the check:
--   update public.rsvps r
--   set seal_code = 'WSP·10·' || (
--     select string_agg(substr('ACDEFGHJKMNPQRTUVWXYZ234679', 1 + floor(random() * 27)::int, 1), '')
--     from generate_series(1, 4) where r.id is not null
--   )
--   where r.id in (
--     select id from (
--       select id, row_number() over (partition by event_key, seal_code order by submitted_at, id) as n
--       from public.rsvps where seal_code is not null
--     ) d where d.n > 1
--   );

create unique index if not exists rsvps_event_seal_code_unique
  on public.rsvps (event_key, seal_code)
  where seal_code is not null;

notify pgrst, 'reload schema';
