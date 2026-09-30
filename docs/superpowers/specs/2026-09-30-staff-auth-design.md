# Staff Auth Design

## Goal

Protect `/staff/rose-door-10` and every staff-only API with application-level authentication:
username, password, secure session cookie, roles, and login rate limiting.

The staff area is used by a small trusted group of organizers and door staff. It should stay simple
to operate, but the implementation must not rely on an obscure URL as the only protection.

## Decisions

- Do not use nginx. The site runs on Cloudflare Pages and Pages Functions, so Cloudflare is already
  the edge/reverse-proxy layer. Adding nginx would require moving the app to a VPS/container and
  would add operational risk without improving this project.
- Do not store plaintext passwords.
- Do not add email-based staff accounts. Staff users have only a username, password hash, role,
  active status, timestamps, and optional audit metadata.
- Do not add self-service password reset.
- The primary admin can create staff users and perform an admin-controlled password change. The new
  password is shown once at creation/change time and is never retrievable afterwards.
- Keep the route `/staff/rose-door-10`, but show a login page when the session is missing or invalid.

## Roles

### `owner`

The main admin account.

Can:
- open all staff tabs;
- scan/check in guests;
- manage members, tables, invites;
- create, update, deactivate, and change passwords for staff users;
- see usernames, roles, active status, created time, and last login time.

Cannot:
- view existing passwords after the one-time reveal;
- recover another user's current password.

### `admin`

Organizer account.

Can:
- open all current operational tabs: scanner, members, tables, invites;
- send invite/confirmation/ticket emails;
- edit table and door status.

Cannot:
- manage staff users;
- create or change staff passwords.

### `door`

Door-only account.

Can:
- open the scanner tab;
- scan tickets;
- see recent scans.

Cannot:
- open members, tables, invite registry, or staff management;
- use staff management APIs.

## Database

Add a dated migration, for example `sql/2026-09-30-staff-auth.sql`.

### `staff_users`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `username text not null`
- `password_hash text not null`
- `role text not null check (role in ('owner', 'admin', 'door'))`
- `active boolean not null default true`
- `failed_login_count integer not null default 0`
- `locked_until timestamptz`
- `last_login_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:

- unique index on `lower(username)`.

RLS:

- enable RLS. Pages Functions use the service role key server-side.

### `staff_sessions`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `staff_user_id uuid not null references public.staff_users(id) on delete cascade`
- `session_token_hash text not null`
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `last_seen_at timestamptz`

Indexes:

- unique index on `session_token_hash`;
- index on `staff_user_id`;
- index on `expires_at`.

RLS:

- enable RLS. Pages Functions use the service role key server-side.

## Password Hashing

Use a Worker-compatible password hashing function.

Preferred implementation:

- PBKDF2 via Web Crypto;
- random 16-byte salt;
- at least 210,000 iterations;
- SHA-256;
- stored format:
  `pbkdf2_sha256$210000$<base64url-salt>$<base64url-hash>`.

Verification must use constant-time comparison for the derived hash bytes.

Password rules:

- generated staff passwords should be strong random passwords;
- manually supplied passwords, if supported, require at least 12 characters;
- usernames are trimmed, lowercased for comparison, and limited to safe visible characters.

## Sessions

On successful login:

- generate a high-entropy random session token;
- store only a hash of the token in `staff_sessions`;
- send the raw token only in a cookie;
- cookie name: `whispers_staff`;
- cookie flags:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Strict`
  - `Path=/`
  - `Max-Age=43200` (12 hours)

On every authenticated staff request:

- read `whispers_staff`;
- hash it;
- look up the session;
- require non-expired session;
- require active staff user;
- update `last_seen_at` opportunistically.

Logout:

- delete the session row when possible;
- clear the cookie with `Max-Age=0`.

## Rate Limiting and Lockout

The login endpoint protects against repeated guessing:

- if a username exists and password verification fails:
  - increment `failed_login_count`;
  - after 5 failures, set `locked_until` to now + 15 minutes;
- if the account is locked, return a generic invalid-login message;
- on successful login:
  - reset `failed_login_count` to 0;
  - clear `locked_until`;
  - set `last_login_at`.

Response copy must stay generic:

- `Invalid username or password.`

Do not reveal whether the username exists, whether the password is wrong, or whether an account is
locked.

## Routes and APIs

### Public Login Access

`GET /staff/rose-door-10`

- If authenticated: render the existing staff dashboard.
- If not authenticated: render a WHISPERS-styled login page with username, password, and Confirm.

### Auth APIs

Add:

- `POST /api/staff/login`
- `POST /api/staff/logout`
- `GET /api/staff/me`
- `GET /api/staff/users` owner-only
- `POST /api/staff/users` owner-only
- `PATCH /api/staff/users` owner-only
- `POST /api/staff/users/password` owner-only

The password creation/change response may include the generated password once:

```json
{
  "ok": true,
  "user": { "id": "...", "username": "door1", "role": "door", "active": true },
  "temporaryPassword": "shown-once"
}
```

The staff dashboard must warn that the password is shown once.

### Protected Existing APIs

Require an authenticated staff session for:

- `GET /api/door`
- `POST /api/door`
- `GET /api/staff/members`
- `POST /api/staff/checkin-state`
- `POST /api/staff/reservation-state`
- `GET /api/staff/invites`
- `POST /api/staff/invites`
- `POST /api/staff/invite-send`
- `GET /api/staff/tables`
- `POST /api/staff/table-assignment`

Role requirements:

- `door`: `/api/door` only.
- `admin`: `/api/door` and all existing `/api/staff/*` operational APIs.
- `owner`: everything, including staff user management.

## Staff UI

Login page:

- no brand-heavy marketing;
- same restrained WHISPERS styling;
- fields: username, password;
- one button: Confirm;
- generic error text only.

Dashboard:

- show current username and role in the header;
- add Logout button;
- show tabs based on role;
- owner sees an additional Staff tab.

Staff tab:

- list username, role, active, created time, last login;
- create user form: username + role + Create;
- generated password appears once after creation;
- owner-only password change action generates a new password and shows it once;
- active toggle can deactivate/reactivate accounts;
- no email fields.

## First Owner Account

The first owner should be bootstrapped safely.

Recommended:

- provide a one-time CLI/script or SQL helper that creates the first owner with a generated password
  hash;
- do not commit the password;
- after the first owner is created, all other users are managed inside the Staff tab.

If implementation time is tight, the first owner can be inserted manually with a generated hash from a
local script.

## Security Checks

- No plaintext staff password in git, SQL migrations, logs, API responses after the one-time reveal,
  or database rows.
- Staff API routes return `401` without a valid session.
- Door role cannot load members/tables/invites/staff users.
- Admin role cannot manage staff users.
- Owner role can manage staff users.
- Cookies are `HttpOnly`, `Secure`, `SameSite=Strict`.
- Login failures do not reveal account existence.
- Tests cover hashing, session cookie parsing, role checks, and route protection.

