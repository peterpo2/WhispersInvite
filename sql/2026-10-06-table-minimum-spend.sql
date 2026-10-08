alter table public.staff_tables
  add column if not exists minimum_spend_eur integer;

update public.staff_tables
set minimum_spend_eur = 0
where minimum_spend_eur is null;

alter table public.staff_tables
  alter column minimum_spend_eur set default 0,
  alter column minimum_spend_eur set not null;

alter table public.staff_tables
  drop constraint if exists staff_tables_minimum_spend_eur_check;

alter table public.staff_tables
  add constraint staff_tables_minimum_spend_eur_check
  check (minimum_spend_eur >= 0);
