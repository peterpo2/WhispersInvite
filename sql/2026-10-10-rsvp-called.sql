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

notify pgrst, 'reload schema';
