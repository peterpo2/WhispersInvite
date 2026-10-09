do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rsvps'
      and column_name = 'called'
  ) then
    alter table public.rsvps
      add column if not exists called boolean not null default false;

    update public.rsvps
    set called = reservation_confirmed
    where called is distinct from reservation_confirmed;
  end if;
end
$$;

create or replace function public.sync_rsvp_called_from_legacy()
returns trigger
language plpgsql
as $$
begin
  new.called := new.reservation_confirmed;
  return new;
end
$$;

drop trigger if exists rsvps_sync_called_from_legacy on public.rsvps;
create trigger rsvps_sync_called_from_legacy
before update of reservation_confirmed on public.rsvps
for each row execute function public.sync_rsvp_called_from_legacy();

notify pgrst, 'reload schema';
