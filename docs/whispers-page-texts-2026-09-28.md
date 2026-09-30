# WHISPERS Invite - Current Site Text Inventory

Date: 2026-09-29

This file lists the visible copy currently used in the WHISPERS site, staff pages and email templates. Dynamic values are shown in square brackets.

Note: this inventory reflects the current implementation only. It does not apply or merge copy changes from the organizer PDF.

## Global

### Partner Bar

- Powered by
- Barons de Rothschild
- Beluga

### Blocked Routes

- Not found.

### Robots

```text
User-agent: *
Disallow: /
```

## Public RSVP Flow

Path: `/`

### Browser Title

- Whispers

### Seal Screen

Main text:

- Press and hold to break the seal
- Private invitation · Saturday 10 October

Actions:

- Enter ›

Dynamic hold text:

- Hold…

Personal invite text:

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

### Event Details Screen

Brand:

- WHISPERS

Details:

- When
- Saturday 10 October · Doors open at 22:00
- until 03:00
- Where
- A private address in central Sofia
- Released on 09.10 at 18:00
- Who
- You, and one guest of your choosing
- Sound
- Sammer · Lucia · Atia
- Rules
- No photos in the room
- Access
- This invitation grants free access. Drinks are charged separately. Tables upon request.
- Dress code
- Elegant

Note:

Action:

- Respond

### Identify Screen

Default helper:

- Your name goes on the door.
- Your ticket is issued in this name and reaches you by email on 09.10 at 18:00.

Personal invite heading:

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

Heading:

- Will you be there?
- Saturday 10 October · Doors open at 22:00

Actions:

- I'll be there
- Not this time

State:

- Sealing…

### Plus One And Table Screen

Heading:

- One person. Choose well.
- Their name goes on the door beside yours.

Plus one option:

- I've chosen.
- You can confirm or update this before ticket release.

Plus one fields:

- Full name
- First and last name
- Email
- name@example.com

Privacy note:

- We use their details only for this invitation, event communication and door-list access.

Table option:

- Would you like us to reserve a table for you?
- Our team will contact you with the reservation details.

Actions:

- Confirm my place
- Confirm both places
- Back

Validation:

- Please give their full name.
- Please give their email.
- Please give a valid email.

Submit errors:

- We could not save your RSVP. Please try again.
- The invitation could not reach us. Please try again.
- We could not update your RSVP. Please try again.

Cancel confirmation:

- This releases your place. You can register again until 09.10 at 18:00.

### Local Confirmation Fallback Screen

This screen is only used if the RSVP response does not include a confirmation URL. In the normal flow, the guest is redirected to `/confirmation/[confirmation_token]`.

Brand and ticket release:

- WHISPERS
- [guest name]
- Invited guest
- 10.10 · 22:00
- Saturday 10 October · Doors 22:00

Registration state:

- Coming on your own
- Registered for one
- Registered with [plus one name]
- Table reservation requested.

Release note:

- On 09.10 at 18:00, you will receive an email with the confirmed location and your private ticket.
- On 09.10 at 18:00, you and your registered guest will each receive an email with the confirmed location and your private ticket.

Actions:

- Save your ticket
- I can no longer come

Save state:

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.
- Both tickets are saved to this device.

### Declined Screen

Brand:

- WHISPERS

Message:

- Understood.
- Your place on the list stays where it is.
- You'll hear from us before the next one.

Action:

- Register again

## Invite Link

Path: `/invite/[token]`

This route does not render its own page. It redirects to:

- `/invite?token=[token]` when the invite token is valid.
- `/` when the token is missing or invalid.

The rendered text after redirect is the public RSVP flow above.

## Confirmation Page

Path: `/confirmation/[confirmation_token]`

### Browser Title

- WHISPERS Confirmation

### Loading State

- WHISPERS
- ...
- Invited guest
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

### Registered Guest State

- WHISPERS
- [guest name]
- Invited guest
- Guest of [main guest name]
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

Optional lines:

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

### Initial Loading State

- WHISPERS
- …
- Private guest
- [seal code]
- Saturday 10 October · Doors 22:00

### Pending RSVP Ticket State

Shown when the ticket link belongs to an invite that has not RSVP'd yet.

- WHISPERS
- [guest name]
- Invited guest
- Not yet answered
- Your ticket appears here once you've responded and tickets are released on 09.10 at 18:00.
- Waiting for RSVP
- Saturday 10 October · Doors 22:00
- Use your invitation link to respond and reserve your spot.
- Respond

### Locked Registered Ticket State

Shown before ticket release.

- WHISPERS
- [guest name]
- Invited guest
- Guest of [main guest name]
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

### Released Ticket State

Shown after ticket release.

- WHISPERS
- [guest name]
- Invited guest
- Guest of [main guest name]
- [seal code]
- Ready for the door
- Already checked in
- Saturday 10 October · Doors 22:00
- [venue name] · [venue address]
- Coming on your own
- Bringing [plus one name]
- Your table is confirmed.
- Show this seal at the door. The QR code confirms your place in the WHISPERS list.
- Save your ticket

Save state:

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.

### Ticket Error State

- Ticket not found
- Private guest
- [seal code]
- This ticket link is invalid.
- Invalid seal
- Saturday 10 October · Doors 22:00

Load error:

- We could not load your seal.
- Your ticket could not be loaded. Please refresh to try again.
- Refresh to try again.

## Staff Door Page

Path: `/staff/rose-door-10`

### Browser Title

- WHISPERS Door

### Header

- WHISPERS
- Door
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

Input:

- Paste QR value or token

Initial result:

- Ready.
- Scan a guest ticket.

Scan state:

- Checking…
- Reading the seal.

Success:

- Confirmed.
- [guest name]
- Guest of [main guest name]
- [seal code]

Already checked in:

- Already inside.
- [guest name]
- Guest of [main guest name]
- First checked in at [time].
- [seal code]

Invalid:

- Invalid.
- This ticket could not be confirmed.

Recent list:

- Scanned tonight
- No scans yet.

Camera/system messages:

- Camera unavailable.
- Camera not found.
- Camera permission was blocked.
- Could not open camera.
- Scanner unavailable.

### Members Tab

Search and export:

- Search members
- Export CSV

Table headers:

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

Member type values:

- Guest
- Added guest

Inline badges and empty states:

- fallback
- No members.

Confirm prompts:

- Mark this guest as inside?
- Mark this guest as not inside?
- Confirm this table reservation?
- Remove table reservation confirmation?

CSV headers:

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

States:

- Loading...
- No connection.
- Could not load tables

Table list:

- Unassigned
- [number] waiting
- [used] / [capacity] seats

Detail headings:

- Assigned reservation groups
- Attending groups waiting for a table
- No groups here.
- Add to [table label]
- Search all guests
- No matching reservation groups.
- No other reservation groups.

Group badges and actions:

- requested table
- confirmed
- Confirmed
- Add
- Remove
- Unassigned

### Invite Tab

Form:

- Full name
- Email optional
- Phone optional
- Create Invite

State:

- Creating invite...
- Invite created.
- No connection.
- Could not create invite

Search and reload:

- Search invites
- Reload

Table headers:

- Name
- Email
- Phone
- Status
- Invite
- Confirmation
- Created

Status values:

- Attending
- Declined
- Not responded

Link actions:

- Copy
- Send
- Sending
- Copied

Empty and error states:

- Loading...
- No invites.
- Could not load invites
- Could not send [type]
- Copy link

## API Error Messages Shown To Users

RSVP and invite errors:

- Missing RSVP
- Invalid RSVP
- Please give your full name.
- Please give a valid email.
- Please give your phone.
- This invitation already has a registered guest.
- This invitation has already been used at the door.
- Could not save RSVP
- Could not send invite
- Could not send confirmation email
- Could not send ticket email

Confirmation API:

- Missing confirmation
- Confirmation not found
- Could not load confirmation

Ticket API:

- Missing ticket
- Ticket not found
- Could not load ticket

Door API:

- Missing ticket
- Ticket not found
- Already inside.
- Confirmed.
- Could not confirm ticket

## Email Templates

Default sender details:

- WHISPERS <noreply@whisperssociety.com>
- guestlist@whisperssociety.com
- +359 888 012 380

### Invite Email

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

HTML text:

- WHISPERS
- [guest name]
- Your invitation is waiting.
- Open it below.
- Respond
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

### RSVP Confirmation Email

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

### Ticket Release Email

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

## Generated Ticket Image

Used when saving/sharing a ticket image from the site.

Visible text:

- WHISPERS
- [guest name]
- [role]
- [seal code]
- Saturday 10 October · Doors 22:00
- Show this at the door.

## Notes

- `/invite/[token]` is the RSVP entry link and currently redirects into the public RSVP page.
- `/confirmation/[confirmation_token]` is the confirmation/status page.
- `/ticket/[ticket_token]` is the ticket page. It shows locked or pending states before release, and the QR ticket after release.
- The ticket link itself is created earlier, but the release email is sent separately when tickets are released.
