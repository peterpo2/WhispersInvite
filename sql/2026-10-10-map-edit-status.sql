alter table public.staff_tables
  add column if not exists hall_map_edited_at timestamptz,
  add column if not exists table_map_edited_at timestamptz;
