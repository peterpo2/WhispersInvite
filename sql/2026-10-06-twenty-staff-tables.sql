-- Adds the second set of ten tables without changing existing table settings.
insert into public.staff_tables (id, label, capacity, sort_order) values
  ('t11', 'Table 11', 6, 11),
  ('t12', 'Table 12', 6, 12),
  ('t13', 'Table 13', 6, 13),
  ('t14', 'Table 14', 6, 14),
  ('t15', 'Table 15', 6, 15),
  ('t16', 'Table 16', 4, 16),
  ('t17', 'Table 17', 4, 17),
  ('t18', 'Table 18', 4, 18),
  ('t19', 'Table 19', 4, 19),
  ('t20', 'Table 20', 4, 20)
on conflict (id) do nothing;
