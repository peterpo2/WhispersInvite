-- ══════════════════════════════════════════════════════════════
--  WHISPERS — Guest List Import
--  Run in Supabase SQL Editor to add guests and get their links.
--
--  Each guest gets a unique token (their invitation URL).
--  Link format: https://whispers-invite.pages.dev/?token=<id>
-- ══════════════════════════════════════════════════════════════

-- ── Test guests (use these until you have the real list) ──────
INSERT INTO public.guest_list (id, name, email) VALUES
  ('wsp-test-01', 'Peter Popov',      null),
  ('wsp-test-02', 'Simona Ivanova',   null),
  ('wsp-test-03', 'Alex Stoyanov',    null),
  ('wsp-test-04', 'Maria Nikolova',   null),
  ('wsp-test-05', 'Georgi Petrov',    null)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ── View all guests with their invitation links ───────────────
SELECT
  id,
  name,
  email,
  'https://whispers-invite.pages.dev/?token=' || id AS invitation_link,
  created_at
FROM public.guest_list
ORDER BY name;

-- ══════════════════════════════════════════════════════════════
--  HOW TO ADD THE REAL GUEST LIST:
--
--  Replace the test values above with real names.
--  Use a short readable ID (no spaces, no special chars):
--
--  INSERT INTO public.guest_list (id, name, email) VALUES
--    ('wsp-nikola-g',   'Nikola Georgijev',  'nikola@example.com'),
--    ('wsp-aleksandra', 'Aleksandra Kovač',  null),
--    ...
--  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
--
--  Or use random tokens for privacy:
--    SELECT gen_random_uuid()::text AS token;  -- run once per guest
-- ══════════════════════════════════════════════════════════════
