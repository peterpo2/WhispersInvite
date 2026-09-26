# Deferred Ticket Release Design

## Summary

WHISPERS registration should collect contact details and intent now, but keep the actual tickets
and venue locked until 9 October 2026 at 18:00 Europe/Sofia time.

The first registration confirmation should feel like the current pass screen, but it must not
show a QR code, ticket URL, seal code or venue. Instead, it confirms the registration and tells
the guest in English that the location confirmation and ticket will arrive by email on 09.10.
If the guest registered additional people, the message also says each registered guest will
receive their own ticket.

After unlock, each person opens their own private ticket link from email. The link plays the
cinematic WHISPERS sequence again with the holder's name, skips all RSVP/input questions, and ends
on the actual ticket with QR code, seal code and location.

## Goals

- Collect name, email and phone for every primary guest.
- Collect name and phone for every additional registered person, with optional email.
- Add a table reservation checkbox on the plus-one step.
- Store the reservation request on the RSVP row.
- Keep tickets and location unavailable until 2026-10-09 18:00 Europe/Sofia.
- Keep a separate ticket token/link for every person: primary guest and each added guest.
- Show no QR code, no seal code and no venue on the immediate post-registration screen.
- Make the 09.10 ticket email flow possible once a domain and sender are available.
- Treat iPhone/Safari as the primary experience target; every public flow must be polished there.

## Non-Goals

- Do not build a custom domain setup in this pass.
- Do not choose or integrate the final email provider until sender/domain details exist.
- Do not expose a public guest directory or admin dashboard.
- Do not include referral invitation flows for now.
- Do not change the staff scanner concept. Door staff still scan ticket QR codes.

## Current Behaviour To Replace

The current attending RSVP response returns `ticketUrl`, `sealCode`, `plusOneTicketUrl` and
`plusOneSealCode`. `index.html` immediately renders a ticket-like card with seal code and QR,
and offers **Private ticket** image saving.

That immediate ticket reveal should stop. The server may still create ticket tokens and seal
codes at RSVP time, but the public UI should not reveal them until the unlock time.

## Registration Flow Before Unlock

1. Guest opens `/` or a personal `/hi/<id>` link.
2. The existing sequence remains: seal, film, letter.
3. If the visitor is not already identified by a personal link, they enter their full name.
4. The registration must collect primary guest contact fields:
   - full name
   - email
   - phone
5. The guest answers whether they will attend.
6. If attending, the existing plus-one step becomes an "add guest" step, with these changes:
   - Optional added-person fields are name, optional email and phone.
   - A checkbox asks whether the guest wants a reserved table:
     `Бихте ли искали да ви запазим маса за събитието?`
   - If selected, helper copy appears below:
     `Ще се свържем с вас, за да дадем повече данни за резервацията.`
   - The reservation checkbox applies to the RSVP group:
     - solo registration means a table request for 1
     - guest plus one added person means a table request for 2
     - guest plus multiple added people means a table request for the group size
7. On confirm, the server saves the RSVP and still creates ticket tokens internally.
8. The done screen shows a confirmation card without QR and without seal code.

## Repeat Registration And Adding More People

The same original invitation link may be opened more than once.

If the primary guest enters the same email and phone again, the system should recognize the
existing RSVP even if the name is typed differently, misspelled, written in Cyrillic instead of
Latin, or has different spacing/capitalization.

Matching rules:

- Normalize email by trim/lowercase.
- Normalize phone by trimming and collapsing spaces. A later implementation may also strip
  punctuation, but the spec only requires stable exact normalized comparison.
- Prefer matching within the same personal invitation identity when present.
- If no invitation identity is available, match by `(event_key, guest_email, guest_phone)`.
- Name is not the identity key.

Repeat behaviour:

1. Guest originally registers only themselves.
2. They open the same link again.
3. They enter the same email and phone.
4. The system recognizes the existing RSVP.
5. The flow allows them to add another person.
6. The added person receives their own ticket token and future ticket link.

If the guest already added one person and opens the link again with the same primary email and
phone, they can add another person. This means the final data model must support multiple added
people per primary RSVP, not only one `plus_one_*` column set.

Duplicate companion handling:

- If the newly submitted added person matches an existing added person by email when email is
  present, do not create a duplicate. Return a confirmation showing that the person is already on
  the registration.
- If the newly submitted added person has no email, compare normalized name and phone within that
  RSVP group to avoid accidental duplicates.
- If the same primary guest changes their own display name on a repeat submit, update the display
  name but keep the same primary ticket token.

## Immediate Confirmation Screen

The confirmation screen should reuse the restrained visual language of the current pass card:

- WHISPERS mark
- primary guest name
- role line such as `Registered guest`
- event date and doors
- plus-one line when present
- table reservation line when requested

It must not show:

- QR code
- seal code
- ticket link
- **Private ticket** save button
- venue name
- venue address

Required English copy:

For a solo guest:

> Your registration is confirmed. On 09.10 at 18:00, you will receive an email with the confirmed
> location and your private ticket.

For a guest with one or more added guests:

> Your registration is confirmed. On 09.10 at 18:00, you and your registered guest(s) will each
> receive an email with the confirmed location and your private ticket.

The exact typography can follow the current `.small`, `.meta`, `.pass`, `.rl` and `.nm` styles.

## Ticket Unlock Flow

Tickets unlock at exactly:

```text
2026-10-09T18:00:00+03:00
```

Before that time:

- `/api/ticket?token=` should find the ticket but answer that it is locked.
- `/ticket/<token>` should not render QR, seal code or venue.
- The page should show a restrained locked message:

> Your ticket will be released on 09.10 at 18:00.

After that time:

- `/api/ticket?token=` returns the ticket payload with seal code and venue.
- `/ticket/<token>` becomes the cinematic ticket journey.
- The ticket page shows the ticket holder's name, seal code, QR and venue.

## Ticket Link Experience After Unlock

Each ticket link is person-specific:

- primary guest: `/ticket/<ticket_token>`
- added guest: their own `/ticket/<companion_ticket_token>`

After unlock, opening the link should not show the static ticket immediately. It should replay the
invitation atmosphere without asking for registration information:

1. Seal screen shows the ticket holder's name.
2. Film screen plays as usual.
3. Letter/details screen appears, now allowed to include the venue/location.
4. The flow skips:
   - name collection
   - email/phone collection
   - "I'll be there" RSVP choice
   - plus-one form
   - table reservation checkbox
5. The final screen shows the actual ticket:
   - ticket holder name
   - role (`Founding guest` or `Guest of <primary guest>`)
   - seal code
   - QR code encoding the ticket URL
   - venue/location
   - table assignment when the RSVP group has been assigned to a table
   - check-in state when relevant
   - download/save ticket action

QR behaviour:

- The QR code must encode the ticket page URL.
- Scanning the QR with a normal phone camera or QR application opens the ticket web page.
- Door check-in still happens only through the staff scanner/admin flow.

## Edge Cases

- **Same primary guest, name typed differently:** recognize by normalized email and phone, not by
  name.
- **Same primary guest, solo first, adds a guest later:** keep the primary RSVP/ticket and add one
  companion row.
- **Same primary guest, already has a companion, adds another later:** keep existing companion rows
  and insert another companion row.
- **Duplicate companion with email:** if the companion email already exists under the same RSVP,
  do not create a duplicate ticket.
- **Duplicate companion without email:** if normalized name and phone match an existing companion
  under the same RSVP, do not create a duplicate ticket.
- **Companion has no email:** store the primary guest email as the companion's effective email
  target and mark that it came from fallback; send that companion's ticket to the primary guest
  email.
- **Ticket opened before 09.10 18:00:** show locked state only, with no QR, no seal code and no
  venue.
- **Ticket opened after 09.10 18:00:** show cinematic journey and then ticket.
- **Normal QR scan:** opens the ticket URL in a browser.
- **Staff QR scan:** checks the ticket in through the staff scanner.
- **Assigned table:** released ticket shows the assigned table label.
- **Unassigned table:** released ticket omits table copy.
- **Mistaken staff scan:** staff can undo check-in from Members, allowing the QR to be scanned
  again.

## Data Model Changes

Add columns to `public.rsvps`:

```sql
guest_email text,
guest_phone text,
wants_table_reservation boolean not null default false,
ticket_email_sent_at timestamptz,
```

Add a companion table for every additional person registered under a primary RSVP:

```sql
create table if not exists rsvp_companions (
  id bigint generated by default as identity primary key,
  rsvp_id bigint not null references public.rsvps(id) on delete cascade,
  guest_name text not null,
  email text,
  email_is_fallback boolean not null default false,
  phone text not null,
  ticket_token text,
  seal_code text,
  checked_in_at timestamptz,
  ticket_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Rationale:

- `guest_email` is needed because the primary guest currently has no RSVP email field.
- `guest_phone` is required by the new registration flow.
- Companion `email` stores the effective ticket delivery email. If the guest leaves it blank,
  save the primary RSVP `guest_email` there and set `email_is_fallback = true`.
- `wants_table_reservation` belongs to the RSVP group, not an individual ticket.
- email sent timestamps allow idempotent future email sending.

The current `plus_one_*` fields become legacy compatibility fields once `rsvp_companions` exists.
New implementation should write added people to `rsvp_companions`.

## API Payload Changes

`POST /api/rsvp` should accept:

```json
{
  "guestName": "Peter Popov",
  "guestEmail": "peter@example.com",
  "guestPhone": "+359 88 123 4567",
  "guestId": "petarp",
  "status": "attending",
  "wantsTableReservation": true,
  "plusOne": {
    "name": "Simona Ivanova",
    "email": "simona@example.com",
    "phone": "+359 88 765 4321"
  }
}
```

For `declined`, plus-one and table reservation values are ignored and stored as null/false.
For an attending added person, `email` may be omitted or blank. In that case the added person
still gets their own ticket token, but the future ticket email is addressed to the primary guest
email.

Validation rules:

- guest name: string, 2+ words, max 120 chars
- guest email: required for attending, valid email, max 254 chars
- guest phone: required for attending, string, max 40 chars after trimming
- added person name: required when an added person is submitted, 2+ words, max 120 chars
- added person email: optional; when present, valid email, max 254 chars
- added person phone: required when an added person is submitted, string, max 40 chars after trimming
- wantsTableReservation: optional boolean; non-boolean values are invalid

Duplicate added-person email protection remains only when an added-person email is present.
Primary guest email is not globally unique because the same guest can re-submit from the same
personal invitation identity and because shared contact inboxes may exist.

## API Response Changes

`POST /api/rsvp` should stop returning ticket URLs and seal codes to the browser before unlock.
It can return a confirmation summary:

```json
{
  "ok": true,
  "status": "attending",
  "guestName": "Peter Popov",
  "addedGuestNames": ["Simona Ivanova"],
  "wantsTableReservation": true,
  "ticketReleaseAt": "2026-10-09T18:00:00+03:00"
}
```

The ticket tokens stay in the database for the future email delivery integration.

## Email Release Design

Email delivery will be a separate future integration once there is a domain and sender. The data
model should be ready for it now.

The future sender should:

1. Query attending RSVPs whose ticket email has not been sent.
2. Send the primary guest their personal `/ticket/<ticket_token>` link.
3. Send every companion their own `/ticket/<companion_ticket_token>` link.
   Companion `email` is the effective delivery target. When `email_is_fallback` is true, it will
   be the same address as the primary guest email.
4. Mark `ticket_email_sent_at` for the primary RSVP and each companion's
   `ticket_email_sent_at` separately.
5. Never expose service-role keys to the browser.

Recommended future endpoint shape:

```text
POST /api/send-ticket-emails
```

The endpoint should require a server-side secret and should not be reachable casually from the
public site. It can be triggered by Cloudflare Cron or manually from a protected operation.

## Testing Requirements

- Unit tests for payload validation, including emails, phones, full-name requirements and table
  reservation.
- Unit tests for row building and repeat RSVP updates preserving contact fields correctly.
- Unit tests for ticket release gating before and after 2026-10-09 18:00+03.
- Access tests if a new public API route is added.
- Manual `wrangler pages dev` test for the full registration flow.
- Manual ticket link test before and after unlock by injecting a fake clock in helper tests and
  checking UI states locally.

## Documentation Updates

Update after implementation:

- `README.md`
- `TASKS.md`
- `docs/project-spec.md`
- `AGENTS.md`
- `sql/useful-queries.sql`

The original brief remains a historical source for design tone, not the exact implementation.
