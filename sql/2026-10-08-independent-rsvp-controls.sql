-- Independent Update details availability. New confirmation fields stay unchanged.
-- Safe to run before deploying the code that reads these columns.

alter table public.event_details
  add column if not exists rsvp_updates_open boolean not null default true,
  add column if not exists rsvp_updates_change_at timestamptz,
  add column if not exists rsvp_updates_change_to_open boolean;

alter table public.event_details
  drop constraint if exists event_details_rsvp_updates_schedule_paired;

alter table public.event_details
  add constraint event_details_rsvp_updates_schedule_paired check (
    (rsvp_updates_change_at is null and rsvp_updates_change_to_open is null)
    or (rsvp_updates_change_at is not null and rsvp_updates_change_to_open is not null)
  );

notify pgrst, 'reload schema';
