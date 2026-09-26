# Staff Admin Design

## Summary

The current staff link, `/staff/rose-door-10`, remains the staff entry point and still opens the
existing QR scanner by default. The page becomes a small staff admin with three sections:

1. Scanner
2. Members
3. Tables

The scanner stays functionally the same. Members and Tables add back-office controls for the
event team: search/sort all registrations, undo check-ins, and arrange table reservations.

The admin must eventually be protected with username/password plus an email confirmation code.
The current implementation should prepare the auth and email-provider boundaries, but it should
not enable the login wall yet. It stays private by staff link until the final domain and email
provider exist. SuperHosting.bg is the likely future domain/email provider, but the code should
not depend on it directly until real credentials and DNS are available.

## Goals

- Keep `/staff/rose-door-10` as the stable staff URL.
- Keep the current scanner screen and logic as the default view.
- Add top navigation for Scanner, Members and Tables.
- Prepare, but do not yet enable, staff login:
  - username
  - password
  - email confirmation code
- Make email-code delivery provider-agnostic for now.
- Show every RSVP/person in Members with all registration details.
- Allow sorting and search in Members.
- Allow staff to toggle check-in state for each ticket holder.
- Allow staff to arrange reservation-request groups into tables.
- Start with example tables: 10 tables total, 5 tables with 6 seats and 5 tables with 4 seats.
- Treat the scanner and admin UI as iPhone/Safari-first, especially camera scanning on event night.

## Non-Goals

- Do not change the public invitation URL.
- Do not remove or break scanner behaviour.
- Do not require final domain/email hosting before the admin UI can be built.
- Do not build a full user-management product. This is event staff access only.
- Do not expose admin APIs without auth.

## Admin Navigation

The existing header should gain three navigation controls:

- Scanner
- Members
- Tables

Opening `/staff/rose-door-10` always lands on Scanner. The implementation can use hash routes:

- `/staff/rose-door-10` -> Scanner
- `/staff/rose-door-10#members` -> Members
- `/staff/rose-door-10#tables` -> Tables

Scanner remains the default because door staff need the fastest path on event night.

## Authentication

### Login Flow

1. Staff opens `/staff/rose-door-10`.
2. If there is no valid staff session, show a login screen.
3. Staff enters username and password.
4. Server validates credentials.
5. Server creates a short-lived email confirmation code.
6. Server sends the code to the staff email address.
7. Staff enters the code.
8. Server verifies the code and sets an HTTP-only staff session cookie.
9. Staff can access Scanner, Members and Tables until the session expires. The planned session
   lifetime is 1 day.

### Staff Users

Staff/admin users should live server-side, preferably in Supabase, not in client code. First
version can add new admins only directly in the database.

Recommended fields:

- username
- password hash or external credential reference
- email, required for login confirmation codes
- is_admin boolean, or equivalent `0/1` role flag
- active boolean
- created_at / updated_at

For the first version, every active admin can see Scanner, Members and Tables. Separate roles can
be added later only if the organizer wants different visibility levels.

### Future Email Provider

The email sender should be wrapped behind one server helper:

```text
sendStaffLoginCode(env, { email, code })
```

Before real email credentials exist, this helper can support a dev/manual mode that records only
that a code was generated and returns a generic success response. It must not expose the code to
the browser in production.

Likely future provider path:

- domain and email through SuperHosting.bg
- DNS records configured for the sender
- provider credentials stored only in Cloudflare Pages environment variables

The final provider may still be SMTP, API-based email, or another service. The rest of the admin
auth should not care which one is chosen.

### Security Rules

- Staff passwords must not be stored in source code.
- Staff password hashes or credential secrets belong in Cloudflare environment variables or a
  server-side data table, not in the browser.
- Staff session cookies must be `HttpOnly`, `Secure`, `SameSite=Strict` and `Path=/staff`.
- Staff session lifetime should be 1 day.
- Confirmation codes expire quickly, recommended 10 minutes.
- Code attempts should be limited, recommended 5 attempts per login challenge.
- Admin APIs return generic errors, never stack traces or upstream Supabase bodies.

## Members Page

Members is a staff table over the RSVP data.

### Rows

Members should show one row per person, not one row per RSVP:

- primary guest row
- one row for each added guest/companion

Each row should include enough context to understand the RSVP group.

### Columns

Recommended columns:

- Name
- Type: Guest or Plus-one
- Guest of / Bringing
- Email
- Phone
- RSVP status
- Table reservation requested
- Group size
- Table assignment
- Ticket email sent
- Checked in
- Check-in time
- Submitted time

For added guest email display:

- show companion `email` as the ticket delivery target
- if `email_is_fallback` is true, mark that it uses the primary guest email

### Export

Members should offer export options for the full visible dataset:

- CSV
- Excel-compatible CSV/table export
- Google Sheets-friendly CSV export

The first implementation can generate CSV in the browser from the already loaded Members data.
Direct Google Sheets API integration is optional later.

### Search And Sort

Search should filter by:

- name
- email
- phone
- seal code
- guest-of / bringing name

Sortable columns should include:

- name
- type
- reservation requested
- checked-in state
- submitted time
- table assignment if available

Client-side sorting/search is acceptable for the expected event size. The API can return all
attending/declined rows because the cap is small.

### Check-In Toggle

Members should include a staff checkbox/toggle for checked-in state.

For a primary guest:

- checked -> set `checked_in_at = now()`
- unchecked -> set `checked_in_at = null`

For an added guest/companion:

- checked -> set companion `checked_in_at = now()`
- unchecked -> set companion `checked_in_at = null`

Unchecking is important because it lets staff undo a mistaken scan and scan the QR again later.

## Tables Page

Tables is for arranging reservation-request groups into venue tables.

### Reservation Groups

The unit of assignment is the RSVP group, not each individual ticket:

- solo guest with reservation: group size 1
- guest plus one companion with reservation: group size 2
- guest plus multiple companions with reservation: group size is `1 + companion_count`

Only groups with `wants_table_reservation = true` need to appear in the unassigned reservation
queue by default. Staff may still need a way to search all groups and assign someone manually.

### Initial Table Model

Until the venue gives final table data, use a default editable model:

- Tables 1-5: 6 seats each
- Tables 6-10: 4 seats each

Each table tracks:

- table label
- capacity
- assigned RSVP groups
- used seats
- remaining seats

### Interaction

Staff should be able to:

- see unassigned reservation groups
- assign a group to a table
- move a group from one table to another
- remove a group from a table back to unassigned
- see over-capacity warnings

When a group is assigned to a table, every released ticket in that RSVP group should show the same
table label. If the group is unassigned, tickets should not show table copy.

Drag-and-drop is nice but not required. A simpler first version can use buttons or selects:

- Assign to table
- Move
- Remove

This is more reliable on phones and staff laptops than drag-and-drop alone.

## Data Model

The RSVP table already needs these fields from the deferred ticket spec:

```sql
wants_table_reservation boolean not null default false
guest_email text
guest_phone text
plus_one_email text
plus_one_phone text
```

Once the deferred ticket flow moves added guests into `rsvp_companions`, Tables and Members should
read companions from that table instead of only the legacy `plus_one_*` columns. Companion
`email` is the effective ticket email target; `email_is_fallback` tells staff whether it was copied
from the primary guest email because the companion did not provide their own.

Add table assignment storage:

```sql
create table if not exists staff_tables (
  id text primary key,
  label text not null,
  capacity integer not null check (capacity > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_table_assignments (
  event_key text not null,
  rsvp_id bigint not null references public.rsvps(id) on delete cascade,
  table_id text not null references public.staff_tables(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (event_key, rsvp_id)
);
```

Default seed:

- `t1` to `t5`, labels `Table 1` to `Table 5`, capacity 6
- `t6` to `t10`, labels `Table 6` to `Table 10`, capacity 4

The assignment table uses `rsvp_id`, so one assignment covers the primary guest and every
registered companion as a group.

## Admin APIs

Recommended routes:

```text
POST /api/staff/login
POST /api/staff/verify
POST /api/staff/logout
GET  /api/staff/members
POST /api/staff/checkin-state
GET  /api/staff/tables
POST /api/staff/table-assignment
```

All `/api/staff/*` routes require a valid staff session except login and verify.

### `GET /api/staff/members`

Returns all RSVPs needed for Members and Tables. It may return RSVP rows with nested/person-shaped
data, but the browser should not receive service-role credentials.

### `POST /api/staff/checkin-state`

Body:

```json
{
  "rsvpId": 123,
  "holder": "guest",
  "checkedIn": false
}
```

Rules:

- `holder` is `guest` or `plus_one`
- guest maps to `checked_in_at`
- plus_one maps to `plus_one_checked_in_at`
- `checkedIn: true` writes current timestamp
- `checkedIn: false` writes null

### `GET /api/staff/tables`

Returns:

- table definitions
- assigned groups
- unassigned reservation-request groups
- capacity usage
- enough table assignment data for `/api/ticket` to show the table label on released tickets

### `POST /api/staff/table-assignment`

Body:

```json
{
  "rsvpId": 123,
  "tableId": "t3"
}
```

Use `tableId: null` to unassign. First version should reject over-capacity moves.

## Page Structure

Keep the current staff page as a single served HTML file initially:

```text
functions/staff/rose-door-10.js
```

The file can render:

- login view
- scanner view
- members view
- tables view

If the file becomes too large during implementation, split HTML fragments or helpers into shared
server-side functions, but keep the public route stable.

## Testing Requirements

- Pure tests for route allowlist if new `/api/staff/*` routes are added.
- Pure tests for table capacity calculations if helper functions are added.
- Pure tests for check-in state payload validation.
- Manual `wrangler pages dev .` test:
  - unauthenticated staff sees login
  - login asks for email code
  - scanner still opens by default
  - Members search/sort works
  - Members check-in toggle updates the row
  - Tables assignment moves groups and prevents accidental over-capacity
  - scanner and public-facing staff pages are checked on iPhone/Safari or an iPhone-sized WebKit
    target

## Open Implementation Decisions

These are deferred until provider/domain details exist:

- exact email sending provider
- final staff email addresses
- final table count/capacity from the venue

These do not block building the admin UI and data model boundaries.
