begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff_tables'
      and column_name = 'is_ready'
  ) then
    alter table public.staff_tables
      add column if not exists is_ready boolean not null default false;

    update public.staff_tables
    set is_ready = true
    where table_map_edited_at is not null
      or hall_map_edited_at is not null;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
