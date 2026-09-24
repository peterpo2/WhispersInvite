# CLAUDE.md

WHISPERS Invite: a private, mobile-first invitation for WHISPERS (Sofia, Saturday 10 October
2026, doors 22:00). Static HTML on **Cloudflare Pages** + **Pages Functions** + **Supabase**
(PostgREST over `fetch`, no SDK). No framework, no bundler, no build step.

**Full technical reference: [`AGENTS.md`](AGENTS.md).** Owner-facing: [`README.md`](README.md),
[`TASKS.md`](TASKS.md), [`sql/useful-queries.sql`](sql/useful-queries.sql). Keep all four
in sync with the code when you change behaviour.

## Commands
```bash
npm test                    # node --test (41 tests); write the failing test first
npx wrangler pages dev .    # local server with Functions (needs .dev.vars)
```
Deploys come from GitHub (peterpo2/WhispersInvite): merging to `main` publishes production;
other branches get previews at `https://<branch>.whispers-invite.pages.dev` (no database).

## Map
- `index.html`: the invitation (inline CSS/JS). Screens `s-seal`, `s-film`, `s-letter`,
  `s-identify` (plain link only), `s-rsvp`, `s-plus`, `s-done`, `s-decline`; `show()` switches
  them and sets `body[data-scene]` for the background.
- `assets/`: seal, mark and rose PNGs; `ticket-card.js` draws/saves ticket images.
- `functions/api/`: `rsvp`, `ticket`, `door`, `checkin` (old links → ticket), `guest-check`.
- `functions/ticket/[token].js`, `functions/hi/[token].js`, `functions/staff/rose-door-10.js`.
- `functions/_middleware.js`: path allowlist (`_shared/access.js`) + headers (`_shared/security.js`).
- `functions/_shared/rsvp.js`: pure, tested RSVP / ticket / door / venue logic.
- `sql/`: `schema.sql`, dated migrations (all run on production), `useful-queries.sql`.

## Rules
- A new route must be added to `isPublicPath` (and its test), or it returns 404.
- A new external script, font or API host must be added to the CSP in `_shared/security.js`.
- Talk to Supabase only through `supabaseFetch`; `encodeURIComponent` every filter value.
- Handlers: `if (x.error) return x.error; if (!x.response.ok) return json({ error }, 502);`.
  Never return upstream errors or stack traces. Parse bodies in `try/catch` → 400.
- Escape user data in HTML (`escapeHtml` / the scanner's `esc`).
- Schema changes: a new `sql/YYYY-MM-DD-<topic>.sql` (idempotent) and update `schema.sql`.
  The owner runs it in Supabase **before** the code that needs it is merged.
- `functions/`: ES modules, double quotes, semicolons, 2-space indent. `index.html` script is
  compact; match the surrounding density. Keep existing line endings (CRLF on Windows).
- QR library: `qrcode@1.5.1/build/qrcode.min.js` (1.5.4 has no `build/`).

## Design (from `whispers-invitation-dev-brief.md`)
Dark only: bg `#070605`, gold `#D9AE78`, bone `#EDE6DA`, crimson `#A31621`. Cormorant Garamond
(serif), Jost uppercase for labels and buttons. Full-screen, frameless, gold-filled primary and
thin-outlined secondary buttons. Restraint: no countdowns, galleries, share buttons or analytics.
Mobile first: 320px without horizontal scroll, iOS Safari, `prefers-reduced-motion`.

## Owner decisions
- Keep readable guest ids (`/hi/petarp`); no password or staff code on the scanner. The site
  holds only names, so do not add extra URLs or auth for protection.
- Ticket URLs and QR codes are bearer tickets: don't log tokens.
- Never commit `.dev.vars`, keys or tokens. `SUPABASE_SERVICE_ROLE_KEY` lives only in Cloudflare.
