const PUBLIC_PATHS = new Set([
  "/",
  "/index.html",
  "/api/rsvp",
  "/api/ticket",
  "/api/checkin",
  "/api/door",
  "/api/guests",
  "/api/guest-check",
  "/staff/rose-door-10",
]);

const TICKET_PATH_RE = /^\/ticket\/[^/]+$/;
const HI_PATH_RE = /^\/hi\/[^/]+$/;
const ASSET_PATH_RE = /^\/assets\/[a-z0-9-]+\.png$/;

export function isPublicPath(pathname) {
  if (typeof pathname !== "string") return false;
  return PUBLIC_PATHS.has(pathname) || TICKET_PATH_RE.test(pathname) || HI_PATH_RE.test(pathname) || ASSET_PATH_RE.test(pathname);
}
