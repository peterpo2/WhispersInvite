# WHISPERS Invite

Private, mobile-first digital invitation for WHISPERS at Hotel Juno, Sofia, on Saturday
10 October 2026. The experience is deliberately small: seal, short film, letter, RSVP,
private ticket, staff scanner.

The site is static HTML on Cloudflare Pages, with Pages Functions for the API and Supabase
Postgres through the REST API. There is no framework, no bundler and no build step.

## Current State

- Live site: `https://whispers-invite.pages.dev/`
- Staff scanner: `https://whispers-invite.pages.dev/staff/rose-door-10`
- Next operational steps: [`TASKS.md`](TASKS.md)
- Owner SQL queries: [`sql/useful-queries.sql`](sql/useful-queries.sql)
- Developer/agent reference: [`AGENTS.md`](AGENTS.md)
- Product spec: [`docs/project-spec.md`](docs/project-spec.md)
- Original design brief: [`whispers-invitation-dev-brief.md`](whispers-invitation-dev-brief.md)

## Routes

| URL | Purpose |
|---|---|
| `/` | Shared invitation. The guest types their full name. |
| `/hi/<id>` | Personal invitation. The name from `guest_list` is shown on the seal. |
| `/ticket/<token>` | Private ticket page for a guest or plus-one. |
| `/staff/rose-door-10` | Staff scanner. Keep private and do not link from public pages. |

The middleware allowlist blocks repository files, docs, SQL files, tests and unknown routes.

## Guest Flow

1. Guest opens `/hi/<id>` or `/`.
2. The page plays seal -> film -> letter.
3. A plain link asks for the guest's full name. A personal link uses `guest_list`.
4. The guest accepts or declines.
5. If accepting, they may add one plus-one with name and email.
6. The server creates private ticket tokens and seal codes.
7. The done screen shows ticket cards and saves them as phone images.

The guest and the plus-one each get their own ticket token, seal code, QR code and check-in
state. QR codes encode `/ticket/<token>`, not `/api/checkin`. A normal phone camera opens the
ticket page; only the staff scanner checks people in.

Repeat RSVPs from the same personal identity keep the guest ticket. If the guest
confirms again without entering a plus-one, an existing plus-one is kept. If they enter a
different plus-one, the old plus-one ticket stops working and a new one is issued.

## Door Flow

Open `/staff/rose-door-10`, tap **Open camera**, and scan the QR from the ticket page or saved
ticket image. The scanner posts to `/api/door`, marks the guest or plus-one as checked in, and
shows one of three states:

- Confirmed
- Already inside
- Invalid ticket

The scanner keeps guest and plus-one check-ins separate and shows the latest arrivals list.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/guest-check?token=` | Looks up personal invitation links. |
| `POST` | `/api/rsvp` | Validates RSVP, writes or updates the row, returns ticket URLs and seal codes. |
| `GET` | `/api/ticket?token=` | Returns the public ticket payload for a guest or plus-one token. |
| `GET` | `/api/checkin?token=` | Legacy read-only link. Redirects to `/ticket/<token>`. |
| `GET` | `/api/door` | Returns recent checked-in guests and plus-ones. |
| `POST` | `/api/door` | Checks in a scanned guest or plus-one ticket atomically. |

## Setup

Install the only dev dependency:

```bash
npm install
```

For local Pages Functions, create `.dev.vars` with:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never commit `.dev.vars`, `.env*`, tokens or Supabase keys. In production these variables live
only in the Cloudflare Pages project settings.

For a fresh Supabase project, run `sql/schema.sql`. For the existing production database, the
dated migrations in `sql/2026-09-*.sql` are already represented in the current schema.

## Commands

```bash
npm test
npx wrangler pages dev .
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

GitHub deploys production from `main`. Other branches get Cloudflare preview deployments, but
previews do not have production database access unless variables are configured there.

## Project Structure

```text
index.html                       Invitation UI, inline CSS and JS
assets/                          Runtime images and ticket-card.js
functions/_middleware.js         Route allowlist and security headers
functions/_shared/               Tested pure helpers and response utilities
functions/api/                   RSVP, ticket, door, checkin and guest lookup APIs
functions/hi/[token].js          Redirects personal links to /?token=
functions/ticket/[token].js      Server-rendered ticket shell
functions/staff/rose-door-10.js  Camera scanner for staff
sql/                             Schema, migrations and owner queries
test/                            node:test suites
docs/project-spec.md             Current product and technical spec
```

## Security Notes

- Ticket URLs are bearer tickets. Treat tokens like secrets and do not log them.
- The Supabase service role key is server-only.
- The staff scanner is private by obscure URL only. Put Cloudflare Access in front of it before
  wider sharing.
- Every response gets CSP, HSTS, no framing, no referrer and `noindex`.
- User input is validated on the server and escaped before it is rendered.

## What Is Still Open

See [`TASKS.md`](TASKS.md). The short version: test the whole flow on a real iPhone before
sending invitations, replace test guests with the real guest list, add the final intro video,
decide whether to enforce the 150-person cap in code, and decide whether to enforce the RSVP
deadline in code.
