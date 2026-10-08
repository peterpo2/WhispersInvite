alter table public.staff_tables
  add column if not exists map_x numeric(5,2),
  add column if not exists map_y numeric(5,2);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff_tables'
      and column_name = 'capacity'
  ) then
    insert into public.staff_tables (id, label, capacity, sort_order) values
      ('t21', 'Table 21', 1, 21),
      ('t22', 'Table 22', 1, 22),
      ('t23', 'Table 23', 1, 23),
      ('t24', 'Table 24', 1, 24),
      ('t25', 'Table 25', 1, 25),
      ('t26', 'Table 26', 1, 26),
      ('t27', 'Table 27', 1, 27),
      ('t28', 'Table 28', 1, 28),
      ('t29', 'Table 29', 1, 29),
      ('t30', 'Table 30', 1, 30),
      ('t31', 'Table 31', 1, 31),
      ('t32', 'Table 32', 1, 32),
      ('t33', 'Table 33', 1, 33),
      ('t34', 'Table 34', 1, 34),
      ('t35', 'Table 35', 1, 35)
    on conflict (id) do nothing;
  else
    insert into public.staff_tables (id, label, sort_order) values
      ('t21', 'Table 21', 21),
      ('t22', 'Table 22', 22),
      ('t23', 'Table 23', 23),
      ('t24', 'Table 24', 24),
      ('t25', 'Table 25', 25),
      ('t26', 'Table 26', 26),
      ('t27', 'Table 27', 27),
      ('t28', 'Table 28', 28),
      ('t29', 'Table 29', 29),
      ('t30', 'Table 30', 30),
      ('t31', 'Table 31', 31),
      ('t32', 'Table 32', 32),
      ('t33', 'Table 33', 33),
      ('t34', 'Table 34', 34),
      ('t35', 'Table 35', 35)
    on conflict (id) do nothing;
  end if;
end
$$;

update public.staff_tables
set map_x = 10 + ((sort_order - 1) % 5) * 20,
    map_y = 7 + ((sort_order - 1) / 5) * 14
where map_x is null or map_y is null;

alter table public.staff_tables
  alter column map_x set default 50,
  alter column map_x set not null,
  alter column map_y set default 50,
  alter column map_y set not null;

alter table public.staff_tables
  drop constraint if exists staff_tables_map_x_check,
  drop constraint if exists staff_tables_map_y_check;

alter table public.staff_tables
  add constraint staff_tables_map_x_check check (map_x between 0 and 100),
  add constraint staff_tables_map_y_check check (map_y between 0 and 100);
