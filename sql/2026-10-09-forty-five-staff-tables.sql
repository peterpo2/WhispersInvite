insert into public.staff_tables (id, label, sort_order, map_x, map_y) values
  ('t36', 'Table 36', 36, 10, 14),
  ('t37', 'Table 37', 37, 30, 14),
  ('t38', 'Table 38', 38, 50, 14),
  ('t39', 'Table 39', 39, 70, 14),
  ('t40', 'Table 40', 40, 90, 14),
  ('t41', 'Table 41', 41, 10, 28),
  ('t42', 'Table 42', 42, 30, 28),
  ('t43', 'Table 43', 43, 50, 28),
  ('t44', 'Table 44', 44, 70, 28),
  ('t45', 'Table 45', 45, 90, 28)
on conflict (id) do nothing;
