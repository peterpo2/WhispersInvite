-- ══════════════════════════════════════════════════════════════
--  WHISPERS — Guest List Import
--  Run in Supabase SQL Editor to add guests and get their links.
--
--  Each guest gets a unique token (their invitation URL).
--  Link format: https://whispers-invite.pages.dev/?token=michelleg
-- ══════════════════════════════════════════════════════════════

-- ── Test guests (use these until you have the real list) ──────
INSERT INTO public.guest_list (id, name, email) VALUES
  ('michelleg',   'Michelle Georgieva',  null),
  ('petarp',      'Petar Popov',         null),
  ('simonai',     'Simona Ivanova',      null),
  ('alexs',       'Alex Stoyanov',       null),
  ('marian',      'Maria Nikolova',      null)
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
