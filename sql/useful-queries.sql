-- ══════════════════════════════════════════════════════════════════════
--  WHISPERS: everyday queries for the Supabase SQL editor
--  Copy one section at a time. Read-only queries are marked READ.
--  Queries that change data are marked WRITE; check the values first.
--
--  Migrations (all already run on production):
--    1. sql/2026-09-24-rsvp-columns.sql
--    2. sql/2026-09-24-door-scanner.sql
--    3. sql/2026-09-24-seal-code-unique.sql
--    4. sql/2026-09-25-plus-one-tickets-and-venue.sql
--    5. sql/2026-09-26-contact-reservation-and-ticket-release.sql
--  They are idempotent: running one again does no harm.
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. HEADCOUNT (READ) ──────────────────────────────────────────────
select
  count(*) filter (where status = 'attending')                               as guests_attending,
  (select count(*) from public.rsvp_companions c join public.rsvps r on r.id = c.rsvp_id
    where r.event_key = 'whispers-2026-10-10' and r.status = 'attending')     as added_guests,
  count(*) filter (where status = 'attending')
    + (select count(*) from public.rsvp_companions c join public.rsvps r on r.id = c.rsvp_id
       where r.event_key = 'whispers-2026-10-10' and r.status = 'attending')  as total_people,
  count(*) filter (where status = 'declined')                                as declined
from public.rsvps
where event_key = 'whispers-2026-10-10';


-- ── 2. GUEST LIST WITH REPLIES AND INVITATION LINKS (READ) ───────────
select
  g.id,
  g.name,
  coalesce(r.status, 'no reply')                          as reply,
  r.plus_one_name,
  r.seal_code,
  r.submitted_at,
  'https://whispers-invite.pages.dev/hi/' || g.id         as invitation_link
from public.guest_list g
left join public.rsvps r
  on r.guest_id = g.id and r.event_key = 'whispers-2026-10-10'
order by g.name;


-- ── 3. EVERYONE ATTENDING, ONE ROW PER PERSON (READ) ─────────────────
select guest_name as name, 'guest' as type, null as guest_of, seal_code, checked_in_at, submitted_at
from public.rsvps
where event_key = 'whispers-2026-10-10' and status = 'attending'
union all
select plus_one_name, 'plus-one', guest_name, plus_one_seal_code, plus_one_checked_in_at, submitted_at
from public.rsvps
where event_key = 'whispers-2026-10-10' and status = 'attending' and plus_one_name is not null
union all
select c.guest_name, 'added guest', r.guest_name, c.seal_code, c.checked_in_at, c.created_at
from public.rsvp_companions c
join public.rsvps r on r.id = c.rsvp_id
where r.event_key = 'whispers-2026-10-10' and r.status = 'attending'
order by submitted_at, type;


-- ── 4. PLUS-ONE EMAILS (READ; personal data, do not share) ───────────
select r.guest_name, c.guest_name as added_guest_name, c.email, c.email_is_fallback, c.phone
from public.rsvp_companions c
join public.rsvps r on r.id = c.rsvp_id
where r.event_key = 'whispers-2026-10-10' and r.status = 'attending'
order by r.guest_name, c.guest_name;


-- ── 5. TICKET LINKS (READ) ───────────────────────────────────────────
-- A ticket link works like a key: anyone with it can show the QR at the door.
-- Only send a guest their own link.
select
  guest_name,
  'https://whispers-invite.pages.dev/ticket/' || ticket_token                   as guest_ticket,
  null as added_guest_name,
  null as added_guest_ticket
from public.rsvps
where event_key = 'whispers-2026-10-10' and status = 'attending'
union all
select
  r.guest_name,
  null,
  c.guest_name,
  'https://whispers-invite.pages.dev/ticket/' || c.ticket_token
from public.rsvp_companions c
join public.rsvps r on r.id = c.rsvp_id
where r.event_key = 'whispers-2026-10-10' and r.status = 'attending'
order by guest_name;


-- ── 6. REPLIES FROM THE PLAIN LINK (no personal link) (READ)
select guest_name, status, plus_one_name, submitted_at
from public.rsvps
where event_key = 'whispers-2026-10-10' and guest_id = ticket_token
order by submitted_at desc;


-- ── 7. DOOR NIGHT: WHO IS INSIDE / STILL TO ARRIVE (READ) ────────────
-- Inside
select guest_name as name, null as guest_of, checked_in_at
from public.rsvps where event_key = 'whispers-2026-10-10' and checked_in_at is not null
union all
select plus_one_name, guest_name, plus_one_checked_in_at
from public.rsvps where event_key = 'whispers-2026-10-10' and plus_one_checked_in_at is not null
union all
select c.guest_name, r.guest_name, c.checked_in_at
from public.rsvp_companions c
join public.rsvps r on r.id = c.rsvp_id
where r.event_key = 'whispers-2026-10-10' and c.checked_in_at is not null
order by checked_in_at desc;

-- Still to arrive
select guest_name as name, null as guest_of, seal_code
from public.rsvps where event_key = 'whispers-2026-10-10' and status = 'attending' and checked_in_at is null
union all
select plus_one_name, guest_name, plus_one_seal_code
from public.rsvps where event_key = 'whispers-2026-10-10' and status = 'attending'
  and plus_one_name is not null and plus_one_checked_in_at is null
union all
select c.guest_name, r.guest_name, c.seal_code
from public.rsvp_companions c
join public.rsvps r on r.id = c.rsvp_id
where r.event_key = 'whispers-2026-10-10' and r.status = 'attending' and c.checked_in_at is null
order by name;


-- ── 8. UNDO A MISTAKEN CHECK-IN (WRITE) ──────────────────────────────
-- Use the seal code shown on the scanner. Run only the line you need.
update public.rsvps set checked_in_at = null
where event_key = 'whispers-2026-10-10' and seal_code = 'WSP·10·XXXX';

update public.rsvps set plus_one_checked_in_at = null
where event_key = 'whispers-2026-10-10' and plus_one_seal_code = 'WSP·10·XXXX';


-- ── 9. VENUE / LOCATION (WRITE) ──────────────────────────────────────
-- Tickets show it automatically once it is set and reveal_at has passed.
-- Set the location:
update public.event_details
set venue_name    = 'Hotel Juno',
    venue_address = 'street, number, Sofia',
    map_url       = 'https://maps.app.goo.gl/...',   -- must start with https://
    updated_at    = now()
where event_key = 'whispers-2026-10-10';

-- Show it on tickets right now:
update public.event_details set reveal_at = now(), updated_at = now()
where event_key = 'whispers-2026-10-10';

-- Hide it again until 18:00 on the 9th (the brief's default):
update public.event_details set reveal_at = '2026-10-09 18:00:00+03', updated_at = now()
where event_key = 'whispers-2026-10-10';

-- Check what is stored (READ):
select * from public.event_details where event_key = 'whispers-2026-10-10';


-- ── 10. ADD GUESTS / INVITATION LINKS (WRITE) ────────────────────────
-- id = the end of the link: https://whispers-invite.pages.dev/hi/<id>
-- Letters, digits and dashes only. ON CONFLICT updates the name.
insert into public.guest_list (id, name, email) values
  ('first-last', 'First Last', null)
on conflict (id) do update set name = excluded.name;

-- A random, unguessable id for a guest (run once per guest, READ):
select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) as token;

-- Remove a guest from the list (WRITE; does not remove their RSVP):
delete from public.guest_list where id = 'first-last';


-- ── 11. CLEAN UP TEST RSVPs BEFORE SENDING INVITATIONS (WRITE, irreversible)
-- Look first (READ):
select id, guest_id, guest_name, status, plus_one_name, submitted_at
from public.rsvps where event_key = 'whispers-2026-10-10' order by submitted_at;

-- Then delete one by its guest_id (for /hi/ links) or by id from the list above:
delete from public.rsvps where event_key = 'whispers-2026-10-10' and guest_id = 'michelleg';
-- delete from public.rsvps where id = 123;


-- ── 12. HEALTH CHECKS (READ) ─────────────────────────────────────────
-- Duplicate seal codes (should return no rows)
select seal_code, count(*) from public.rsvps
where event_key = 'whispers-2026-10-10' and seal_code is not null
group by 1 having count(*) > 1;

-- Plus-ones without their own ticket (should return no rows)
select id, guest_name, plus_one_name from public.rsvps
where status = 'attending' and plus_one_name is not null and plus_one_ticket_token is null;

-- Columns the site expects on rsvps
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'rsvps' order by ordinal_position;
