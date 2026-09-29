# Confirmation Update Flow Design

Date: 2026-09-29

## Goal

Keep the guest-facing flow simple while allowing one safe post-RSVP edit path:

- `/` remains the public full RSVP journey.
- `/invite/<token>` remains the personal RSVP journey.
- `/hi/<confirmation_token>` remains the confirmation/status page.
- `/ticket/<ticket_token>` remains hidden/locked until ticket release and becomes the real ticket after `2026-10-09T18:00:00+03:00`.

The new behaviour is that the confirmation page may offer `Update details`, but only when it is safe and useful.

## Link Behaviour

### Public Link

`https://whisperssociety.com/`

The public link always starts the full RSVP flow:

1. name
2. email
3. phone
4. RSVP
5. optional added guest
6. optional table request
7. confirmation/status

### Invite Link

`/invite/<invite_token>`

The invite link opens the RSVP journey with the invited name already known.

If the invite record has no email or phone, the guest is asked to enter those details before continuing. If the invite has already been answered, the guest should not be thrown into a confusing blank form; they should be directed toward their confirmation/status state.

### Confirmation Link

`/hi/<confirmation_token>`

This page shows confirmed status:

- guest name
- `Registered guest`
- `10.10 · 22:00`
- `Ticket`
- sealed location copy
- ticket release copy
- table request context if applicable

It may show `Update details` only when all of the following are true:

- the viewer is the primary guest, not the added guest;
- the RSVP is attending;
- no added guest is already registered;
- ticket release has not happened yet.

`Update details` reopens the RSVP flow in update mode. The guest does not enter their own name, email or phone again. They can add one guest and/or request a table, then return to the confirmation/status page.

### Ticket Link

`/ticket/<ticket_token>`

This is the real ticket link. It is not part of the guest's visible journey before ticket release. It may exist internally and in admin, but guest emails should not expose it until `2026-10-09T18:00:00+03:00`.

Before ticket release, the ticket route stays locked. After release, ticket emails are sent and the route shows QR, code, venue and guest details.

## Server Rules

- `/api/confirmation` returns whether `Update details` is allowed and the update URL when applicable.
- The update URL should use the confirmation token, not expose internal database ids.
- `/api/rsvp` must still enforce the real server-side rules. UI hiding is not enough.
- After ticket release, no new added guest can be created and no guest-facing update flow can change RSVP details.
- Existing checked-in protection remains in place.

## Email Review

Emails should stay consistent with the simplified flow:

- Invite email sends `/invite/<token>` and uses a clear `Respond` action.
- RSVP confirmation email sends `/hi/<confirmation_token>` and should feel like a polished WHISPERS confirmation, not a plain system email.
- Ticket email sends `/ticket/<ticket_token>` only for ticket release / explicit admin resend when appropriate.

All emails should keep:

- `From: WHISPERS <noreply@whisperssociety.com>`
- `Reply-To: guestlist@whisperssociety.com`
- contact phone `+359 888 012 380`
- WHISPERS visual identity in the HTML body.

## Tests And Verification

Automated coverage:

- confirmation API exposes `canUpdate` and `updateUrl` only for eligible primary guests;
- confirmation API hides update for guests with an added guest;
- confirmation API hides update after ticket release;
- confirmation page renders `Update details` only when the API allows it;
- public `index.html` supports confirmation update mode and jumps from `Respond` to the plus/table step;
- RSVP endpoint rejects updates after ticket release;
- email tests verify invite, confirmation and ticket copy/link targets.

Manual QA:

1. Open `/` and complete a full registration.
2. Open `/hi/<confirmation_token>` and confirm the locked status copy.
3. With no added guest, press `Update details`.
4. Confirm the flow does not ask for primary name/email/phone again.
5. Add a guest and request a table.
6. Confirm the flow returns to `/hi/<confirmation_token>`.
7. Reopen confirmation and verify `Update details` is gone.
8. Locally preview after release and verify `Update details` is gone.
