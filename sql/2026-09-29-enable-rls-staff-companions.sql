-- Closes Supabase Security Advisor "RLS Disabled in Public" findings.
-- These tables are accessed only through Cloudflare Pages Functions using
-- SUPABASE_SERVICE_ROLE_KEY, so no public anon/authenticated policies are needed.

alter table public.rsvp_companions enable row level security;
alter table public.staff_tables enable row level security;
alter table public.staff_table_assignments enable row level security;

notify pgrst, 'reload schema';
