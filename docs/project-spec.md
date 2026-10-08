# WHISPERS Invite Project Spec

## Snapshot

- Live URL: `https://whisperssociety.com/`
- Staff scanner: `https://whisperssociety.com/staff/rose-door-10`
- Ticket page: `/ticket/<token>`
- Stack: Cloudflare Pages, Pages Functions, Supabase Postgres via PostgREST
- Event: WHISPERS, Sofia, Saturday 10 October 2026, doors 22:00

This repository is the fully custom route from the original client brief. The Luma handoff,
custom-domain email delivery and final address blast are not complete yet.

## Product Flow

### Entry Links

| Link | Behaviour |
|---|---|
| `/` | Logo-only public calling card. |
| `/invite` | Public invitation. Visitor goes through the full RSVP flow without a token. |
| `/invite/<token>` | Personal invitation. `/api/guest-check` loads the invited name and any contact details from `guest_list`. |
| `/confirmation/<confirmation_token>` | Confirmation/status after RSVP. Can offer a safe update path before ticket release. |
| `/ticket/<token>` | Real ticket link. It stays locked until `2026-10-09T18:00:00+03:00`. |

`/invite/<token>` redirects to `/invite?token=<token>`. The front end calls `/api/guest-check`
when a token is present. `/confirmation/<confirmation_token>` renders the confirmation shell
directly.

### Screens

1. Seal: press and hold for 1.25 seconds, or use the escape button.
2. Film: typographic placeholder sequence until the final client video exists.
3. Letter: event details and restrained invitation copy.
4. Identify: shown for public links and for personal links missing email/phone.
5. RSVP: accept or decline.
6. Plus-one/reservation: optional one-person guest with full name and email, plus a
   table reservation request checkbox.
7. Done or decline: attending guests land on `/confirmation/<confirmation_token>`. The confirmation does
   not reveal QR, seal code, ticket URL or venue before ticket release.

### Confirmation Update

`/confirmation/<confirmation_token>` shows `Update details` only when the viewer is the primary guest, the
RSVP is attending, and ticket release has not happened. The update link
opens `/invite?confirmation=<confirmation_token>&update=1`, which skips primary name/email/phone and
lets the guest add one guest and/or request a table. After submit, the guest returns to the
confirmation page.

After `2026-10-09T18:00:00+03:00`, `Update details` is hidden and `/api/rsvp` rejects
guest-facing changes with `Guest-list changes are closed.` Existing checked-in protections remain
in place.

## RSVP Rules

- The server owns `event_key`, ticket tokens, seal codes and timestamps.
- Status is `attending` or `declined`.
- A guest may bring one plus-one. More than one added guest is rejected for the first event.
- Plus-one email is required. Plus-one phone is not collected in the current public flow.
- The same plus-one email cannot be used by another attending RSVP for this event.
- Declined rows do not keep plus-one data.
- Repeat RSVPs from the same `guest_id` keep the guest ticket token.
- If a repeat RSVP omits plus-one data, the existing plus-one is kept.
- If a repeat RSVP uses the same plus-one, the plus-one keeps their ticket.
- If a repeat RSVP tries to add a different plus-one after one is already registered, the request
  is rejected.
- A checked-in guest cannot change their RSVP.
- A checked-in plus-one cannot be replaced.
- RSVP submissions have no date-based deadline. Existing safety rules still prevent changes after
  ticket release or after a ticket has been used at the door.

## Tickets and QR Codes

The guest and plus-one each get:

- their own ticket token
- their own seal code
- their own `/ticket/<token>` page
- their own check-in state

QR codes encode the ticket URL, not the check-in API URL. Opening a QR with a normal phone camera
shows the ticket. Only `/staff/rose-door-10` checks people in by POSTing to `/api/door`.

`/api/checkin?token=` exists only as a legacy redirect to `/ticket/<token>`.

Tickets and location unlock at `2026-10-09T18:00:00+03:00`. Before that time, ticket pages show a
locked state without QR, seal code or venue.

Admin-created primary invites receive their future ticket link before RSVP. If that ticket link is
opened before the guest confirms attendance, the page shows a pending locked state and no QR code.

Table numbers are staff-only. `wants_table_reservation` means the guest asked for a table;
`reservation_confirmed` is the separate staff/admin confirmation. If `reservation_confirmed` is
true, the guest ticket can show generic copy such as `Your table is confirmed.`, but it must not
show table number or floor plan.

Seal codes are generated server-side in this format:

The format is `WSP`, middle dot, `10`, middle dot, then four generated characters. The alphabet
avoids ambiguous characters: no `0/O`, `1/I/L`, `5/S`, or `8/B`.

## API

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/api/guest-check?token=` | Finds a personal guest token and existing RSVP status. |
| `POST` | `/api/rsvp` | Validates RSVP, inserts or updates `rsvps`, returns a confirmation summary. |
| `GET` | `/api/confirmation?token=` | Returns confirmation/status payload and update eligibility. |
| `GET` | `/api/ticket?token=` | Finds either `ticket_token` or `plus_one_ticket_token`. |
| `GET` | `/api/checkin?token=` | Redirects to `/ticket/<token>`; does not mutate data. |
| `GET` | `/api/door` | Returns recent guest and plus-one check-ins as separate entries. |
| `POST` | `/api/door` | Atomically checks in the scanned guest or plus-one ticket. |
| `GET` | `/api/staff/invites` | Lists primary invite registry rows with confirmation and ticket links. |
| `POST` | `/api/staff/invites` | Creates a primary invite with random confirmation and ticket tokens. |
| `POST` | `/api/staff/invite-send` | Records that a confirmation invite was sent or sent again. |

All JSON responses are `Cache-Control: no-store`.

## Database

### `guest_list`

| Column | Type | Notes |
|---|---|---|
| `id` | text primary key | Personal invitation id. |
| `name` | text | Guest name shown on personal links. |
| `email` | text | Optional owner/import data. |
| `phone` | text | Optional owner/import phone data. |
| `ticket_token` | text | Pre-generated primary ticket token for admin-created invites. |
| `confirmation_email_sent_at` | timestamptz | Last time staff pressed Send/Send again for the confirmation invite. |
| `confirmation_email_send_count` | integer | Number of recorded confirmation invite sends. |
| `created_at` | timestamptz | Created timestamp. |
| `updated_at` | timestamptz | Updated timestamp. |

New admin-created invites use random alphanumeric `id` values for confirmation links and random
`ticket_token` values for future ticket links. A ticket token in `guest_list` does not check a
guest in and does not show a QR until a matching attending RSVP exists.

Admin-created invites require only a full name. Email and phone may be prefilled by staff, but
they are optional; when missing, the guest enters them during the personal RSVP flow.

The Invite admin view lists every invited primary guest. Members lists only RSVP rows. Invite
statuses are shown as `Not responded`, `Attending` or `Declined`.
Invite / Confirmation / Ticket columns each have their own copy/send action. Invite sends
`/invite/<id>`, confirmation sends `/confirmation/<confirmation_token>`, and ticket sends
`/ticket/<ticket_token>`. Automatic emails use the SuperHosting SMTP mailbox
`noreply@whisperssociety.com`,
`Reply-To: guestlist@whisperssociety.com` and include `guestlist@whisperssociety.com` plus
`+359 888 012 380` as the guest contact details.

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
| `wants_table_reservation` | boolean | Reservation requested by the RSVP group. |
| `reservation_confirmed` | boolean | Staff-confirmed table reservation; separate from table assignment. |
| `ticket_email_sent_at` | timestamptz | Future idempotency field for ticket email delivery. |
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

### `rsvp_companions`

Stores the current added guest ticket data. For the first event, application logic enforces at
most one companion row per RSVP.

### `staff_tables` and `staff_table_assignments`

Stores internal table definitions and RSVP group table assignment. Assignments are visible to
staff/admin. Guest tickets must not reveal the table label.

## Routes and Asset Access

The middleware allowlist permits only:

- `/`
- `/invite`
- listed `/api/*` routes
- `/ticket/<token>`
- `/confirmation/<token>`
- `/invite/<token>`
- `/staff/rose-door-10`
- `/assets/<lowercase-name>.png`
- `/assets/<lowercase-name>.js`

Everything else returns a no-store 404, including `sql/`, `test/`, docs, package files and
unlisted API paths.

## Security and Privacy

- Supabase service role key stays server-side only.
- Ticket tokens are bearer secrets.
- The staff route is private by obscure URL only for now. Staff username/password + email code
  authentication is planned but intentionally not enabled until domain/email are ready.
- User data rendered into HTML is escaped.
- The CSP allows scripts only from this site and jsDelivr, fonts/media from local assets, API
  calls to self, no frames and no plugins.
- Plus-one name and email are third-party personal data; collect only what is needed for this
  event and delete/export according to the client's retention decision.

## Current Open Work

- Final intro video from the client.
- Real iPhone/Safari and Android/Samsung Chrome end-to-end test before sending invitations.
- Replace test guests with the real list.
- Decide and implement 150-person cap enforcement, or document that it stays manual.
- Wire the 09.10 ticket-release email blast.
- Add final inbox tests for Gmail, Outlook and iCloud before sending the guest list.
