# WHISPERS Invite

Private, mobile-first invitation for WHISPERS, Saturday 10 October 2026, doors 22:00.
Static HTML on Cloudflare Pages, Pages Functions for the API, Supabase for the data.

- **What to do next:** [`TASKS.md`](TASKS.md)
- **Every SQL query you may need:** [`sql/useful-queries.sql`](sql/useful-queries.sql)
- **Technical reference for developers and agents:** [`AGENTS.md`](AGENTS.md)

## Links

| URL | What it is |
|---|---|
| `https://whispers-invite.pages.dev/` | The shared invitation. Asks for the guest's full name. |
| `/hi/<id>` | A personal invitation. The name from `guest_list` is shown on the seal. |
| `/ticket/<token>` | A ticket with its QR code (the guest's or the plus-one's own). |
| `/staff/rose-door-10` | Door scanner for staff. Not linked from anywhere public. |

Everything else (`sql/`, `test/`, docs, package files) answers 404.

## Guest flow

Seal (press and hold) → short film → event details → name (plain link only) →
**Will you be there?** → optional plus-one (name + email) → tickets.

- The guest and the plus-one each get their **own ticket**: seal code, QR and check-in.
- **Private ticket** saves the ticket(s) to the phone as images, named after each person.
- Replying again from the same `/hi/` link updates the answer and keeps the ticket.
- The venue appears on tickets once it is set in `event_details` (see `sql/useful-queries.sql`).

## Door flow

Open the scanner → **Open camera** → hold the QR 20–40 cm away. After each scan the camera
stops, the result shows (Confirmed / Already inside / Invalid) and the list of arrivals
scrolls into view. **Scan next** starts again. **Switch** changes camera if the picture is blurry.

## Project structure

```text
index.html                       The invitation (inline CSS/JS, no build step)
assets/                          Seal, mark and rose images; ticket-card.js (ticket images)
functions/_middleware.js         Path allowlist + security headers on every response
functions/_shared/               Tested helpers: RSVP rules, access list, security headers
functions/api/                   rsvp, ticket, door, checkin (old links), guest-check
functions/ticket/[token].js      Ticket page
functions/hi/[token].js          Personal invitation link → /?token=
functions/staff/rose-door-10.js  Door scanner
sql/                             Schema, migrations, add-guests.sql, useful-queries.sql
test/                            node --test suites
docs/project-spec.md             Product spec
whispers-invitation-dev-brief.md Original client brief (design, tone and copy)
```

## Setup

Cloudflare Pages needs two environment variables, set only in the Pages project settings.
Never commit them.

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

For a fresh Supabase project run `sql/schema.sql`. The production database already has every
migration in `sql/2026-09-*.sql`.

## Commands

```bash
npm install     # dev dependency: wrangler
npm test        # node --test
npx wrangler pages dev .    # local server with Functions (needs .dev.vars)
```

Deploys come from GitHub: merging to `main` publishes production, and any other branch gets
a preview at `https://<branch>.whispers-invite.pages.dev` (previews have no database).

## Security

- The Supabase service-role key lives only in Cloudflare; the browser never sees it.
- The middleware serves only the pages and API routes above; everything else is a 404.
- Every response has a Content-Security-Policy (scripts only from the site and jsDelivr,
  data only to the site), no framing, no referrer, HSTS and `noindex`.
- User input is validated on the server and escaped wherever it is shown.
