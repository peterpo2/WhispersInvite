# Staff Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure username/password authentication, role-based authorization, and owner-managed staff accounts for `/staff/rose-door-10`.

**Architecture:** Add focused shared auth helpers for password hashing, cookie/session handling, and role checks. Store staff users and hashed sessions in Supabase, render the staff login page from the existing staff route when no valid session exists, and protect every staff/door API server-side.

**Tech Stack:** Cloudflare Pages Functions ES modules, Supabase PostgREST via `supabaseFetch`, Web Crypto PBKDF2, secure HTTP-only cookies, Node `node:test`.

---

## File Structure

- Create `functions/_shared/staff-auth.js`: password hashing, token hashing, cookie parsing/building, role helpers, session lookup.
- Create `functions/_shared/staff-login-page.js`: server-rendered login HTML.
- Create `functions/api/staff/login.js`: POST username/password login.
- Create `functions/api/staff/logout.js`: POST logout.
- Create `functions/api/staff/me.js`: GET current staff user.
- Create `functions/api/staff/users.js`: owner-only list/create/update users.
- Create `functions/api/staff/users/password.js`: owner-only generated password change.
- Create `sql/2026-09-30-staff-auth.sql`: staff users and sessions.
- Modify `sql/schema.sql`: include staff auth tables.
- Modify `functions/staff/rose-door-10.js`: require session, show login if missing, add role-aware tabs/header, add Staff tab for owner.
- Modify existing staff APIs in `functions/api/door.js` and `functions/api/staff/*.js`: require roles.
- Modify `functions/_shared/access.js`: allow new auth API paths.
- Add tests in `test/staff-auth.test.js`, `test/staff-auth-source.test.js`, `test/staff-admin-ui.test.js`, and `test/access.test.js`.

## Task 1: Database Migration

**Files:**
- Create: `sql/2026-09-30-staff-auth.sql`
- Modify: `sql/schema.sql`
- Test: `test/security.test.js`

- [ ] **Step 1: Add failing schema assertions**

Add to `test/security.test.js`:

```js
const staffAuthMigration = readFileSync("sql/2026-09-30-staff-auth.sql", "utf8");

test("staff auth tables store hashed passwords and sessions with RLS", () => {
  for (const table of ["staff_users", "staff_sessions"]) {
    assert.match(schema, new RegExp(`create table if not exists ${table}`));
    assert.match(schema, new RegExp(`alter table ${table} enable row level security;`));
    assert.match(staffAuthMigration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(staffAuthMigration, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
  assert.match(schema, /password_hash text not null/);
  assert.doesNotMatch(schema, /password text/);
  assert.match(schema, /session_token_hash text not null/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test test/security.test.js
```

Expected: FAIL because `sql/2026-09-30-staff-auth.sql` does not exist and schema lacks the tables.

- [ ] **Step 3: Add migration**

Create `sql/2026-09-30-staff-auth.sql`:

```sql
create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role text not null check (role in ('owner', 'admin', 'door')),
  active boolean not null default true,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_users_username_unique
  on public.staff_users (lower(username));

alter table public.staff_users enable row level security;

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  session_token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists staff_sessions_token_hash_unique
  on public.staff_sessions (session_token_hash);
create index if not exists staff_sessions_user_idx
  on public.staff_sessions (staff_user_id);
create index if not exists staff_sessions_expires_idx
  on public.staff_sessions (expires_at);

alter table public.staff_sessions enable row level security;
```

- [ ] **Step 4: Update schema**

Add the same table/index/RLS definitions to `sql/schema.sql` after the staff table assignment tables.

- [ ] **Step 5: Run the schema test**

Run:

```bash
node --test test/security.test.js
```

Expected: PASS.

## Task 2: Shared Staff Auth Helpers

**Files:**
- Create: `functions/_shared/staff-auth.js`
- Test: `test/staff-auth.test.js`

- [ ] **Step 1: Write helper tests**

Create `test/staff-auth.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStaffCookie,
  clearStaffCookie,
  hashPassword,
  parseCookies,
  safeStaffUser,
  verifyPassword,
} from "../functions/_shared/staff-auth.js";

test("staff passwords are hashed and verified without storing plaintext", async () => {
  const hash = await hashPassword("Very Strong Password 123");
  assert.match(hash, /^pbkdf2_sha256\$100000\$/);
  assert.equal(hash.includes("Very Strong Password 123"), false);
  assert.equal(await verifyPassword("Very Strong Password 123", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("staff cookies are secure http-only strict cookies", () => {
  const cookie = buildStaffCookie("abc", 43200);
  assert.match(cookie, /^whispers_staff=abc;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=43200/);
  assert.match(clearStaffCookie(), /Max-Age=0/);
});

test("parseCookies reads the staff session token", () => {
  assert.deepEqual(parseCookies("a=1; whispers_staff=secret; theme=dark"), {
    a: "1",
    whispers_staff: "secret",
    theme: "dark",
  });
});

test("safeStaffUser never returns password hashes", () => {
  const user = safeStaffUser({
    id: "u1",
    username: "Owner",
    role: "owner",
    active: true,
    password_hash: "secret",
    created_at: "2026-09-30",
    last_login_at: null,
  });
  assert.deepEqual(user, {
    id: "u1",
    username: "Owner",
    role: "owner",
    active: true,
    createdAt: "2026-09-30",
    lastLoginAt: null,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test test/staff-auth.test.js
```

Expected: FAIL because `staff-auth.js` does not exist.

- [ ] **Step 3: Implement helpers**

Create `functions/_shared/staff-auth.js` with:

```js
const STAFF_COOKIE = "whispers_staff";
const PASSWORD_ITERATIONS = 100000;
const PASSWORD_ALGO = "PBKDF2";
const HASH_ALGO = "SHA-256";
const SESSION_SECONDS = 60 * 60 * 12;
const ROLES = ["owner", "admin", "door"];

function bytesToBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidRole(role) {
  return ROLES.includes(role);
}

export function parseCookies(header) {
  return String(header || "").split(";").map((part) => part.trim()).filter(Boolean).reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 0) return cookies;
    cookies[part.slice(0, index)] = decodeURIComponent(part.slice(index + 1));
    return cookies;
  }, {});
}

export function buildStaffCookie(token, maxAge = SESSION_SECONDS) {
  return `${STAFF_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearStaffCookie() {
  return `${STAFF_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", utf8(password), PASSWORD_ALGO, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: PASSWORD_ALGO, hash: HASH_ALGO, salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const [kind, iter, saltText, hashText] = String(stored || "").split("$");
  if (kind !== "pbkdf2_sha256" || Number(iter) !== PASSWORD_ITERATIONS || !saltText || !hashText) return false;
  const derived = await hashPassword(password, base64UrlToBytes(saltText));
  return constantTimeEqual(utf8(derived), utf8(stored));
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest(HASH_ALGO, utf8(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function makeSessionToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function makeTemporaryPassword() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(18)));
}

export function safeStaffUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    active: row.active === true,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || null,
  };
}

export function roleAllows(role, required) {
  if (role === "owner") return true;
  if (role === "admin") return required === "admin" || required === "door";
  if (role === "door") return required === "door";
  return false;
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
node --test test/staff-auth.test.js
```

Expected: PASS.

## Task 3: Session Lookup and Route Protection

**Files:**
- Modify: `functions/_shared/staff-auth.js`
- Test: `test/staff-auth-source.test.js`

- [ ] **Step 1: Add source tests for secure session lookup**

Create `test/staff-auth-source.test.js`:

```js
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const auth = readFileSync("functions/_shared/staff-auth.js", "utf8");

test("staff auth helper looks up hashed session tokens only", () => {
  assert.match(auth, /export async function requireStaff/);
  assert.match(auth, /hashSessionToken\(token\)/);
  assert.match(auth, /staff_sessions\?select=/);
  assert.match(auth, /session_token_hash=eq\./);
  assert.doesNotMatch(auth, /session_token=eq\./);
});

test("staff auth helper enforces roles", () => {
  assert.match(auth, /roleAllows\(user\.role, requiredRole\)/);
  assert.match(auth, /return \{ error: json\(\{ error: "Unauthorized" \}, 401\) \}/);
  assert.match(auth, /return \{ error: json\(\{ error: "Forbidden" \}, 403\) \}/);
});
```

- [ ] **Step 2: Run source tests to verify they fail**

Run:

```bash
node --test test/staff-auth-source.test.js
```

Expected: FAIL until `requireStaff` is implemented.

- [ ] **Step 3: Implement `requireStaff`**

Add imports and function in `functions/_shared/staff-auth.js`:

```js
import { json } from "./responses.js";
import { supabaseFetch } from "./supabase.js";

export async function requireStaff(request, env, requiredRole = "door") {
  const token = parseCookies(request.headers.get("Cookie")).whispers_staff;
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  const path = `/rest/v1/staff_sessions?select=id,expires_at,staff_user_id,staff_users(id,username,role,active,created_at,last_login_at)&session_token_hash=eq.${encodeURIComponent(tokenHash)}&expires_at=gt.${encodeURIComponent(now)}&limit=1`;
  const found = await supabaseFetch(env, path);
  if (found.error) return found;
  if (!found.response.ok) return { error: json({ error: "Unauthorized" }, 401) };
  const rows = await found.response.json();
  const session = rows[0];
  const user = session?.staff_users;
  if (!user || user.active !== true) return { error: json({ error: "Unauthorized" }, 401) };
  if (!roleAllows(user.role, requiredRole)) return { error: json({ error: "Forbidden" }, 403) };
  supabaseFetch(env, `/rest/v1/staff_sessions?id=eq.${encodeURIComponent(session.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_seen_at: now }),
  }).catch(() => {});
  return { user: safeStaffUser(user), sessionId: session.id };
}
```

- [ ] **Step 4: Run source tests**

Run:

```bash
node --test test/staff-auth-source.test.js
```

Expected: PASS.

## Task 4: Auth API Routes and Allowlist

**Files:**
- Create: `functions/api/staff/login.js`
- Create: `functions/api/staff/logout.js`
- Create: `functions/api/staff/me.js`
- Modify: `functions/_shared/access.js`
- Test: `test/access.test.js`
- Test: `test/staff-auth-source.test.js`

- [ ] **Step 1: Add allowlist tests**

Add to the allowed paths list in `test/access.test.js`:

```js
"/api/staff/login",
"/api/staff/logout",
"/api/staff/me",
"/api/staff/users",
"/api/staff/users/password",
```

- [ ] **Step 2: Add source assertions**

Add to `test/staff-auth-source.test.js`:

```js
test("staff login route hashes passwords and sets the secure cookie", () => {
  const login = readFileSync("functions/api/staff/login.js", "utf8");
  assert.match(login, /verifyPassword/);
  assert.match(login, /buildStaffCookie/);
  assert.match(login, /failed_login_count/);
  assert.match(login, /locked_until/);
  assert.doesNotMatch(login, /password_hash.*json/);
});

test("staff logout and me routes use server-side sessions", () => {
  const logout = readFileSync("functions/api/staff/logout.js", "utf8");
  const me = readFileSync("functions/api/staff/me.js", "utf8");
  assert.match(logout, /requireStaff/);
  assert.match(logout, /clearStaffCookie/);
  assert.match(me, /requireStaff/);
  assert.match(me, /user/);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
node --test test/access.test.js test/staff-auth-source.test.js
```

Expected: FAIL until files and allowlist entries exist.

- [ ] **Step 4: Update access allowlist**

Add the five new API paths to `PUBLIC_PATHS` in `functions/_shared/access.js`.

- [ ] **Step 5: Implement login/logout/me**

Implement:

- `POST /api/staff/login`: validate username/password, fetch staff user by lower username, verify active/lockout/password, create session, set cookie.
- `POST /api/staff/logout`: require staff, delete session, clear cookie.
- `GET /api/staff/me`: require staff, return `{ ok: true, user }`.

All login failures return:

```js
json({ error: "Invalid username or password." }, 401)
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --test test/access.test.js test/staff-auth-source.test.js
```

Expected: PASS.

## Task 5: Protect Existing Staff APIs

**Files:**
- Modify: `functions/api/door.js`
- Modify: all files in `functions/api/staff/*.js`
- Test: `test/staff-auth-source.test.js`

- [ ] **Step 1: Add source assertions**

Add:

```js
test("existing staff APIs require staff roles", () => {
  const files = [
    ["functions/api/door.js", "door"],
    ["functions/api/staff/members.js", "admin"],
    ["functions/api/staff/checkin-state.js", "admin"],
    ["functions/api/staff/reservation-state.js", "admin"],
    ["functions/api/staff/invites.js", "admin"],
    ["functions/api/staff/invite-send.js", "admin"],
    ["functions/api/staff/tables.js", "admin"],
    ["functions/api/staff/table-assignment.js", "admin"],
  ];
  for (const [file, role] of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /requireStaff/);
    assert.match(source, new RegExp(`requireStaff\\(request, env, "${role}"\\)`));
  }
});
```

- [ ] **Step 2: Run source test to verify it fails**

Run:

```bash
node --test test/staff-auth-source.test.js
```

Expected: FAIL until APIs require auth.

- [ ] **Step 3: Add role checks to every handler**

At the top of each handler:

```js
const staff = await requireStaff(request, env, "admin");
if (staff.error) return staff.error;
```

For `functions/api/door.js`, use:

```js
const staff = await requireStaff(request, env, "door");
if (staff.error) return staff.error;
```

- [ ] **Step 4: Run source test**

Run:

```bash
node --test test/staff-auth-source.test.js
```

Expected: PASS.

## Task 6: Staff Login Page and Role-Aware Dashboard

**Files:**
- Create: `functions/_shared/staff-login-page.js`
- Modify: `functions/staff/rose-door-10.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Add UI assertions**

Add:

```js
test("staff page renders login and role-aware staff management controls", () => {
  assert.match(staffPage, /renderStaffLoginPage/);
  assert.match(staffPage, /requireStaff/);
  assert.match(staffPage, /id="staffLogin"/);
  assert.match(staffPage, /name="username"/);
  assert.match(staffPage, /name="password"/);
  assert.match(staffPage, />Confirm</);
  assert.match(staffPage, /data-view="staff"/);
  assert.match(staffPage, /id="staffUsersTable"/);
  assert.match(staffPage, /temporaryPassword/);
  assert.doesNotMatch(staffPage, /email optional/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test test/staff-admin-ui.test.js
```

Expected: FAIL until login/staff UI exists.

- [ ] **Step 3: Add login page renderer**

Create `functions/_shared/staff-login-page.js` with a compact HTML page containing:

- WHISPERS lockup;
- form id `staffLogin`;
- username input `name="username"`;
- password input `name="password"`;
- button text `Confirm`;
- JS that posts to `/api/staff/login` and reloads on success.

- [ ] **Step 4: Gate dashboard route**

In `functions/staff/rose-door-10.js`, change `onRequestGet()` to accept `{ request, env }`, call:

```js
const staff = await requireStaff(request, env, "door");
if (staff.error) return renderStaffLoginPage();
```

Then expose:

```html
<script>const STAFF_USER = ...;</script>
```

with only safe user fields.

- [ ] **Step 5: Add role-aware UI**

Update dashboard JS:

- show username/role in header;
- add logout button that posts `/api/staff/logout`;
- hide operational tabs if role is `door`;
- show Staff tab only when role is `owner`;
- Staff tab loads `/api/staff/users`, creates users, changes generated passwords, and toggles active.

- [ ] **Step 6: Run UI tests**

Run:

```bash
node --test test/staff-admin-ui.test.js
```

Expected: PASS.

## Task 7: Owner Staff User Management APIs

**Files:**
- Create: `functions/api/staff/users.js`
- Create: `functions/api/staff/users/password.js`
- Test: `test/staff-auth-source.test.js`

- [ ] **Step 1: Add source assertions**

Add:

```js
test("owner-only staff user APIs never return password hashes", () => {
  const users = readFileSync("functions/api/staff/users.js", "utf8");
  const password = readFileSync("functions/api/staff/users/password.js", "utf8");
  assert.match(users, /requireStaff\(request, env, "owner"\)/);
  assert.match(password, /requireStaff\(request, env, "owner"\)/);
  assert.match(users, /safeStaffUser/);
  assert.match(password, /temporaryPassword/);
  assert.match(password, /hashPassword/);
  assert.doesNotMatch(users, /password_hash.*json/);
  assert.doesNotMatch(password, /password_hash.*json/);
});
```

- [ ] **Step 2: Run source tests to verify they fail**

Run:

```bash
node --test test/staff-auth-source.test.js
```

Expected: FAIL until owner APIs exist.

- [ ] **Step 3: Implement `users.js`**

Handlers:

- `GET`: owner-only list of staff users using `safeStaffUser`.
- `POST`: owner-only create user with generated temporary password, store hash, return safe user and `temporaryPassword`.
- `PATCH`: owner-only update `role` and/or `active`; reject attempts to deactivate the current owner session user.

- [ ] **Step 4: Implement `users/password.js`**

Handler:

- `POST`: owner-only, body `{ id }`, generate new password, store hash, return safe user and `temporaryPassword`.

- [ ] **Step 5: Run source tests**

Run:

```bash
node --test test/staff-auth-source.test.js
```

Expected: PASS.

## Task 8: Full Verification, Commit, Push, Deploy

**Files:**
- All changed files.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Check diff and encoding**

Run:

```bash
git diff --check
rg -n "password_hash.*json|temporaryPassword.*console|console\\.log|debugger|<<<<<<<|>>>>>>>" functions test sql docs
```

Expected:

- `git diff --check` has no output.
- `rg` has no matches except intentional source-test assertions.

- [ ] **Step 3: Local smoke with Wrangler**

Run:

```bash
npx wrangler pages dev . --ip 127.0.0.1 --port 8791
```

Smoke checks:

- `GET /staff/rose-door-10` shows login when no cookie.
- `POST /api/staff/login` with bad credentials returns `401`.
- with a valid owner account, login sets `whispers_staff` cookie with `HttpOnly; Secure; SameSite=Strict`.
- owner can load Staff tab.
- admin cannot load Staff tab APIs.
- door can scan via `/api/door` but cannot load `/api/staff/members`.

- [ ] **Step 4: Commit**

Stage only intentional files:

```bash
git add functions/_shared/staff-auth.js functions/_shared/staff-login-page.js functions/_shared/access.js functions/staff/rose-door-10.js functions/api/door.js functions/api/staff/login.js functions/api/staff/logout.js functions/api/staff/me.js functions/api/staff/users.js functions/api/staff/users/password.js functions/api/staff/members.js functions/api/staff/checkin-state.js functions/api/staff/reservation-state.js functions/api/staff/invites.js functions/api/staff/invite-send.js functions/api/staff/tables.js functions/api/staff/table-assignment.js sql/2026-09-30-staff-auth.sql sql/schema.sql test/staff-auth.test.js test/staff-auth-source.test.js test/staff-admin-ui.test.js test/access.test.js test/security.test.js
git commit -m "feat: secure staff admin access"
```

- [ ] **Step 5: Push and deploy**

Run:

```bash
git push
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

- [ ] **Step 6: Live smoke**

Check:

- `https://whisperssociety.com/staff/rose-door-10` shows login when not authenticated.
- `https://whisperssociety.com/api/staff/members` returns `401` without cookie.
- `https://whisperssociety.com/api/door` returns `401` without cookie.
- owner login works and staff dashboard loads.

