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
  assert.match(logout, /requireStaff/);
  assert.match(logout, /clearStaffCookie/);
  assert.match(me, /requireStaff/);
  assert.match(me, /user/);
});

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
