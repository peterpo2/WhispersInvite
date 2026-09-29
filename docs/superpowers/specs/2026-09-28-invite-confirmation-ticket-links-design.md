# Invite, Confirmation And Ticket Links Design

Date: 2026-09-28

## Goal

Separate the three guest-facing link types so each one has a clear purpose:

- `/invite/<token>` is the original invitation and RSVP journey.
- `/hi/<token>` is the post-registration confirmation page.
- `/ticket/<token>` is the real ticket page, locked until `2026-10-09T18:00:00+03:00`.

This removes the current ambiguity where `/hi/<token>` behaves like an invite link and `/ticket/<token>` doubles as confirmation before release.

## Link Semantics

### Invite Link

Path: `/invite/<invite_token>`

This is created by the staff Invite tab. It opens the cinematic invitation flow:

1. seal / intro
2. event details
3. guest contact confirmation
4. RSVP
5. added guest and table request
6. final confirmation screen

The final screen may keep `Start over`, because this route is the active invite journey.

The invite email sent from the admin must use this link.

### Confirmation Link

Path: `/hi/<confirmation_token>`

This is created only after a successful RSVP, whether the RSVP started from:

- `/invite/<invite_token>`
- the public `/` site

It does not restart the invite journey and does not show the RSVP form. It directly shows the confirmed/locked status:

- guest name
- `Registered guest`
- event date/time
- `Ticket`
- sealed location copy
- ticket release copy
- table-request context if needed, without staff-only details

The RSVP confirmation email must use this link.

### Ticket Link

Path: `/ticket/<ticket_token>`

This is also created after a successful RSVP.

Before `2026-10-09T18:00:00+03:00`, it shows the same locked confirmation state as `/hi/<confirmation_token>`.

At or after `2026-10-09T18:00:00+03:00`, it automatically unlocks into the real ticket:

- guest name
- role / relationship
- seal code
- QR code
- venue/location
- generic table confirmation if applicable
- checked-in state

QR codes must continue to encode `/ticket/<ticket_token>`.

## Database Model

Add separate confirmation tokens instead of reusing ticket tokens:

- `rsvps.confirmation_token`
- `rsvp_companions.confirmation_token`

Keep ticket tokens separate:

- `rsvps.ticket_token`
- `rsvp_companions.ticket_token`

Invite records keep their own invitation token:

- `guest_list.id` remains the invite token for staff-created invites.
- `guest_list.ticket_token` may remain a pre-generated future primary ticket token, but the public invite URL must be `/invite/<guest_list.id>`.

Confirmation tokens and ticket tokens are bearer links and must be treated as private.

## Admin Invite Tab

Add one more copyable column:

- `Invite`: `/invite/<invite_token>`
- `Confirmation`: `/hi/<confirmation_token>` when an RSVP exists, otherwise empty/pending
- `Ticket`: `/ticket/<ticket_token>` when available

The existing `Confirmation` column currently points to `/hi/<invite_id>`; that must become the new invite link or be replaced by the new `Invite` column.

## Email Flow

### Invite Email

Sent from staff Invite tab.

Link target:

- `/invite/<invite_token>`

Purpose:

- bring the guest into the RSVP journey.

### RSVP Confirmation Email

Sent automatically after successful RSVP from either `/invite/<token>` or `/`.

Link target:

- `/hi/<confirmation_token>`

Purpose:

- let the guest reopen their confirmed/locked status without restarting the invitation flow.

### Ticket Release Email

Sent on or after `09.10 18:00`.

Link target:

- `/ticket/<ticket_token>`

Purpose:

- open the real ticket with QR, code and location.

## Backwards Compatibility

Existing `/hi/<old_invite_id>` links should continue to work during the transition by redirecting to `/invite/<old_invite_id>` if the token belongs to `guest_list` and no RSVP confirmation token exists.

Existing `/ticket/<ticket_token>` links remain valid.

## Tests And Verification

Automated tests should cover:

- middleware allows `/invite/<token>`, `/hi/<token>`, and `/ticket/<token>`;
- staff invite API returns invite, confirmation and ticket links separately;
- invite email uses `/invite/<token>`;
- RSVP response and email use `/hi/<confirmation_token>`;
- `/hi/<confirmation_token>` does not show the RSVP form;
- `/ticket/<ticket_token>` shows locked confirmation before release;
- `/ticket/<ticket_token>` shows QR/code/location after release through existing release helpers.

Manual QA:

- create an invite in staff admin;
- copy and open invite link;
- complete RSVP;
- confirm email contains confirmation link;
- open confirmation link and verify no restart;
- open ticket link before release and verify locked confirmation;
- use release test path/helper locally to verify unlocked ticket.
