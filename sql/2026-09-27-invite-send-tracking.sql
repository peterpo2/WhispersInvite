alter table public.guest_list
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_send_count integer not null default 0;

update public.guest_list
set confirmation_email_send_count = 0
where confirmation_email_send_count is null;
