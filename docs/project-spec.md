# WHISPERS Invite Project Spec

## Snapshot

- Live URL: `https://whispers-invite.pages.dev/`
- Staff scanner: `https://whispers-invite.pages.dev/staff/rose-door-10`
- Ticket page: `/ticket/<token>`
- Stack: Cloudflare Pages, Pages Functions, Supabase Postgres via PostgREST
- Event: WHISPERS, Hotel Juno, Sofia, Saturday 10 October 2026, doors 22:00

This repository is the fully custom route from the original client brief. The Luma handoff,
confirmation emails, admin dashboard and address blast from the original brief are not part of
the current implementation.

## Product Flow

### Entry Links

| Link | Behaviour |
|---|---|
| `/` | Shared invitation. Visitor enters their full name. |
| `/hi/<id>` | Personal invitation. `/api/guest-check` loads the guest name from `guest_list`. |

`/hi/<token>` redirects to `/?token=<token>`. The front end calls `/api/guest-check` when a token
is present.

### Screens

1. Seal: press and hold for 1.25 seconds, or use the escape button.
2. Film: typographic placeholder sequence until the final client video exists.
3. Letter: event details and restrained invitation copy.
4. Identify: shown for shared links; personal links skip this once the guest is found.
5. RSVP: accept or decline.
6. Plus-one: optional one-person guest, with name and email.
7. Done or decline: ticket cards for attending guests, quiet declined state otherwise.

## RSVP Rules

- The server owns `event_key`, ticket tokens, seal codes and timestamps.
- Status is `attending` or `declined`.
- A guest may bring one plus-one.
- Plus-one email is normalized to lowercase.
- The same plus-one email cannot be used by another attending RSVP for this event.
- Declined rows do not keep plus-one data.
- Repeat RSVPs from the same `guest_id` keep the guest ticket token.
- If a repeat RSVP omits plus-one data, the existing plus-one is kept.
- If a repeat RSVP uses the same plus-one name and email, the plus-one keeps their ticket.
- If a repeat RSVP uses a different plus-one, a new plus-one ticket is issued and the old one
  stops working.
- A checked-in guest cannot change their RSVP.
- A checked-in plus-one cannot be replaced.

Current known gap: the frontend requires a full guest name with 2+ words, but the shared server
validation currently accepts a one-word `guestName`. This is tracked in `TASKS.md`.

## Tickets and QR Codes

The guest and plus-one each get:

- their own ticket token
- their own seal code
- their own `/ticket/<token>` page
- their own check-in state

QR codes encode the ticket URL, not the check-in API URL. Opening a QR with a normal phone camera
shows the ticket. Only `/staff/rose-door-10` checks people in by POSTing to `/api/door`.

`/api/checkin?token=` exists only as a legacy redirect to `/ticket/<token>`.

Seal codes are generated server-side in this format:

The format is `WSP`, middle dot, `10`, middle dot, then four generated characters. The alphabet
avoids ambiguous characters: no `0/O`, `1/I/L`, `5/S`, or `8/B`.

## API

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/guest-check?token=` | Finds a personal guest token. |
| `POST` | `/api/rsvp` | Validates RSVP, inserts or updates `rsvps`, returns ticket data. |
| `GET` | `/api/ticket?token=` | Finds either `ticket_token` or `plus_one_ticket_token`. |
| `GET` | `/api/checkin?token=` | Redirects to `/ticket/<token>`; does not mutate data. |
| `GET` | `/api/door` | Returns recent guest and plus-one check-ins as separate entries. |
| `POST` | `/api/door` | Atomically checks in the scanned guest or plus-one ticket. |

All JSON responses are `Cache-Control: no-store`.

## Database

### `guest_list`

| Column | Type | Notes |
|---|---|---|
| `id` | text primary key | Personal invitation id. |
| `name` | text | Guest name shown on personal links. |
| `email` | text | Optional owner/import data. |
| `created_at` | timestamptz | Created timestamp. |

### `rsvps`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity primary key | Supabase row id. |
| `event_key` | text | `whispers-2026-10-10`. |
| `guest_id` | text | Personal id or guest ticket token for shared links. |
| `guest_name` | text | Guest-facing name. |
| `status` | text | `attending` or `declined`. |
| `plus_one_name` | text | Nullable. |
| `plus_one_email` | text | Nullable, normalized. |
| `seal_code` | text | Guest seal code. |
| `ticket_token` | text | Guest ticket token. |
| `checked_in_at` | timestamptz | Guest check-in time. |
| `plus_one_ticket_token` | text | Plus-one ticket token. |
| `plus_one_seal_code` | text | Plus-one seal code. |
| `plus_one_checked_in_at` | timestamptz | Plus-one check-in time. |
| `submitted_at` | timestamptz | Last RSVP submit time. |

Important uniqueness:

- `(event_key, guest_id)`
- `ticket_token`
- `plus_one_ticket_token`
- `(event_key, lower(plus_one_email)) where plus_one_email is not null`
- `(event_key, seal_code) where seal_code is not null`
- `(event_key, plus_one_seal_code) where plus_one_seal_code is not null`

### `event_details`

Used to reveal the venue on tickets after `reveal_at`.

## Routes and Asset Access

The middleware allowlist permits only:

- `/`
- `/index.html`
- listed `/api/*` routes
- `/ticket/<token>`
- `/hi/<token>`
- `/staff/rose-door-10`
- `/assets/<lowercase-name>.png`
- `/assets/<lowercase-name>.js`

Everything else returns a no-store 404, including `sql/`, `test/`, docs, package files and
unlisted API paths.

## Security and Privacy

- Supabase service role key stays server-side only.
- Ticket tokens are bearer secrets.
- The staff route is private by obscure URL only; Cloudflare Access is recommended before wider
  staff sharing.
- User data rendered into HTML is escaped.
- The CSP allows scripts only from this site and jsDelivr, fonts from Google Fonts, API calls to
  self, no frames and no plugins.
- Plus-one name and email are third-party personal data; collect only what is needed for this
  event and delete/export according to the client's retention decision.

## Current Open Work

- Final intro video from the client.
- Real iPhone end-to-end test before sending invitations.
- Replace test guests with the real list.
- Decide and implement 150-person cap enforcement, or document that it stays manual.
- Decide and implement RSVP deadline enforcement, or document that it stays manual.
- Align server-side full-name validation with the frontend and docs.
