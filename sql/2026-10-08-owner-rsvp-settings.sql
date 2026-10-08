-- Owner-controlled RSVP availability. Existing behavior stays open by default.
-- Safe to run before deploying the code that reads these columns.

alter table public.event_details
  add column if not exists rsvp_open boolean not null default true,
  add column if not exists rsvp_change_at timestamptz,
  add column if not exists rsvp_change_to_open boolean;

alter table public.event_details
  drop constraint if exists event_details_rsvp_schedule_paired;

alter table public.event_details
  add constraint event_details_rsvp_schedule_paired check (
    (rsvp_change_at is null and rsvp_change_to_open is null)
    or (rsvp_change_at is not null and rsvp_change_to_open is not null)
  );

insert into public.event_details (event_key, rsvp_open)
values ('whispers-2026-10-10', true)
on conflict (event_key) do nothing;

notify pgrst, 'reload schema';
