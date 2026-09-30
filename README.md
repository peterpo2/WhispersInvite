# WHISPERS Invite

Private, mobile-first digital invitation for WHISPERS in Sofia on Saturday 10 October 2026,
doors 22:00. The experience is deliberately small: seal, short film, event details, guest
registration, deferred private ticket, staff scanner.

The site is static HTML on Cloudflare Pages, with Pages Functions for the API and Supabase
Postgres through the REST API. There is no framework, no bundler and no build step.

## Current State

- Live site: `https://whisperssociety.com/`
- Staff scanner: `https://whisperssociety.com/staff/rose-door-10`
- Next operational steps: [`TASKS.md`](TASKS.md)
- Owner SQL queries: [`sql/useful-queries.sql`](sql/useful-queries.sql)
- Developer/agent reference: [`AGENTS.md`](AGENTS.md)
- Product spec: [`docs/project-spec.md`](docs/project-spec.md)
- Original design brief: [`whispers-invitation-dev-brief.md`](whispers-invitation-dev-brief.md)

## Routes

| URL | Purpose |
|---|---|
| `/` | Logo-only public calling card. No RSVP controls. |
| `/invite` | Public invitation. The guest goes through the full RSVP flow without a token. |
| `/invite/<token>` | Personal invitation. The invited name is shown, and missing email/phone are collected before RSVP. |
| `/confirmation/<token>` | Confirmation/status page after RSVP. May offer `Update details` only before ticket release. |
| `/hi/<token>` | Legacy confirmation/status alias kept so old links continue to work. |
| `/ticket/<token>` | Real ticket page for a guest or plus-one. It stays locked until `09.10 18:00`. |
| `/staff/rose-door-10` | Staff scanner. Keep private and do not link from public pages. |

The middleware allowlist blocks repository files, docs, SQL files, tests and unknown routes.

## Guest Flow

1. Guest opens `/invite`, `/invite/<token>` or a post-RSVP `/confirmation/<token>`.
2. The page plays seal -> film -> letter.
3. The public link asks for full name, email and phone. A personal invite uses `guest_list`;
   if staff entered only a name, the guest confirms their own email and phone before RSVP.
4. The guest accepts or declines.
5. If accepting, they may add one plus-one with full name and email.
6. They may request a table reservation for themselves or their two-person group.
7. The server creates private ticket tokens and seal codes, but does not reveal them before
   `2026-10-09T18:00:00+03:00`.
8. The done screen redirects to `/confirmation/<confirmation_token>`, which shows confirmation/status, not a QR ticket.

The guest and the plus-one each get their own ticket token, seal code, QR code and check-in
state. QR codes encode `/ticket/<token>`, not `/api/checkin`. A normal phone camera opens the
ticket page; only the staff scanner checks people in. Before ticket release, ticket pages show a
locked state without QR, seal code or location.

Repeat RSVPs from the same personal identity or the same email+phone keep the guest ticket.
`Update details` remains available before ticket release, including when a guest already has an
added guest; the latest update replaces the previous added guest. After ticket release
(`2026-10-09T18:00:00+03:00`), guest-facing changes are closed.

## Invite Admin

The staff page has an **Invite** tab. Staff can create a primary guest invite with only a full
name. Email and phone are optional admin prefill fields; if they are missing, the guest fills them
in from their personal confirmation link. The system generates:

- invite link: `/invite/<guest_list.id>`
- confirmation link: `/confirmation/<confirmation_token>` after RSVP
- ticket link: `/ticket/<ticket_token>`

The ticket link may exist internally in advance, but guests do not need it before release. Plus-one
confirmation and ticket links are generated during RSVP.

Invite shows all invited primary guests, including people who have not answered yet. Members shows
only people with an RSVP response. Invite statuses are `Not responded`, `Attending` and `Declined`.
Invite / Confirmation / Ticket columns each have their own copy/send action. Invite email sends
`/invite/<token>`, RSVP confirmation email sends `/confirmation/<confirmation_token>`, and ticket release
email sends `/ticket/<ticket_token>`. Automatic emails are sent from `noreply@whisperssociety.com`, use
`guestlist@whisperssociety.com` as the reply-to address, and include the guest-list email plus
`+359 888 012 380` as contact details.

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
| `GET` | `/api/guest-check?token=` | Looks up personal invitation links and existing RSVP status. |
| `POST` | `/api/rsvp` | Validates RSVP, writes or updates the row, returns a confirmation summary. |
| `GET` | `/api/confirmation?token=` | Returns confirmation/status payload and safe update eligibility. |
| `GET` | `/api/ticket?token=` | Returns the public ticket payload for a guest or plus-one token. |
| `GET` | `/api/checkin?token=` | Legacy read-only link. Redirects to `/ticket/<token>`. |
| `GET` | `/api/door` | Returns recent checked-in guests and plus-ones. |
| `POST` | `/api/door` | Checks in a scanned guest or plus-one ticket atomically. |
| `GET` | `/api/staff/invites` | Lists primary invites and generated links. |
| `POST` | `/api/staff/invites` | Creates a primary invite. |
| `POST` | `/api/staff/invite-send` | Records confirmation invite send/send-again state. |

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
index.html                       Invitation app shell served by /invite
assets/                          Runtime images and ticket-card.js
functions/_middleware.js         Route allowlist, security headers and /invite/<token> redirect
functions/_shared/               Tested pure helpers and response utilities
functions/api/                   RSVP, ticket, door, checkin and guest lookup APIs
functions/index.js               Logo-only public calling card
functions/confirmation/[token].js New confirmation/status route
functions/hi/[token].js          Legacy confirmation/status alias
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

See [`TASKS.md`](TASKS.md). The short version: test the whole flow on real iPhone Safari and
modern Android Chrome, replace test guests with the real guest list, wire the 09.10 ticket-release
email blast, add the final intro video, and finalize the table model.
