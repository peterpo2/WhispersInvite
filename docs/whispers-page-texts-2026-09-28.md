# WHISPERS Invite - Text Inventory

Date: 2026-09-28

This file lists the visible text currently used across the WHISPERS Invite pages and page-like surfaces. Dynamic values are shown in square brackets.

## Global

### Partner Bottom Bar

- Powered by
- Barons de Rothschild
- Beluga

### Site Lock / Blocked Routes

- Not found.

### Robots

```text
User-agent: *
Disallow: /
```

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

- Hold...

Personal invitation text:

- This invitation was issued to
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
- Saturday 10 October
- Doors at 22:00
- Where
- Sofia · private location in central Sofia
- Address released on 09.10 at 18:00.
- Who
- You, and one person of your choosing
- Inside
- Phones stay in pockets on the floor

Note:

- This invitation only grants access to the event. What happens beneath the rose stays beneath the rose.

Action:

- Respond

### Identify / Guest Details Screen

Brand:

- WHISPERS

Default title and helper:

- Write your name.
- Use your real first and last name. It will become your private ticket.

Personal invite title and helper:

- Confirm your details.
- Your name is already on the list. Please leave your email and phone so we can reach you.

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
- Saturday 10 October · Doors 22:00

Actions:

- I'll be there
- Not this time

Dynamic state:

- Sealing...

### Add Guest / Reservation Screen

Brand:

- WHISPERS

Main text:

- One person. Choose well.
- Their name and email go on the door list with yours. Guest-list details cannot be changed after the RSVP deadline.

Plus-one option:

- I'm bringing someone
- Add them to the door list

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

Dynamic state:

- Sealing...

### Registration Confirmed Screen

Brand:

- WHISPERS

Ticket card default text:

- [guest name]
- Founding guest
- 09.10 · 18:00
- Ticket release
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

- Private ticket
- Start over
- Cancel attendance

Cancel confirmation:

- Are you sure you want to cancel your attendance?

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

- Start over

## Personal Invite Redirect

Path: `/hi/[token]`

Visible text:

- None. This route redirects to `/?token=[token]`.

## Ticket Page

Path: `/ticket/[token]`

### Browser Title

- WHISPERS Ticket

### Default Loading Layout

Brand:

- WHISPERS

Default text:

- ...
- Private guest
- WSP · 10
- Saturday 10 October · Doors 22:00
- Sofia · private location in central Sofia. Address released on 09.10 at 18:00.

Action:

- Private ticket

### Pending RSVP Ticket

Role:

- Invited guest

Main text:

- RSVP FIRST
- Please confirm your attendance first. Your private ticket will appear here after RSVP and ticket release.
- Use your confirmation link to RSVP. Location remains sealed until 09.10 at 18:00.
- Waiting for RSVP

### Locked Registered Ticket

Role:

- Registered guest

Main text:

- 10.10 · 22:00
- Ticket
- Locked until release
- Location remains sealed until 09.10 at 18:00.
- Your ticket will be sent to you on 09.10 at 18:00.

Dynamic relationship text:

- Registered with [guest name]
- Guest of [main guest name]

### Released Ticket

Dynamic role:

- Founding guest
- Guest of [main guest name]

Dynamic relationship:

- Bringing [guest name]
- Coming on your own

Location:

- Sofia · private location in central Sofia. Address released on 09.10 at 18:00.
- [venue name] · [venue address]

Table status:

- Your table is confirmed.

Door helper:

- Show this seal at the door. The QR confirms your place in the WHISPERS list.

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

## Staff / Door Page

Path: `/staff/rose-door-10`

### Browser Title

- WHISPERS Door

### Header

Brand:

- WHISPERS
- Door

Action:

- Refresh

Navigation:

- Scanner
- Members
- Tables
- Invite

### Scanner Tab

Camera actions:

- Open camera
- Switch
- Stop
- Scan next

Manual check:

- Paste QR value or token
- Check

Helper:

- Camera scanning runs locally in this browser. A valid WHISPERS QR marks the ticket as checked in.

Initial result:

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

Already checked in:

- Already inside.
- First checked in at [time].

Invalid:

- Invalid.
- This ticket could not be confirmed.

Connection / camera errors:

- No connection.
- Try again.
- Camera blocked.
- Allow camera access or paste the QR value manually.

Relationship text:

- Guest of [main guest name]
- Bringing [guest name] (own ticket)

Recent scans:

- Scanned tonight
- No scanned tickets yet.
- Could not load the list. Try again.
- No connection. Try again.

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
- Request
- Confirmed
- Table
- In
- Scanned
- Registered

Inline labels:

- fallback
- yes
- no

Loading / empty / error states:

- Loading...
- No connection.
- Could not load members
- No members.

Confirmation prompts:

- Mark this guest as inside?
- Remove this guest check-in?
- Mark table request for this group?
- Remove table request for this group?
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

Pagination:

- [start]-[end] of [total] · page [current] / [pages]
- Prev
- Next

### Tables Tab

Helper:

- All attending groups can be assigned to tables. Reservation requests are marked. Default model: five 6-seat tables and five 4-seat tables until the venue gives final data.

Default table group:

- Unassigned
- Waiting
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
- Move group
- Confirmed
- requested table
- confirmed
- unconfirmed
- assigned
- unassigned

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
- Send
- Confirmation
- Ticket
- Created

Status labels:

- Attending
- Declined
- Not responded

Send states:

- Send
- Send again
- Sending
- No email
- Could not send invite

Link actions:

- Copy
- Copied
- Copy link

Loading / empty / error states:

- Loading...
- No connection.
- Could not load invites
- No invites.

Pagination:

- [start]-[end] of [total] · page [current] / [pages]
- Prev
- Next

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

- WHISPERS Door

Plain text:

```text
WHISPERS

[guest name],

Your private invitation is waiting.
Open your personal link and complete the RSVP steps:

[confirmation link]

For questions:
guestlist@whisperssociety.com
+359 888 012 380
```

HTML email visible text:

- WHISPERS
- [guest name]
- Your private invitation is waiting.
- Respond
- For questions:
- guestlist@whisperssociety.com
- +359 888 012 380

## Notes

- Public-facing guest text is currently English.
- Staff/admin text is functional and internal.
- Location remains intentionally hidden until the release time unless `event_details` exposes a venue.
- The public site may currently return `Not found.` while `SITE_LOCKED=1` is enabled.
