import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStaffCookie,
  clearStaffCookie,
  hashPassword,
  isValidRole,
  makeTemporaryPassword,
  parseCookies,
  roleAllows,
  safeStaffUser,
  validateStaffUsername,
  verifyPassword,
} from "../functions/_shared/staff-auth.js";

test("service is a valid read-only role below door", () => {
  assert.equal(isValidRole("service"), true);
  assert.equal(roleAllows("service", "service"), true);
  assert.equal(roleAllows("service", "door"), false);
  assert.equal(roleAllows("service", "admin"), false);
  assert.equal(roleAllows("service", "owner"), false);
  assert.equal(roleAllows("door", "service"), true);
  assert.equal(roleAllows("admin", "service"), true);
  assert.equal(roleAllows("owner", "service"), true);
});

test("staff passwords are hashed and verified without storing plaintext", async () => {
  const hash = await hashPassword("Very Strong Password 123");
  assert.match(hash, /^pbkdf2_sha256\$100000\$/);
  assert.equal(hash.includes("Very Strong Password 123"), false);
  assert.equal(await verifyPassword("Very Strong Password 123", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("staff password verification rejects unsupported legacy iteration counts without throwing", async () => {
  const legacyHash = "pbkdf2_sha256$210000$abcdefghijklmnopqrstuv$abcdefghijklmnopqrstuvabcdefghijklmnopqrstu";
  assert.equal(await verifyPassword("anything", legacyHash), false);
});

test("staff cookies last twelve hours and are secure http-only strict cookies", () => {
  const cookie = buildStaffCookie("abc");
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
    username: "owner",
    role: "owner",
    active: true,
    password_hash: "secret",
    created_at: "2026-09-30",
    last_login_at: null,
  });
  assert.deepEqual(user, {
    id: "u1",
    username: "owner",
    role: "owner",
    active: true,
    createdAt: "2026-09-30",
    lastLoginAt: null,
  });
});

test("staff usernames are normalized and constrained", () => {
  assert.equal(validateStaffUsername("  Organizer.One  "), "organizer.one");
  assert.equal(validateStaffUsername("ab"), "");
  assert.equal(validateStaffUsername("bad name"), "");
  assert.equal(validateStaffUsername("bad@name"), "");
});

test("generated temporary passwords are one-time strong random values", () => {
  const first = makeTemporaryPassword();
  const second = makeTemporaryPassword();
  assert.equal(first.length >= 24, true);
  assert.notEqual(first, second);
});
