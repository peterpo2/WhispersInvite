# WHISPERS - Final Texts

Date: 2026-09-29

## Main

## Public Invitation Page

Path: `/`

### Browser Title

- Whispers

### Seal Screen

Main text:

- Press and hold to break the seal
- Private invitation · Saturday 10 October

Actions:

- Enter ›

Dynamic text:

- Hold…

Personal invitation text:

- This invitation belongs to:
- [guest name]

### Film Screen

Sequence:

- I
- A match finds a wick.
- II
- Secateurs close on a rose stem.
- III
- Wax pours. The seal goes in.
- IV
- A coupe fills, from below.
- V
- A hand draws the curtain closed.

Event cue:

- 10 . 10 · 22:00

Actions:

- Skip ›

### Letter / Event Details Screen

Brand:

- WHISPERS

Details:

- When
- Saturday 10 October · Doors open at 22:00
- until 3 am

- Where
- A private address in central Sofia
- Released on 09.10 at 18:00

- Who
- You, and one guest of your choosing

- Sound
- Sammer · Lucia Kosta · Atia

- Rules
- No photos in the room

- Access
- This invitation grants free access. Drinks are charged separately. Tables upon request.

- Dress code
- Elegant

Action:

- Respond

### Identify / Guest Details Screen

Brand:

- WHISPERS

Default helper:

- Your name goes on the door.
- Your ticket is issued in this name and reaches you by email on 09.10 at 18:00.

Personal invite title and helper:

- Confirm your details.
- Your name is already on the list. Please leave your email and phone so we can send you your ticket.

Fields:

- Full name
- First and last name
- Email
- name@example.com
- Phone
- +359 ...

Actions:

- Continue
- Back

Validation:

- Please give your full name.
- Please give a valid email.
- Please give your phone.

### RSVP Screen

Main text:

- Will you be there?
- Saturday 10 October · Doors open at 22:00

Actions:

- I'll be there
- Not this time

Dynamic state:

- Sealing…

### Add Guest / Reservation Screen

Brand:

- WHISPERS

Main text:

- One person. Choose well.
- Their name goes on the door beside yours.

Plus-one option:

- I've chosen.
- You can confirm or update this before ticket release.

Plus-one fields:

- Full name
- First and last name
- Email
- name@example.com

Privacy note:

- We use their details only for this invitation, event communication and door-list access.

Table reservation option:

- Would you like us to reserve a table for you?
- Our team will contact you with the reservation details.

Actions:

- Confirm my place
- Confirm both places
- Back

Validation and errors:

- Please give their full name.
- Please give their email.
- Please give a valid email.
- We could not save your RSVP. Please try again.
- The invitation could not reach us. Please try again.
- We could not update your RSVP. Please try again.

Dynamic state:

- Sealing…

Cancel confirmation:

- This releases your place. You can register again until 09.10 at 18:00.

### Registration Confirmed Screen

Brand:

- WHISPERS

Ticket card text:

- [guest name]
- Invited guest
- 10.10 · 22:00
- Saturday 10 October · Doors 22:00
- Coming on your own

Registration note:

- On 09.10 at 18:00, you will receive an email with the confirmed location and your private ticket.
- On 09.10 at 18:00, you and your registered guest will each receive an email with the confirmed location and your private ticket.

Dynamic relationship/status:

- Registered for one
- Registered with [guest name]
- Table reservation requested.

Actions:

- Save your ticket
- I can no longer come

Save ticket messages:

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.
- Both tickets are saved to this device.

### Declined RSVP Screen

Brand:

- WHISPERS

Main text:

- Understood.
- Your place on the list stays where it is.
- You'll hear from us before the next one.

Action:

- Register again

## Invite Link

Path: `/invite/[token]`

Use:

- Starts or edits the RSVP journey.
- If the guest has already RSVP'd, it can lead them toward their confirmation/status page.

## Confirmation / Status Page

Path: `/confirmation/[confirmation_token]`

### Browser Title

- WHISPERS Confirmation

### Main State

Brand:

- WHISPERS

Main text:

- [guest name]
- Invited guest
- Guest of [main guest name]
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

Optional status lines:

- Registered with [plus one name].
- Table reservation requested.
- Your table is confirmed.

Optional action:

- Update details

### Error State

- Confirmation not found
- Please check your private link.
- This confirmation link could not be loaded.

## Ticket Page

Path: `/ticket/[ticket_token]`

### Browser Title

- Your WHISPERS Ticket

### Loading State

- WHISPERS
- …
- Private guest
- [seal code]
- Saturday 10 October · Doors 22:00

### Pending RSVP Ticket

Role:

- Invited guest

Main text:

- Not yet answered
- Your ticket appears here once you've responded and tickets are released on 09.10 at 18:00.
- Use your invitation link to respond and reserve your spot.
- Waiting for RSVP

Action:

- Respond

### Locked Registered Ticket

Role:

- Invited guest
- Guest of [main guest name]

Main text:

- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

### Released Ticket

Role:

- Invited guest
- Guest of [main guest name]

Dynamic relationship:

- Bringing [guest name]
- Coming on your own

Location:

- [venue name] · [venue address]

Table status:

- Your table is confirmed.

Door helper:

- Show this seal at the door. The QR code confirms your place in the WHISPERS list.

Door state:

- Ready for the door
- Already checked in

Save messages:

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.

### Ticket Error States

Load failure:

- We could not load your seal.
- Your ticket could not be loaded. Please refresh to try again.
- Refresh to try again.

Invalid ticket:

- Ticket not found
- This ticket link is invalid.
- Invalid seal

## Staff Door Page

Path: `/staff/rose-door-10`

### Browser Title

- WHISPERS Door

### Header

Brand:

- WHISPERS
- Door

Action:

- Refresh

Tabs:

- Scanner
- Members
- Tables
- Invite

### Scanner Tab

Actions:

- Open camera
- Switch
- Stop
- Check

Manual check:

- Paste QR value or token
- Check

Initial result:

- Ready.
- Scan a guest ticket.

Checking state:

- Checking…
- Reading the seal.

Success:

- Confirmed.

Already checked in:

- Already inside.
- First checked in at [time].

Invalid:

- Invalid.
- This ticket could not be confirmed.

Relationship text:

- Guest of [main guest name]
- Bringing [guest name]

Recent scans:

- Scanned tonight
- No scans yet.

### Members Tab

Search / export:

- Search members
- Export CSV

Table columns:

- Name
- Type
- Guest of
- Email
- Phone
- Table
- Request
- Confirmed
- Table
- Door
- In
- Scanned
- Registered

Inline labels:

- fallback

Loading / empty / error states:

- No members.

Confirmation prompts:

- Mark this guest as inside?
- Mark this guest as not inside?
- Confirm this table reservation?
- Remove table reservation confirmation?

CSV columns:

- Name
- Type
- Guest of
- Email
- Phone
- Reservation requested
- Reservation confirmed
- Table
- Checked in
- Scanned at
- Registered at

### Tables Tab

Default table group:

- Unassigned
- Attending groups waiting for a table
- Assigned reservation groups

Capacity / count:

- [used] / [capacity] seats
- [number] waiting

Assignment controls and labels:

- Add to [table label]
- Search all guests
- Add
- Remove
- Confirmed
- requested table
- confirmed
- Unassigned

Empty states:

- No groups here.
- No matching reservation groups.
- No other reservation groups.

Loading / error states:

- Loading...
- No connection.
- Could not load tables

### Invite Tab

Create invite form:

- Full name
- Email optional
- Phone optional
- Create Invite

State messages:

- Creating invite...
- Invite created.
- No connection.
- Could not create invite

Search / reload:

- Search invites
- Reload

Table columns:

- Name
- Email
- Phone
- Status
- Invite
- Confirmation
- Created

Status labels:

- Attending
- Declined
- Not responded

Link actions:

- Copy
- Send
- Sending
- Copied
- Copy link

Loading / empty / error states:

- Loading...
- Could not load invites
- No invites.
- Could not send [type]

## Ticket Image / Saved Pass

Used by the public RSVP completion flow and the ticket page when generating PNG ticket images.

Brand:

- WHISPERS

Default file title:

- WHISPERS ticket

Default note:

- Show this at the door.

Image details:

- [guest name]
- [role]
- [seal code]
- Saturday 10 October · Doors 22:00
- [venue]
- Bringing [guest name]
- Your table is confirmed.

Share sheet title:

- WHISPERS

## Invite Email

Sent from `noreply@whisperssociety.com`, with replies going to `guestlist@whisperssociety.com`.

Subject:

- Your WHISPERS invitation

Plain text:

```text
WHISPERS

[guest name],

Your invitation is waiting.
Open it below:

[invite link]

For questions:
guestlist@whisperssociety.com
+359 888 012 380
```

HTML email visible text:

- WHISPERS
- [guest name]
- Your invitation is waiting.
- Open it below.
- Respond
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

## RSVP Confirmation Email

Subject:

- WHISPERS RSVP confirmed

Primary guest text:

- WHISPERS
- [guest name]
- Your registration is confirmed.
- Registered with [plus one name].
- Registered for one.
- Table reservation requested.
- Your private ticket and the confirmed location will be released on 09.10 at 18:00.
- You can confirm or update this before ticket release.
- Action: Update details
- Plain-text fallback: [confirmation link]
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

Companion text:

- WHISPERS
- [plus one name]
- You are registered as [main guest name]'s guest.
- Your private ticket and the confirmed location will be released on 09.10 at 18:00.
- Your confirmation is saved here:
- Action: Open confirmation
- Plain-text fallback: [confirmation link]
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

## Ticket Release Email

Subject:

- Your WHISPERS Ticket

Primary guest text:

- WHISPERS
- [guest name]
- Your private ticket is ready.
- Bringing [plus one name].
- Coming on your own.
- Saturday 10 October · Doors 22:00
- The address is now revealed:
- Junó Hotel Sofia
- Sofia Center, ul. "Ivan Denkoglu" 40
- Show this ticket at the door.
- Open ticket:
- [ticket link]
- Open Ticket
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

Plus-one text:

- WHISPERS
- [plus one name]
- Your private ticket is ready.
- Guest of [main guest name].
- Saturday 10 October · Doors 22:00
- The address is now revealed:
- Junó Hotel Sofia
- Sofia Center, ul. "Ivan Denkoglu" 40
- Show this ticket at the door.
- Open ticket:
- [ticket link]
- Open Ticket
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

## Notes

- Public-facing guest text is English.
- `/invite/[token]` is the RSVP entry link.
- `/confirmation/[confirmation_token]` is the confirmation/status page.
- `/ticket/[ticket_token]` is the ticket page.
- Location remains hidden until the release time unless `event_details` exposes a venue.
