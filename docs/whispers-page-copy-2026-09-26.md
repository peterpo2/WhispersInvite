# WHISPERS Invite - Page Copy Inventory

Дата: 2026-09-26

Този файл събира видимия текст от текущите страници и екрани на WHISPERS Invite, разделен по страници/flow. Целта е текстовете да могат да се преглеждат, редактират и одобряват отделно от кода.

## Public Invitation Flow

### 1. Seal Screen

**Main text**

- Press and hold to break the seal
- Private invitation · Saturday 10 October

**Buttons**

- Enter ›

**Dynamic text**

- Hold…

### 2. Film Screen

**Sequence text**

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

**Event cue**

- 10 . 10  ·  22:00

**Buttons**

- Skip ›

### 3. Letter / Event Details Screen

**Brand**

- WHISPERS

**Details**

- When
- Saturday 10 October
- Doors at 22:00
- Where
- Sofia Center
- The address follows
- Who
- You, and one person of your choosing
- Inside
- Phones stay in pockets on the floor

**Note**

- This invitation is not transferable. What happens beneath the rose stays beneath the rose.

**Buttons**

- Respond

### 4. Guest Details Screen

**Brand**

- WHISPERS

**Main text**

- Write your name.
- Use your real first and last name. It will become your private ticket.

**Fields**

- Full name
- First and last name
- Email
- name@example.com
- Phone
- +359 ...

**Buttons**

- Continue
- Back

**Validation**

- Please give your full name.
- Please give a valid email.
- Please give your phone.

### 5. RSVP Screen

**Main text**

- Will you be there?
- Saturday 10 October · Doors 22:00

**Buttons**

- I'll be there
- Not this time

**Dynamic text**

- Sealing…

### 6. Add Guest / Reservation Screen

**Brand**

- WHISPERS

**Main text**

- One person. Choose well.
- Their name and address go on the door list with yours. Names cannot be changed after the seventh.

**Plus-one option**

- I'm bringing someone
- Add them to the door list

**Plus-one fields**

- Full name
- First and last name
- Email (optional)
- name@example.com
- Phone
- +359 ...

**Privacy note**

- We use their details only for this invitation, event communication and door-list access.

**Table reservation option**

- Бихте ли искали да ви запазим маса за събитието?
- Ще се свържем с вас, за да дадем повече данни за резервацията.

**Buttons**

- Confirm my place
- Confirm both places
- Back

**Validation**

- Please give their full name.
- Please give a valid email.
- Please give their phone.
- We could not save your RSVP. Please try again.
- The invitation could not reach us. Please try again.

**Dynamic text**

- Sealing…

### 7. Registration Confirmed Screen

**Brand**

- WHISPERS

**Default ticket card text**

- Founding guest
- 09.10 · 18:00
- Ticket release
- Saturday 10 October · Doors 22:00
- Sofia Center · the address reaches you at 18:00 on the 9th
- Coming on your own

**Solo registration confirmation**

- Your registration is confirmed. On 09.10 at 18:00, you will receive an email with the confirmed location and your private ticket.

**Registration with added guest confirmation**

- Your registration is confirmed. On 09.10 at 18:00, you and your registered guest will each receive an email with the confirmed location and your private ticket.

**Dynamic status text**

- Registered for one
- Registered with [guest name]
- Table reservation requested.

**Buttons**

- Private ticket
- Start over

**Save ticket messages**

- Your ticket could not be prepared. Please try again.
- Your ticket is saved to this device.
- Both tickets are saved to this device.

### 8. Declined RSVP Screen

**Brand**

- WHISPERS

**Main text**

- Understood.
- Your place on the list stays where it is.
- You'll hear from us before the next one.

**Buttons**

- Start over

## Ticket Link Page

### 1. Default Ticket Layout

**Browser title**

- WHISPERS Ticket

**Brand**

- WHISPERS

**Default text**

- Private guest
- Saturday 10 October · Doors 22:00
- Sofia Center · the address reaches you at 18:00 on the 9th
- Show this seal at the door. The QR confirms your place in the WHISPERS list.

**Buttons**

- Private ticket

### 2. Locked Ticket Before 09.10 at 18:00

**Main text**

- Your ticket
- Registered guest
- 09.10 · 18:00
- Your ticket will be released on 09.10 at 18:00.
- Location remains sealed until 09.10 at 18:00.
- Locked until release

**Dynamic relationship text**

- Registered with [guest name]
- Guest of [main guest name]

### 3. Released Ticket After 09.10 at 18:00

**Dynamic role text**

- Founding guest
- Guest of [main guest name]

**Dynamic guest relationship text**

- Bringing [guest name]
- Coming on your own

**Dynamic table text**

- Table [table label]

**Door status**

- Ready for the door
- Already checked in

**Save ticket messages**

- Your ticket is saved to this device.
- Your ticket could not be prepared. Please try again.

### 4. Ticket Error States

**Load failure**

- We could not load your seal.
- Refresh to try again.

**Invalid ticket**

- Ticket not found
- Invalid seal

## Staff / Admin Area

Current staff URL: `/staff/rose-door-10`

Security note: admin security is planned but not active yet. The current staff area remains accessible by obscure link only.

### 1. Staff Header

**Brand and title**

- WHISPERS
- Door

**Buttons**

- Refresh

**Navigation**

- Scanner
- Members
- Tables

### 2. Scanner Page

**Camera buttons**

- Open camera
- Switch
- Stop
- Scan next

**Manual check**

- Paste QR value or token
- Check

**Helper text**

- Camera scanning runs locally in this browser. A valid WHISPERS QR marks the ticket as checked in.

**Initial state**

- Ready.
- Scan a guest ticket.

**Scanning state**

- Scanning…
- Hold the QR inside the frame, 20–40 cm away. Tap the picture to refocus.

**Checking state**

- Checking…
- Reading the seal.

**Successful scan**

- Confirmed.

**Already checked in**

- Already inside.
- First checked in at [time].

**Invalid scan**

- Invalid.
- This ticket could not be confirmed.

**Connection/camera errors**

- No connection.
- Try again.
- Camera blocked.
- Allow camera access or paste the QR value manually.

**Relationship text**

- Guest of [main guest name]
- Bringing [guest name] (own ticket)

**Recent scans**

- Scanned tonight
- No scanned tickets yet.
- Could not load the list. Try again.

### 3. Members Page

**Search and export**

- Search members
- Export CSV

**Table columns**

- Name
- Type
- Guest of
- Email
- Phone
- Request
- Table
- In
- Submitted

**Data labels**

- fallback
- yes
- no

**Loading and empty states**

- Loading...
- No connection.
- Could not load members
- No members.

**CSV export columns**

- Name
- Type
- Guest of
- Email
- Phone
- Reservation
- Table
- Checked in
- Submitted

### 4. Tables Page

**Helper text**

- All attending groups can be assigned to tables. Reservation requests are marked. Default model: five 6-seat tables and five 4-seat tables until the venue gives final data.

**Default table group**

- Unassigned
- Waiting for a table
- Attending groups waiting for a table
- Assigned reservation groups

**Capacity text**

- [used seats] / [capacity] seats
- [number] waiting

**Assignment option**

- Unassigned
- Add
- Remove
- Add to [table label]
- Move group
- requested table

**Loading and error states**

- Loading...
- No connection.
- Could not load tables

## Notes For Copy Review

- Public-facing copy is currently mostly in English, with the table reservation question/helper in Bulgarian.
- Location remains intentionally vague until 09.10 at 18:00.
- The visible confirmation after registration intentionally does not show QR code or special seal code before ticket release.
- The staff/admin copy is functional and internal. It can stay more utilitarian than the guest-facing invitation copy.
