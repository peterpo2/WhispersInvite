begin;

alter table public.staff_tables
  add column if not exists is_ready boolean not null default false;

update public.staff_tables
set is_ready = true
where is_ready = false
  and (
    table_map_edited_at is not null
    or hall_map_edited_at is not null
  );

notify pgrst, 'reload schema';

commit;
