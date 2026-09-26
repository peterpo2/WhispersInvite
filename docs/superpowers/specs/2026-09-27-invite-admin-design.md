# Invite Admin Design

## Goal

Add an `Invite` section to `/staff/rose-door-10` where staff can create and manage primary guest invitations before guests RSVP.

## Decisions

- `guest_list` becomes the invite registry.
- Each primary invite has two pre-generated links:
  - confirmation link: `/hi/<invite-token>`
  - ticket link: `/ticket/<ticket-token>`
- Invite tokens and ticket tokens are long random alphanumeric values. Human-readable ids such as `michelleg` remain supported for older/demo rows, but newly created invites must not use predictable ids.
- The Invite page creates primary guests only. A `+1` ticket is generated later, when the primary guest completes RSVP and adds the person.
- Admin security is not enabled yet. The page stays behind the current obscure staff URL until domain/email/admin auth are ready.

## Data Model

Extend `guest_list`:

- `id text primary key`: confirmation token used by `/hi/<id>`.
- `name text not null`: primary guest name.
- `email text`: primary guest email.
- `phone text`: primary guest phone.
- `ticket_token text`: pre-generated future ticket token for `/ticket/<ticket-token>`.
- `created_at timestamptz`.
- `updated_at timestamptz`.

Add a unique partial index on `guest_list(ticket_token)` where `ticket_token is not null`.

## Admin UI

Add a fourth tab: `Invite`.

The page includes:

- search across name, email, phone, RSVP status and both links
- create form with full name, email and phone
- generated confirmation link
- generated ticket link
- RSVP status summary from `rsvps`
- created timestamp
- copy buttons for both links

## API

Add `/api/staff/invites`:

- `GET` returns invite rows from `guest_list` plus RSVP status joined by `guest_id`.
- `POST` validates `name`, `email` and `phone`, generates `id` and `ticket_token`, inserts the invite and returns the created row with absolute links.

The middleware allowlist must include `/api/staff/invites`.

## RSVP Integration

When `/api/rsvp` receives a known `guestId` from `guest_list`, a new RSVP uses that invite's pre-generated `ticket_token`.

Rules:

- Existing RSVP rows keep their already assigned ticket token.
- Legacy `guest_list` rows without `ticket_token` still work and receive a normal generated RSVP token.
- Free-form `/` RSVPs keep the current behavior.

## Ticket Integration

`/api/ticket?token=` first checks existing RSVP/companion ticket records.

If no RSVP ticket exists, it checks `guest_list.ticket_token`.

- Matching invite with no RSVP returns a pending locked ticket payload.
- Pending ticket pages do not show QR, seal code, venue or check-in controls.
- Door scanning still only accepts real attending RSVP/companion tickets; pending invite ticket links cannot check in.

## Tests

Add/extend tests for:

- invite token/link helper behavior
- RSVP row can reuse a pre-generated invite ticket token
- pending invite ticket payload
- access allowlist includes `/api/staff/invites`
- staff HTML includes the Invite tab, create form, search and link copy controls

## Deployment

Apply the database migration to Supabase, run the test suite, commit specific files, push to `main`, deploy Cloudflare Pages, and smoke-test the live staff page.
