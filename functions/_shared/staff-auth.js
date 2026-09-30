import { json } from "./responses.js";
import { supabaseFetch } from "./supabase.js";

export const STAFF_COOKIE = "whispers_staff";
export const STAFF_SESSION_SECONDS = 60 * 60 * 12;

const PASSWORD_ITERATIONS = 100000;
const PASSWORD_ALGO = "PBKDF2";
const HASH_ALGO = "SHA-256";
const ROLES = ["owner", "admin", "door"];

function binaryFromBytes(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return value;
}

function bytesToBase64Url(bytes) {
  const base64 = typeof btoa === "function" ? btoa(binaryFromBytes(bytes)) : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  if (typeof atob === "function") return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Uint8Array(Buffer.from(base64, "base64"));
}

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateStaffUsername(value) {
  const username = normalizeUsername(value);
  return /^[a-z0-9._-]{3,40}$/.test(username) ? username : "";
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

export function buildStaffCookie(token, maxAge = STAFF_SESSION_SECONDS) {
  return `${STAFF_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearStaffCookie() {
  return `${STAFF_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function hashPassword(password, salt = randomBytes(16)) {
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
  const [kind, iterations, saltText] = String(stored || "").split("$");
  if (kind !== "pbkdf2_sha256" || Number(iterations) !== PASSWORD_ITERATIONS || !saltText) return false;
  const derived = await hashPassword(password, base64UrlToBytes(saltText));
  return constantTimeEqual(utf8(derived), utf8(stored));
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest(HASH_ALGO, utf8(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function makeSessionToken() {
  return bytesToBase64Url(randomBytes(32));
}

export function makeTemporaryPassword() {
  return bytesToBase64Url(randomBytes(18));
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

export async function requireStaff(request, env, requiredRole = "door") {
  const token = parseCookies(request.headers.get("Cookie")).whispers_staff;
  if (!token) return { error: json({ error: "Unauthorized" }, 401) };
  const tokenHash = await hashSessionToken(token);
  const now = new Date().toISOString();
  const found = await supabaseFetch(
    env,
    `/rest/v1/staff_sessions?select=id,expires_at,staff_user_id,staff_users(id,username,role,active,created_at,last_login_at)&session_token_hash=eq.${encodeURIComponent(tokenHash)}&expires_at=gt.${encodeURIComponent(now)}&limit=1`
  );
  if (found.error) return found;
  if (!found.response.ok) return { error: json({ error: "Unauthorized" }, 401) };
  const rows = await found.response.json();
  const session = rows[0];
  const user = Array.isArray(session?.staff_users) ? session.staff_users[0] : session?.staff_users;
  if (!user || user.active !== true) return { error: json({ error: "Unauthorized" }, 401) };
  if (!roleAllows(user.role, requiredRole)) return { error: json({ error: "Forbidden" }, 403) };
  supabaseFetch(env, `/rest/v1/staff_sessions?id=eq.${encodeURIComponent(session.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_seen_at: now }),
  }).catch(() => {});
  return { user: safeStaffUser(user), sessionId: session.id };
}
