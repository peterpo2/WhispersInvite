const PUBLIC_PATHS = new Set([
  "/",
  "/invite",
  "/menu",
  "/api/rsvp",
  "/api/ticket",
  "/api/checkin",
  "/api/door",
  "/api/guest-check",
  "/api/confirmation",
  "/api/staff/login",
  "/api/staff/logout",
  "/api/staff/me",
  "/api/staff/members",
  "/api/staff/checkin-state",
  "/api/staff/reservation-state",
  "/api/staff/invites",
  "/api/staff/invite-send",
  "/api/staff/tables",
  "/api/staff/table-assignment",
  "/api/staff/users",
  "/api/staff/users/password",
  "/staff/rose-door-10",
]);

const TICKET_PATH_RE = /^\/ticket\/[^/]+$/;
const CONFIRMATION_PATH_RE = /^\/confirmation\/[^/]+$/;
const INVITE_PATH_RE = /^\/invite\/[^/]+$/;
const ASSET_PATH_RE = /^\/assets\/[a-z0-9-]+\.(png|js|ttf|mov|svg)$/;
const PUBLIC_HOSTS = new Set(["whisperssociety.com", "www.whisperssociety.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isPrivateDevHost(host) {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet, index) => !Number.isInteger(octet) || String(octet) !== parts[index] || octet < 0 || octet > 255)) return false;
  return octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

export function isPublicPath(pathname) {
  if (typeof pathname !== "string") return false;
  return PUBLIC_PATHS.has(pathname) || TICKET_PATH_RE.test(pathname) || CONFIRMATION_PATH_RE.test(pathname) || INVITE_PATH_RE.test(pathname) || ASSET_PATH_RE.test(pathname);
}

export function isPublicHost(host) {
  if (typeof host !== "string") return false;
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  if (PUBLIC_HOSTS.has(normalized)) return true;
  const withoutPort = normalized.startsWith("[::1]") ? "[::1]" : normalized.split(":")[0];
  return LOCAL_HOSTS.has(withoutPort) || isPrivateDevHost(withoutPort);
}

export function isSiteLocked(env) {
  const value = String(env?.SITE_LOCKED || "").trim().toLowerCase();
  return value === "1" || value === "true";
}
