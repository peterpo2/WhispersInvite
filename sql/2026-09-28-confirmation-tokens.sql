alter table public.rsvps
  add column if not exists confirmation_token text;

alter table public.rsvp_companions
  add column if not exists confirmation_token text;

update public.rsvps
set confirmation_token = replace(gen_random_uuid()::text, '-', '')
where status = 'attending' and confirmation_token is null;

update public.rsvp_companions
set confirmation_token = replace(gen_random_uuid()::text, '-', '')
where ticket_token is not null and confirmation_token is null;

create unique index if not exists rsvps_confirmation_token_unique
  on public.rsvps (confirmation_token)
  where confirmation_token is not null;

create unique index if not exists rsvp_companions_confirmation_token_unique
  on public.rsvp_companions (confirmation_token)
  where confirmation_token is not null;
