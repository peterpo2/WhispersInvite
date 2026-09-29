# WHISPERS - All Site Texts

Date: 2026-09-30

This is the clean, paste-ready text document for all current WHISPERS site pages, staff/admin screens, emails, generated ticket images and user-facing error states.

Dynamic values are written in square brackets, for example `[guest name]`.

---

## Global Text

### Brand

- WHISPERS

### Partner Bar

- Powered by
- Barons de Rothschild
- Beluga

### Public 404

- Not found.

---

## Public Invitation Flow

Path: `/`

Browser title:

- Whispers

### 1. Seal Screen

Default public invite:

- Press and hold to break the seal
- Private invitation · Saturday 10 October

Personal invite:

- This invitation belongs to:
- [guest name]

Hold state:

- Hold...

Action:

- Enter >

### 2. Film Screen

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

Final cue:

- 10 . 10 · 22:00

Action:

- Skip >

### 3. Event Details Screen

Brand:

- WHISPERS

Details:

- When
- Saturday 10 October
- Doors open at 22:00 until 03:00

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

Action:

- Respond

### 4. Identify / Contact Screen

This screen is shown when the guest must enter or confirm their details.

Default shared-link helper:

- Your name goes on the door.
- Your ticket is issued in this name and reaches you by email on 09.10 at 18:00.

Personal invite helper:

- Confirm your details.
- Your name is already on the list. Please leave your email and phone so we can send you your ticket.

Fields and placeholders:

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

### 5. RSVP Screen

Heading:

- Will you be there?
- Saturday 10 October · Doors open at 22:00

Actions:

- I'll be there
- Not this time

Submit state:

- Sealing...

### 6. Guest / Table Screen

Heading:

- One person. Choose well.
- Their name goes on the door beside yours.

Guest option:

- I've chosen.
- You can confirm or update this before ticket release.

Guest fields:

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

Submit and network errors:

- We could not save your RSVP. Please try again.
- The invitation could not reach us. Please try again.
- We could not update your RSVP. Please try again.

### 7. Immediate Confirmation Fallback

This screen is only used if the RSVP response does not redirect to `/hi/[confirmation_token]`.

Card copy:

- WHISPERS
- [guest name]
- Invited guest
- 10.10 · 22:00
- Saturday 10 October · Doors 22:00

Registration state:

- Registered for one
- Registered with [guest name]
- Table reservation requested.

Release note, one person:

- On 09.10 at 18:00, you will receive an email with the confirmed location and your private ticket.

Release note, with guest:

- On 09.10 at 18:00, you and your registered guest will each receive an email with the confirmed location and your private ticket.

Actions:

- Save your ticket
- I can no longer come

Cancel confirmation prompt:

- This releases your place. You can register again until 09.10 at 18:00.

Save states:

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.
- Both tickets are saved to this device.

### 8. Declined Screen

Brand:

- WHISPERS

Message:

- Understood.
- Your place on the list stays where it is.
- You'll hear from us before the next one.

Action:

- Register again

---

## Confirmation Page

Path: `/hi/[confirmation_token]`

Browser title:

- WHISPERS Confirmation

### Loading / Default State

- WHISPERS
- ...
- Invited guest
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

### Confirmed Primary Guest

- WHISPERS
- [guest name]
- Invited guest
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

Optional status lines:

- Registered with [guest name].
- Table reservation requested.
- Your table is confirmed.

Optional action:

- Update details

### Confirmed Added Guest

- WHISPERS
- [guest name]
- Guest of [main guest name]
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

Optional action:

- Update details

### Error State

- Confirmation not found
- Please check your private link.
- This confirmation link could not be loaded.

---

## Ticket Page

Path: `/ticket/[ticket_token]`

Browser title:

- WHISPERS Ticket

### Loading Shell

- WHISPERS
- ...
- Private guest
- -
- Saturday 10 October · Doors 22:00

### Pending RSVP Ticket

Shown when a ticket link exists but the invite has not been answered yet.

- WHISPERS
- [guest name]
- Invited guest
- Not yet answered
- Your ticket appears here once you've responded and tickets are released on 09.10 at 18:00.
- Use your invitation link to respond and reserve your spot.
- Waiting for RSVP

Action:

- Respond

### Locked Registered Ticket

Shown before ticket release for a guest who has already registered.

- WHISPERS
- [guest name]
- Invited guest
- Guest of [main guest name]
- 10.10 · 22:00
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

### Released Ticket

- WHISPERS
- [guest name]
- Invited guest
- Guest of [main guest name]
- [seal code]
- Saturday 10 October · Doors 22:00
- [venue name] · [venue address]
- Coming on your own
- Bringing [guest name]
- Your table is confirmed.
- Show this seal at the door. The QR code confirms your place in the WHISPERS list.
- Ready for the door
- Already checked in

Action:

- Save your ticket

Save states:

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.

### Ticket Error State

Invalid ticket:

- Ticket not found
- This ticket link is invalid.
- Invalid seal

Load failure:

- We could not load your seal.
- Your ticket could not be loaded. Please refresh to try again.
- Refresh to try again.

---

## Staff Door Page

Path: `/staff/rose-door-10`

Browser title:

- WHISPERS Door

### Header And Navigation

- WHISPERS
- Door
- Refresh

Tabs:

- Scanner
- Members
- Tables
- Invite

### Scanner Tab

Camera actions:

- Open camera
- Scan next
- Switch
- Stop

Manual input:

- Paste QR value or token
- Check

Helper:

- Camera scanning runs locally in this browser. A valid WHISPERS QR marks the ticket as checked in.

Initial state:

- Ready.
- Scan a guest ticket.

Scanning state:

- Scanning...
- Hold the QR inside the frame, 20-40 cm away. Tap the picture to refocus.

Checking state:

- Checking...
- Reading the seal.

Success:

- Confirmed.
- [guest name]
- Guest of [main guest name]
- Bringing [guest name] (own ticket)
- [seal code]

Already checked in:

- Already inside.
- [guest name]
- Guest of [main guest name]
- First checked in at [time].
- [seal code]

Invalid or connection states:

- Invalid.
- This ticket could not be confirmed.
- No connection.
- Try again.
- Camera blocked.
- Allow camera access or paste the QR value manually.

Recent scans:

- Scanned tonight
- No scanned tickets yet.
- Could not load the list. Try again.

### Members Tab

Search and export:

- Search members
- Export CSV

Column groups:

- Table
- Door

Columns:

- Name
- Type
- Guest of
- Email
- Phone
- Request
- Confirmed
- Table
- In
- Scanned
- Registered

Inline labels and empty states:

- fallback
- No members.
- Loading...
- No connection.
- Could not load members

Confirmation prompts:

- Mark this guest as inside?
- Remove this guest check-in?
- Mark table request for this group?
- Remove table request for this group?
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

Helper:

- All attending groups can be assigned to tables. Reservation requests are marked. Default model: five 6-seat tables and five 4-seat tables until the venue gives final data.

Loading and errors:

- Loading...
- No connection.
- Could not load tables

List and detail:

- Unassigned
- [number] waiting
- [used] / [capacity] seats
- Assigned reservation groups
- Attending groups waiting for a table
- No groups here.
- Add to [table label]
- Search all guests
- No matching reservation groups.
- No other reservation groups.

Group labels and actions:

- requested table
- confirmed
- Confirmed
- Add
- Remove
- Unassigned

### Invite Tab

Create form:

- Full name
- Email optional
- Phone optional
- Create Invite

Create states:

- Creating invite...
- Invite created.
- No connection.
- Could not create invite

Search and reload:

- Search invites
- Reload

Columns:

- Name
- Email
- Phone
- Status
- Invite
- Confirmation
- Ticket
- Created

Status values:

- Attending
- Declined
- Not responded

Link actions:

- Copy
- Copied
- Send
- Sending
- Copy link

Empty and error states:

- Loading...
- No invites.
- Could not load invites
- Could not send [type]

---

## Emails

Default sender/contact values:

- WHISPERS <noreply@whisperssociety.com>
- guestlist@whisperssociety.com
- +359 888 012 380

### Invite Email

Subject:

- Your WHISPERS invitation - [guest name]

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

HTML visible text:

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

Primary guest, registered alone:

- WHISPERS
- [guest name]
- Your registration is confirmed.
- Registered for one.
- Your private ticket and the confirmed location will be released on 09.10 at 18:00.
- You can confirm or update this before ticket release.
- Update details
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

Primary guest, registered with guest:

- WHISPERS
- [guest name]
- Your registration is confirmed.
- Registered with [guest name].
- Table reservation requested.
- Your private ticket and the confirmed location will be released on 09.10 at 18:00.
- Your confirmation is saved here:
- Open confirmation
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

Added guest:

- WHISPERS
- [guest name]
- You are registered as [main guest name]'s guest.
- Your private ticket and the confirmed location will be released on 09.10 at 18:00.
- Your confirmation is saved here:
- Open confirmation
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

### Ticket Release Email

Subject:

- Your WHISPERS Ticket

Primary guest, coming alone:

- WHISPERS
- [guest name]
- Your private ticket is ready.
- Coming on your own.
- Saturday 10 October · Doors 22:00
- The address is now revealed:
- [venue name]
- [venue address]
- Show this ticket at the door.
- Open ticket:
- [ticket link]
- Open Ticket
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

Primary guest, bringing guest:

- WHISPERS
- [guest name]
- Your private ticket is ready.
- Bringing [guest name].
- Saturday 10 October · Doors 22:00
- The address is now revealed:
- [venue name]
- [venue address]
- Show this ticket at the door.
- Open ticket:
- [ticket link]
- Open Ticket
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

Added guest:

- WHISPERS
- [guest name]
- Your private ticket is ready.
- Guest of [main guest name].
- Saturday 10 October · Doors 22:00
- The address is now revealed:
- [venue name]
- [venue address]
- Show this ticket at the door.
- Open ticket:
- [ticket link]
- Open Ticket
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

---

## Generated Ticket Image

Used by the Save your ticket action on the ticket page.

Visible text:

- WHISPERS
- [guest name]
- Invited guest
- Guest of [main guest name]
- [seal code]
- Saturday 10 October · Doors 22:00
- [venue name] · [venue address]
- Coming on your own
- Bringing [guest name]
- Your table is confirmed.
- Show this at the door.

File/share title:

- WHISPERS

---

## User-Facing API Errors

These are returned by API routes and may be shown by the public site or staff page.

### General

- Backend is not configured
- Method not allowed

### RSVP

- Invalid RSVP
- Please give a shorter name.
- Please give your full name.
- Please give a valid email.
- Please give your phone.
- Please give their full name.
- Please give their email.
- Please give a valid phone.
- RSVP is closed.
- Guest-list changes are closed.
- This invitation already has a registered guest.
- This invitation has already been used at the door.
- Could not save RSVP

### Invite

- Invalid invite
- Please give their full name.
- Please give a valid email.
- Please give a valid phone.
- Could not create invite
- Could not load invites
- Invalid invite send
- Invite not found
- Invite has no email
- Invite is not registered
- No confirmation email available
- No ticket email available
- Could not send invite
- Could not send invite email
- Could not send confirmation email
- Could not send ticket email
- Email is not configured

### Confirmation

- Missing confirmation
- Confirmation not found
- Could not load confirmation

### Ticket

- Missing ticket
- Ticket not found
- Could not load ticket

### Door

- Invalid scan
- Missing ticket token
- Invalid ticket
- Could not load door list
- Could not verify ticket
- Could not check in ticket

### Staff

- Could not load members
- Invalid check-in update
- Could not update check-in
- Could not load tables
- Invalid table assignment
- Could not assign table
- Invalid reservation update
- Could not update reservation
