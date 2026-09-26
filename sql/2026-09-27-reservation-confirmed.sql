alter table public.rsvps
  add column if not exists reservation_confirmed boolean not null default false;

notify pgrst, 'reload schema';
