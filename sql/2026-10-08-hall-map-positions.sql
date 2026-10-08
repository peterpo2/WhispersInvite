-- MAP tab: table positions on the Rev D floor plan, separate from the Tables -> Show map positions.
-- Percent of the drawing's viewBox (-56 -52 849 895). Tables 31-35 are not on the plan (null).
alter table public.staff_tables
  add column if not exists hall_x numeric(5,2) check (hall_x between 0 and 100),
  add column if not exists hall_y numeric(5,2) check (hall_y between 0 and 100);

update public.staff_tables as t
set hall_x = v.hall_x, hall_y = v.hall_y
from (values
  ('t1', 10.31, 14.49),
  ('t2', 18.85, 14.49),
  ('t3', 27.37, 14.49),
  ('t4', 35.90, 14.49),
  ('t5', 44.44, 14.49),
  ('t6', 52.97, 14.49),
  ('t7', 61.51, 14.49),
  ('t8', 10.31, 22.47),
  ('t9', 18.85, 22.47),
  ('t10', 27.37, 22.47),
  ('t11', 35.90, 22.47),
  ('t12', 44.44, 22.47),
  ('t13', 52.97, 22.47),
  ('t14', 61.51, 22.47),
  ('t15', 10.31, 30.45),
  ('t16', 21.68, 30.45),
  ('t17', 33.06, 30.45),
  ('t18', 47.41, 30.45),
  ('t19', 61.51, 30.45),
  ('t20', 10.31, 43.59),
  ('t21', 19.12, 43.59),
  ('t22', 27.92, 43.59),
  ('t23', 36.73, 43.59),
  ('t24', 45.52, 43.59),
  ('t25', 54.33, 43.59),
  ('t26', 38.01, 51.56),
  ('t27', 46.17, 51.56),
  ('t28', 54.33, 51.56),
  ('t29', 83.77, 51.56),
  ('t30', 83.77, 59.54)
) as v(id, hall_x, hall_y)
where t.id = v.id and (t.hall_x is null or t.hall_y is null);
