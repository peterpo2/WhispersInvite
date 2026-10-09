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
  assert.match(logout, /export async function onRequestGet/);
  assert.match(logout, /new Response\(null, \{ status: 302, headers: \{ Location: new URL\("\/staff\/rose-door-10", request\.url\)\.toString\(\) \} \}\)/);
  assert.match(logout, /requireStaff/);
  assert.match(logout, /requireStaff\(request, env, "service"\)/);
  assert.match(logout, /clearStaffCookie/);
  assert.match(me, /requireStaff/);
  assert.match(me, /requireStaff\(request, env, "service"\)/);
  assert.match(me, /user/);
});

test("existing staff APIs require staff roles", () => {
  const files = [
    ["functions/api/door.js", "door"],
    ["functions/api/staff/members.js", "door"],
    ["functions/api/staff/checkin-state.js", "door"],
    ["functions/api/staff/reservation-state.js", "door"],
    ["functions/api/staff/invites.js", "door"],
    ["functions/api/staff/invite-send.js", "door"],
    ["functions/api/staff/tables.js", "service"],
    ["functions/api/staff/hall-map.js", "service"],
    ["functions/api/staff/table-assignment.js", "door"],
  ];
  for (const [file, role] of files) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /requireStaff/);
    assert.match(source, new RegExp(`requireStaff\\(request, env, "${role}"\\)`));
  }
});

test("staff shell allows service while non-table operational APIs stay above service", () => {
  const staffPage = readFileSync("functions/staff/rose-door-10.js", "utf8");
  assert.match(staffPage, /requireStaff\(request, env, "service"\)/);
  for (const file of [
    "functions/api/door.js",
    "functions/api/staff/members.js",
    "functions/api/staff/checkin-state.js",
    "functions/api/staff/reservation-state.js",
    "functions/api/staff/invites.js",
    "functions/api/staff/invite-send.js",
    "functions/api/staff/table-assignment.js",
  ]) {
    assert.match(readFileSync(file, "utf8"), /requireStaff\(request, env, "door"\)/);
  }
});

test("tables API lets service read but requires door to update minimum spend", () => {
  const tables = readFileSync("functions/api/staff/tables.js", "utf8");
  assert.match(tables, /export async function onRequestGet/);
  assert.match(tables, /requireStaff\(request, env, "service"\)/);
  assert.match(tables, /minimum_spend_eur/);
  assert.match(tables, /minimumSpendEur/);
  assert.match(tables, /export async function onRequestPatch/);
  assert.match(tables, /requireStaff\(request, env, "door"\)/);
  assert.match(tables, /validateMinimumSpendPayload/);
  assert.match(tables, /staff_tables\?id=eq\./);
});

test("tables API includes contact details for the main people search", () => {
  const tables = readFileSync("functions/api/staff/tables.js", "utf8");
  assert.match(tables, /guest_email/);
  assert.match(tables, /guest_phone/);
  assert.match(tables, /plus_one_email/);
  assert.match(tables, /plus_one_phone/);
  assert.match(tables, /peopleDetails/);
  assert.match(tables, /email: row\.guest_email/);
  assert.match(tables, /phone: row\.guest_phone/);
});

test("tables API returns and updates normalized hall map positions", () => {
  const tables = readFileSync("functions/api/staff/tables.js", "utf8");
  assert.match(tables, /map_x,map_y/);
  assert.match(tables, /mapX:/);
  assert.match(tables, /mapY:/);
  assert.match(tables, /validateTablePositionPayload/);
  assert.match(tables, /map_x: value\.mapX/);
  assert.match(tables, /map_y: value\.mapY/);
  assert.match(tables, /table_map_edited_at: editedAt/);
  assert.match(tables, /tableMapEditedAt: table\.table_map_edited_at \|\| null/);
  assert.match(tables, /tableMapEditedAt: rows\[0\]\.table_map_edited_at/);
  assert.match(tables, /const editedAt = position \? new Date\(\)\.toISOString\(\) : null/);
  assert.doesNotMatch(tables, /select=id,label,capacity/);
  assert.doesNotMatch(tables, /capacity: table\.capacity/);
});

test("owner-only staff user APIs can create, edit, delete and reset generated passwords", () => {
  const users = readFileSync("functions/api/staff/users.js", "utf8");
  const password = readFileSync("functions/api/staff/users/password.js", "utf8");
  assert.match(users, /requireStaff\(request, env, "owner"\)/);
  assert.match(password, /requireStaff\(request, env, "owner"\)/);
  assert.match(users, /safeStaffUser/);
  assert.match(users, /temporaryPassword/);
  assert.match(users, /role = "admin"/);
  assert.match(users, /onRequestDelete/);
  assert.match(users, /username/);
  assert.match(password, /temporaryPassword/);
  assert.match(password, /hashPassword/);
  assert.doesNotMatch(users, /password_hash.*json/);
  assert.doesNotMatch(password, /password_hash.*json/);
});

test("staff owner bootstrap script generates hashed SQL for a supplied username", () => {
  const script = readFileSync("scripts/bootstrap-staff-owner.mjs", "utf8");
  assert.match(script, /hashPassword/);
  assert.match(script, /validateStaffUsername/);
  assert.match(script, /makeTemporaryPassword/);
  assert.match(script, /insert into public\.staff_users/);
  assert.match(script, /role, password_hash/);
  assert.match(script, /owner/);
  assert.doesNotMatch(script, /ppadmin/);
});
