alter table public.rsvps
  drop constraint if exists rsvps_guest_id_fkey;

alter table public.rsvps
  add column if not exists ticket_token text;

create unique index if not exists rsvps_ticket_token_unique
  on public.rsvps (ticket_token)
  where ticket_token is not null;

create index if not exists rsvps_checked_in_at_idx
  on public.rsvps (checked_in_at);

grant select, insert, update on table public.rsvps to service_role;
notify pgrst, 'reload schema';
