const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9]{32,40}$/;
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const REDIRECT_TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const EVENT_KEY = "whispers-2026-10-10";
// The brief's unambiguous alphabet: no 0/O, 1/I/L, 5/S, 8/B.
export const SEAL_ALPHABET = "ACDEFGHJKMNPQRTUVWXYZ234679";
const SEAL_PREFIX = "WSP·10·";
const SEAL_LENGTH = 4;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateGuestQuery(q) {
  const query = String(q || "").trim();
  if (query.length < 2) return { query, guests: [] };
  if (query.length > 80) return { error: "Search is too long" };
  return { query };
}

function wordCount(value) {
  return value.split(/\s+/).filter(Boolean).length;
}

export function validateRsvpPayload(body) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid RSVP" };
  }

  if (typeof body.guestName !== "string" || typeof body.status !== "string") {
    return { error: "Invalid RSVP" };
  }

  if (body.guestId != null && (typeof body.guestId !== "string" || body.guestId.length > MAX_NAME)) {
    return { error: "Invalid RSVP" };
  }

  const status = body.status.trim();
  const guestName = body.guestName.trim();

  if (!guestName || !["attending", "declined"].includes(status)) {
    return { error: "Invalid RSVP" };
  }

  if (guestName.length > MAX_NAME) {
    return { error: "Please give a shorter name." };
  }

  const plusOne = status === "attending" ? body.plusOne || null : null;
  if (plusOne) {
    if (typeof plusOne !== "object" || typeof plusOne.name !== "string" || typeof plusOne.email !== "string") {
      return { error: "Invalid RSVP" };
    }

    const name = plusOne.name.trim();
    const email = normalizeEmail(plusOne.email);

    if (name.length > MAX_NAME) {
      return { error: "Please give a shorter name." };
    }

    if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return { error: "Please give a valid email." };
    }
  }

  return { ok: true };
}

export function buildRsvpRow(body, makeId = makeTicketToken, now = () => new Date(), makeSeal = makeSealCode) {
  const status = String(body.status).trim();
  const plusOne = status === "attending" ? body.plusOne || null : null;
  const ticketToken = makeId();

  return {
    event_key: EVENT_KEY,
    guest_id: body.guestId ? String(body.guestId).trim() : ticketToken,
    guest_name: String(body.guestName).trim(),
    status,
    plus_one_name: plusOne ? String(plusOne.name || "").trim() : null,
    plus_one_email: plusOne ? normalizeEmail(plusOne.email) : null,
    seal_code: status === "attending" ? makeSeal() : null,
    ticket_token: ticketToken,
    submitted_at: now().toISOString(),
  };
}

export function buildRsvpUpdate(row, existing) {
  return {
    guest_name: row.guest_name,
    status: row.status,
    plus_one_name: row.plus_one_name,
    plus_one_email: row.plus_one_email,
    seal_code: existing.seal_code || row.seal_code,
    submitted_at: row.submitted_at,
  };
}

export function makeTicketToken(randomId = () => crypto.randomUUID()) {
  return String(randomId()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
}

function secureRandomInt(max) {
  const limit = Math.floor(256 / max) * max;
  const byte = new Uint8Array(1);
  do {
    crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % max;
}

export function makeSealCode(randomInt = secureRandomInt) {
  let code = "";
  for (let i = 0; i < SEAL_LENGTH; i += 1) {
    code += SEAL_ALPHABET[randomInt(SEAL_ALPHABET.length)];
  }
  return `${SEAL_PREFIX}${code}`;
}

export function tokenFromValue(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  let token = raw;
  try {
    const parsed = new URL(raw);
    token = parsed.searchParams.get("token") || parsed.pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    token = raw;
  }

  return TOKEN_RE.test(token) ? token : "";
}

export function isDuplicatePlusOneEmail(pgError) {
  if (!pgError || pgError.code !== "23505") return false;
  return /plus_one_email/.test(String(pgError.message || ""));
}

export function isDuplicateSealCode(pgError) {
  if (!pgError || pgError.code !== "23505") return false;
  return /seal_code/.test(String(pgError.message || ""));
}

export function checkInRedirectPath(token) {
  const value = typeof token === "string" ? token.trim() : "";
  return REDIRECT_TOKEN_RE.test(value) ? `/ticket/${encodeURIComponent(value)}` : "/";
}

export function siteOriginFromRequestUrl(requestUrl) {
  return new URL(requestUrl).origin;
}

export function buildTicketUrl(requestUrl, token) {
  return `${siteOriginFromRequestUrl(requestUrl)}/ticket/${encodeURIComponent(token)}`;
}

export function buildCheckInUrl(requestUrl, token) {
  return `${siteOriginFromRequestUrl(requestUrl)}/api/checkin?token=${encodeURIComponent(token)}`;
}
