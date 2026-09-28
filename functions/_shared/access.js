const PUBLIC_PATHS = new Set([
  "/",
  "/index.html",
  "/api/rsvp",
  "/api/ticket",
  "/api/checkin",
  "/api/door",
  "/api/guest-check",
  "/api/confirmation",
  "/api/staff/members",
  "/api/staff/checkin-state",
  "/api/staff/reservation-state",
  "/api/staff/invites",
  "/api/staff/invite-send",
  "/api/staff/tables",
  "/api/staff/table-assignment",
  "/staff/rose-door-10",
]);

const TICKET_PATH_RE = /^\/ticket\/[^/]+$/;
const HI_PATH_RE = /^\/hi\/[^/]+$/;
const INVITE_PATH_RE = /^\/invite\/[^/]+$/;
const ASSET_PATH_RE = /^\/assets\/[a-z0-9-]+\.(png|js)$/;
const PUBLIC_HOSTS = new Set(["whisperssociety.com", "www.whisperssociety.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isPublicPath(pathname) {
  if (typeof pathname !== "string") return false;
  return PUBLIC_PATHS.has(pathname) || TICKET_PATH_RE.test(pathname) || HI_PATH_RE.test(pathname) || INVITE_PATH_RE.test(pathname) || ASSET_PATH_RE.test(pathname);
}

export function isPublicHost(host) {
  if (typeof host !== "string") return false;
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  if (PUBLIC_HOSTS.has(normalized)) return true;
  const withoutPort = normalized.startsWith("[::1]") ? "[::1]" : normalized.split(":")[0];
  return LOCAL_HOSTS.has(withoutPort);
}

export function isSiteLocked(env) {
  const value = String(env?.SITE_LOCKED || "").trim().toLowerCase();
  return value === "1" || value === "true";
}
