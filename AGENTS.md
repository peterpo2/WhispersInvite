# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

**WHISPERS Invite** is a private, mobile-first digital invitation for the WHISPERS event
(Hotel Juno, Sofia, Saturday 10 October, doors 22:00).

- One shared link plays a **seal → film → letter** sequence.
- The guest types their own full name and RSVPs (attend or decline). They can add one plus-one
  (name and email).
- An attending guest gets a private **ticket URL with a QR code**.
- Door staff scan QR codes on a hidden scanner page.

**Stack:** static HTML on **Cloudflare Pages**, **Pages Functions** (ES modules) and **Supabase**
(Postgres through the PostgREST REST API; no SDK). There is no framework, no bundler and no build step.

- Production: https://whispers-invite.pages.dev/
- Staff scanner: `/staff/rose-door-10`. Access is private by link only. Never link it from public pages.

## Setup and commands

```bash
npm install                                  # only dev dependency: wrangler
npm test                                     # node --test (Node built-in runner)
node --test test/rsvp.test.js                # run a single test file
npx wrangler pages dev .                     # local dev server with Functions
npx wrangler pages deploy . --project-name whispers-invite --branch main   # deploy
```

- The **repo root is the Pages output directory**. `.assetsignore` is meant to keep `api/`,
  `sql/`, `test/`, `node_modules/`, `package*.json` and `README.txt` out of the upload, but the
  Pages deploy ignores it. `functions/_middleware.js` is what actually blocks those files: it
  only lets allowlisted paths through (see Routes).
- Local secrets go in `.dev.vars` (gitignored). They are only needed for `wrangler pages dev`:
  ```
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  ```
  In production they are set only in the Cloudflare Pages project settings. Never commit them.

## Repository map

```text
index.html                         Live invitation page (~350 KB single file; see below)
functions/
  _middleware.js                   Path allowlist, security headers, /robots.txt (runs first)
  _shared/access.js                isPublicPath(): the middleware allowlist (tested)
  _shared/responses.js             json(), methodNotAllowed()
  _shared/supabase.js              getSupabaseEnv(), supabaseFetch()
  _shared/rsvp.js                  Pure validation / row-building / URL helpers (tested)
  api/rsvp.js                      POST /api/rsvp
  api/ticket.js                    GET  /api/ticket?token=
  api/checkin.js                   GET  /api/checkin?token=   (legacy link: 302 to the ticket)
  api/door.js                      GET/POST /api/door          (staff scanner API)
  ticket/[token].js                GET  /ticket/:token         (ticket page)
  staff/rose-door-10.js            GET  /staff/rose-door-10    (camera QR scanner)
sql/schema.sql                     Full schema for a fresh Supabase project
sql/2026-09-24-door-scanner.sql    Migration for the existing production DB (ticket_token)
sql/2026-09-24-rsvp-columns.sql    Idempotent migration: missing rsvps columns and unique indexes
sql/2026-09-25-plus-one-tickets-and-venue.sql  Plus-one ticket columns (+ backfill) and event_details (venue)
assets/ticket-card.js              Draws tickets as 1080×1920 PNGs and saves/shares them (window.WhispersTickets)
sql/2026-09-24-seal-code-unique.sql  Idempotent migration: unique (event_key, seal_code) index
test/rsvp.test.js                  node:test suite for functions/_shared/rsvp.js
test/access.test.js                node:test suite for functions/_shared/access.js
docs/project-spec.md               Project spec
README.md                          Setup, Supabase and deployment notes
whispers-invitation-dev-brief.md   Original client brief: source of truth for design, tone, copy
```

**Legacy files. Do not extend them.**
- `api/guests.js` and `api/rsvp.js` are old Vercel-style handlers and are not deployed.
- `whispers-invitation.html` is the original prototype. `index.html` is the live page.
- `README.txt` holds deployment notes for the shared-link package.
- The brief's per-guest token-link model was replaced by the shared link.

## Architecture

### End-to-end flow
1. The guest opens `/hi/<token>` (redirects to `/?token=<token>`) or the plain `/`
   (`index.html`). The screens are seal → film → letter → [identify] → rsvp → plus →
   done / decline. With a token, `/api/guest-check` supplies the name (shown on the seal) and
   identify is skipped. Without one, identify asks for a full name (2+ words).
2. `submitRSVP()` POSTs to `/api/rsvp`, which returns `ticketToken`, `sealCode`, `ticketUrl`
   and `checkInUrl`.
3. `/ticket/:token` renders the ticket page. It fetches `/api/ticket` on the client and draws a
   QR code that encodes the ticket's own URL (`/ticket/<token>`, built server-side from the
   token).
4. **Every QR encodes the ticket URL, never the check-in URL.** Opening a QR with a phone camera
   only shows the ticket. Only door staff check guests in:
   - `/api/checkin` no longer mutates anything. It 302s to `/ticket/<token>` so QR codes and
     links issued before this change still land on the ticket.
   - Staff scan on `/staff/rose-door-10`, which POSTs to `/api/door` and lists recent
     check-ins. The camera ignores the same value repeated within 4 s (a `Map` of value →
     last-seen time, refreshed on each repeat); manual Check always re-checks. "Already inside." is a crimson `warn` result with the first check-in time and
     a vibration, clearly different from "Confirmed.".
   - The ticket page and scanner use the brief's fonts and colour tokens. The ticket page shows
     a retry message if the ticket fetch fails and the ticket link as text if the QR library
     does not load.

### Routes (Pages Functions, file-based routing)
| Method | Path | File | Behaviour |
|---|---|---|---|
| POST | `/api/rsvp` | `functions/api/rsvp.js` | Validate → reject a plus-one email already used by another attending guest of this event (`409`) → if the body has an invitation `guestId` that already has a row, PATCH that row with `buildRsvpUpdate` (guarded by `checked_in_at=is.null`; same ticket token and seal code; a checked-in guest gets `409` "already been used at the door") → otherwise plain insert into `rsvps` (`Prefer: return=minimal`; an insert `409` maps to the duplicate-email error only when `isDuplicatePlusOneEmail(pgError)` is true; when `isDuplicateSealCode(pgError)` is true it rebuilds the row with a fresh seal code and token and retries, up to 3 retries; any other `409`, or running out of retries, returns `502`) → returns only `{ ok, ticketToken, sealCode, ticketUrl, checkInUrl }` (`sealCode` is null for a decline; the frontend never uses `checkInUrl`) |
| GET | `/api/ticket?token=` | `functions/api/ticket.js` | Looks the token up in `ticket_token` **or** `plus_one_ticket_token` and returns `ticketForToken(row, token)` (`holder`, `guest_name`, `seal_code`, `checked_in_at`, `bringing`, `brought_by`), `venue` (`publicVenue` of `event_details`: null until set and past `reveal_at`), `ticketUrl`, `checkInUrl` |
| GET | `/api/checkin?token=` | `functions/api/checkin.js` | Read-only. `302` to `checkInRedirectPath(token)`: `/ticket/<token>`, or `/` for a missing/malformed token |
| GET | `/api/door` | `functions/api/door.js` | The 80 most recent check-ins, guest and plus-one as separate entries (`doorScans`) |
| POST | `/api/door` | `functions/api/door.js` | Body `{token\|value\|url}` (parsed by `tokenFromValue`) → finds the guest or plus-one ticket → PATCHes `checked_in_at` or `plus_one_checked_in_at` (`is.null` guard) → `checked_in` / `already_checked_in`; the ticket object never includes tokens or ids |
| GET | `/ticket/:token` | `functions/ticket/[token].js` | Server-rendered ticket page |
| GET | `/staff/rose-door-10` | `functions/staff/rose-door-10.js` | Server-rendered camera scanner |

Handlers export `onRequestGet` / `onRequestPost`, plus a catch-all `onRequest` that returns
`methodNotAllowed()` (405).

Check-in happens only in `door.js`. It is atomic: `door.js` PATCHes with `&checked_in_at=is.null` and
`Prefer: return=representation`. Zero returned rows means someone else checked the ticket in
first, so the result is "already checked in".

`functions/_middleware.js` runs before every request:
- Only `/`, `/index.html`, the `/api/*` routes above (exact names, so `/api/*.js` is blocked),
  `/ticket/:token`, `/hi/:token`, `/staff/rose-door-10` and `/assets/<lowercase-name>.png|js`
  reach `next()`. Everything else is a no-store 404.
  Add any new route to `isPublicPath` in `functions/_shared/access.js` and its test.
- `/robots.txt` returns `Disallow: /`.
- Every response gets `X-Frame-Options: DENY`, HSTS, `Referrer-Policy: no-referrer`,
  `nosniff`, a `Permissions-Policy` (camera self only) and `X-Robots-Tag: noindex, nofollow`.
  There is no CSP yet; inline scripts and styles would need one written carefully.

### Shared helpers (`functions/_shared/`)
- `responses.js`: `json(data, status = 200)` always sets `Cache-Control: no-store`.
  `methodNotAllowed()` returns a 405.
- `supabase.js`: `supabaseFetch(env, path, init)` adds the service-role auth headers.
  - When the env vars are missing it returns `{ error: Response }`. Otherwise it returns
    `{ response }`.
  - `getSupabaseEnv(env)` reads and checks the env vars.
- `rsvp.js`:
  - `validateRsvpPayload(body)`:
    - `guestName` and `status` must be strings. `guestName` needs at least 2 words and at most
      120 chars.
    - `status` must be `attending` or `declined`.
    - There is no word-count rule on names (at most 120 chars). An optional `guestId` must be a
      string of at most 120 chars.
    - For `attending`, an optional `plusOne` must be an object with a string name
      (at most 120 chars) and a valid string email (at most 254 chars). For `declined`, the
      plus-one is ignored.
  - `buildRsvpRow(body, makeId, now, makeSeal)` produces the DB row. The server owns identity:
    the client's `ticketToken`, `event`, `submittedAt` and `sealCode` are ignored.
    - `ticket_token` = `makeId()`. `guest_id` is the invitation `guestId` (from `/hi/<token>`)
      when given, otherwise the ticket token.
    - `event_key` is always `EVENT_KEY` (`"whispers-2026-10-10"`).
    - `submitted_at` is `now().toISOString()` (inject `now` in tests).
    - `seal_code` is `makeSeal()` for attending rows and null for declined rows.
    - The email is normalised. Declined rows have null plus-one fields.
  - Each plus-one has their **own ticket**: `plus_one_ticket_token`, `plus_one_seal_code`,
    `plus_one_checked_in_at` (the second `makeId()` / `makeSeal()` call in `buildRsvpRow`).
    `/api/rsvp` returns `plusOneTicketToken`, `plusOneSealCode`, `plusOneTicketUrl`.
  - `buildRsvpUpdate` keeps the plus-one's ticket only when the email is unchanged; a new plus-one
    gets a new ticket. `/api/rsvp` refuses (409) to replace a plus-one who is already inside.
  - `buildRsvpUpdate(row, existing)`: the PATCH for a repeat RSVP from the same invitation. It
    carries name, status, plus-one and `submitted_at`, keeps `existing.seal_code` (a guest who
    first declined gets the new one), and never touches `ticket_token`, `guest_id` or `event_key`.
  - `makeSealCode(randomInt)`: `WSP·10·XXXX` (the brief's format), four characters drawn from
    `SEAL_ALPHABET` (`ACDEFGHJKMNPQRTUVWXYZ234679`: no 0/O, 1/I/L, 5/S, 8/B).
    `randomInt(max)` returns an integer in `[0, max)`; the default uses
    `crypto.getRandomValues` with rejection sampling. Uniqueness is enforced by the DB index,
    not by the generator.
  - `makeTicketToken(randomId)`: a UUID reduced to alphanumerics, at most 40 chars.
  - `tokenFromValue(value)`: pulls a ticket token from a scanned ticket URL (what QRs encode),
    legacy check-in URL or bare token. It returns `""` unless the result is 32–40 alphanumeric chars.
  - `normalizeEmail`: trims and lowercases.
  - `isDuplicatePlusOneEmail(pgError)`: true only for a Postgres `23505` unique violation whose
    message mentions `plus_one_email`.
  - `isDuplicateSealCode(pgError)`: the same, for a message that mentions `seal_code`.
  - `checkInRedirectPath(token)`: `/ticket/<encoded token>` for a 1–64 char `[A-Za-z0-9_-]`
    token, otherwise `/`.
  - `validateGuestQuery(q)`: queries must be 2–80 chars.
  - `siteOriginFromRequestUrl`, `buildTicketUrl`, `buildCheckInUrl`: build absolute URLs from
    the request origin.

### Frontend: `index.html`
- Inline CSS and JS. The two images live in `assets/`: `whispers-seal.png` (the seal on the
  first screen, preloaded) and `whispers-mark.png` (the transparent mark, reused on every screen,
  the ticket page, the scanner and, heavily blurred and masked, as the rose in the background).
- Visual system: one fixed `.atmos` layer behind all screens (warm glow, film light beam, rose,
  crimson haze). `show()` sets `body[data-scene]`, and CSS fades/moves the layers per scene.
  Screens are frameless, full-height (`100dvh` with a `100vh` fallback) and pad for safe areas;
  long screens scroll inside themselves. `show()` also gives the outgoing screen `.out` for
  a 700 ms blur/fade exit. Primary buttons are gold-filled (`.btn.primary`), secondary are thin
  outlines; `.caps` switches a button to Jost uppercase.
- The seal's progress ring `<svg>` needs an explicit width/height: iOS Safari does not stretch
  an SVG from `inset` alone, and the ring rendered off-centre.
- It loads the QR library from jsDelivr (`qrcode@1.5.1/build/qrcode.min.js`, which is also used by
  `ticket/[token].js`) and Google Fonts (Cormorant Garamond, Jost). Don't bump to 1.5.4: that
  version has no `build/` folder and the URL returns 404.
- Screens are `<section class="screen" id="s-*">`: `s-seal`, `s-film`, `s-letter`,
  `s-identify`, `s-rsvp`, `s-plus`, `s-done`, `s-decline`. `show()` swaps the `.on` class.
- Seal: press and hold for `HOLD=1250` ms with a gold progress ring. `Enter ›` is the escape
  path.
  - Pointer events only (with `setPointerCapture`); don't add touch/mouse handlers. `start()`
    returns early while `raf` is set and `stop()` resets `raf=null`, so only one rAF loop runs.
    `#sealimg` is `draggable="false"` with `-webkit-user-drag:none`, because an iOS image drag
    would fire `pointercancel` mid-hold.
  - Keyboard: `#sealwrap` is `role="button" tabindex="0"`; holding Space/Enter works the same
    (key repeat ignored).
  - `#skipseal` / `#skipfilm` live outside the `.screen` sections so their `z-index` can sit
    above the `body::after` vignette. `show()` toggles their `display`.
- `submitRSVP()` POSTs `{ guestName, guestId, status, plusOne }` to `SUBMIT_URL = '/api/rsvp'`. The
  client does not make seal codes.
  - There is **no localStorage fallback**. A non-2xx response returns
    `{ ok:false, error: data.error }`, and a network error returns a "could not reach us"
    message.
  - Errors appear in the `.err` element of the current screen (`#perr` on `s-plus`, `#rerr` on
    `s-rsvp`), and the guest stays on the form so they can retry. `.err` is `role="alert"` and
    uses `#E0707A` (crimson `#A31621` is too dark for text on `--bg`).
  - The pending state ("Sealing…") goes in the neutral `.submit-state` line (`#pstate`,
    `#rstate`), never in `.err`. While a request is in flight `setBusy()` disables `#yes`,
    `#no`, `#confirm` and `#backRsvp`; they are re-enabled only on error. The confirm error
    shows the server's `result.error` (e.g. the duplicate-email 409), falling back to the
    generic message.
  - The fetch aborts after 12 s (`AbortController`); an abort shows the network error.
  - Both `s-done` QRs (`#qr` on the guest card and `#qr2` on the plus-one card in the
    `buildTicketCards()` carousel) encode `state.ticketUrl` only: the server's `ticketUrl`, or
    `/ticket/<ticketToken>` if it is missing. With neither, the guest sees the save error.
    Never encode `checkInUrl` or the seal code.
  - `#passcode` shows the server's `sealCode`. The plus-one shares the guest's row and token,
    so their card shows the same seal code and QR (the brief's one-code-per-person model would
    need its own plus-one row). Before submit the code reads `—`.
  - `s-plus` uses the brief's copy: "One person. Choose well." / "Their name and address go on
    the door list with yours. Names cannot be changed after the seventh."

### Database (`sql/`)
- `rsvps` columns:
  - `id`, `event_key`, `guest_id`, `guest_name`
  - `status` (`attending` or `declined`)
  - `plus_one_name`, `plus_one_email`, `seal_code`
  - `ticket_token`, `checked_in_at`, `submitted_at`
- Unique constraints:
  - `(event_key, guest_id)`
  - `(event_key, lower(plus_one_email))` where not null
  - `ticket_token` where not null
  - `(event_key, seal_code)` where not null
- `guest_list` is a legacy/demo table.
- Put schema changes in a new dated migration, `sql/YYYY-MM-DD-<topic>.sql`, and update
  `schema.sql` to match.
- `2026-09-24-rsvp-columns.sql` idempotently adds the columns and indexes that production may be
  missing: `checked_in_at` was indexed but never added by the door-scanner migration, and the
  plus-one email unique index was never created. It also drops the legacy
  `rsvps_guest_id_fkey`. Run it by hand in the Supabase SQL editor.
- `2026-09-24-seal-code-unique.sql` idempotently adds `rsvps_event_seal_code_unique`. Old
  client-hashed codes can collide, so run its commented duplicate check (and the commented
  fix-up if needed) first. Run it by hand in the Supabase SQL editor.

## Coding conventions

- ES modules everywhere (`"type": "module"`).
- In `functions/`, use double quotes, semicolons and 2-space indentation.
- The script in `index.html` is compact, minified-style code. Match the density around your edit.
- Talk to Supabase **only** through `supabaseFetch`. Always `encodeURIComponent` values that go
  into PostgREST filters.
- Handler error pattern:
  ```js
  if (x.error) return x.error;
  if (!x.response.ok) return json({ error: "Could not ..." }, 502);
  ```
  Never return upstream error bodies or stack traces to the client.
- Parse request bodies inside `try/catch` and return `400` with a short user-facing message.
- Any user data rendered into HTML must be escaped:
  - Server-side: `escapeHtml`, defined locally in `ticket/[token].js`.
  - Client-side on the scanner page: `esc()`.
- Put validation and normalisation logic as **pure functions** in `functions/_shared/rsvp.js`.
  Inject randomness, IDs and clocks as dependencies (see `makeTicketToken(randomId)` and
  `buildRsvpRow(body, makeId, now)`) so they can be tested without Workers or Supabase.
- User-facing copy is short and restrained ("Please give your full name.").
- Scope: build only what was asked. Don't refactor code nobody asked you to change, don't add
  compatibility shims, and don't leave half-finished features.

## Testing

- Tests use `node:test` and `node:assert/strict` in `test/*.test.js`.
- They import **only** from `functions/_shared/`. There are no Worker or Supabase mocks.
- Write the failing test first for any new logic, then implement it.
- Run `npm test` before you consider a change done.
- Handlers and `index.html` have no automated tests. Check them manually with
  `npx wrangler pages dev .`.

## Design rules (from the brief)

- Colour tokens (CSS vars):

  | Var | Token | Value |
  |---|---|---|
  | `--bg` | bg | `#0B0908` |
  | `--bg2` | panel | `#12100E` |
  | `--gold` | gold | `#D9AE78` |
  | `--gold-dim` | gold-dim | `#8B6F4C` |
  | `--red` | crimson | `#A31621` |
  | `--bone` | bone | `#EDE6DA` |
  | `--mute` | muted | `#8C8176` |
- Type:
  - Cormorant Garamond 300 for serif text.
  - Jost 300, uppercase with wide tracking, for labels and buttons.
- Buttons are outlined, with **only one primary action per screen**.
- Keep it restrained: no countdowns, galleries, share buttons, analytics or cookies. Dark only,
  with no light mode.
- Mobile first:
  - No horizontal scroll at 320px.
  - Support iOS Safari 16+.
  - Respect `prefers-reduced-motion`.

## Security and privacy

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never send it to the client or log it.
- Ticket URLs and QR codes are **bearer tickets**. Treat tokens as secrets and never log them.
- The staff route has no protection beyond its obscure URL. Put Cloudflare Access in front of it
  before sharing it widely.
- Plus-one name and email are third-party personal data under GDPR. Collect only what is needed.
- Never commit secrets: `.dev.vars`, `.env*`, tokens or keys.

## Gotchas

- This is a Windows dev machine, so git may convert LF/CRLF on `index.html`. Keep the existing
  line endings.
- Git-ignored local paths: `.wrangler/`, `.dev.vars`, `.env*`, `.superpowers/`. Never commit
  `.superpowers/`, which is local brainstorming scratch space.
- Ignore the stray `New Text Document (2).txt` (gitignored).
- Stage specific files rather than `git add .`, and never skip hooks with `--no-verify`.
