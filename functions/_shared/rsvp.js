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
  const sealCode = status === "attending" ? makeSeal() : null;

  return {
    event_key: EVENT_KEY,
    guest_id: body.guestId ? String(body.guestId).trim() : ticketToken,
    guest_name: String(body.guestName).trim(),
    status,
    plus_one_name: plusOne ? String(plusOne.name || "").trim() : null,
    plus_one_email: plusOne ? normalizeEmail(plusOne.email) : null,
    seal_code: sealCode,
    ticket_token: ticketToken,
    plus_one_ticket_token: plusOne ? makeId() : null,
    plus_one_seal_code: plusOne ? makeSeal() : null,
    submitted_at: now().toISOString(),
  };
}

// The PATCH for a repeat RSVP from the same invitation. The guest keeps their ticket.
// The plus-one keeps theirs only if it is the same person (same email); a new person
// gets a new ticket, and the old one stops working.
export function buildRsvpUpdate(row, existing) {
  const samePlusOne = Boolean(
    row.plus_one_email &&
    existing.plus_one_ticket_token &&
    normalizeEmail(existing.plus_one_email) === row.plus_one_email
  );
  const patch = {
    guest_name: row.guest_name,
    status: row.status,
    plus_one_name: row.plus_one_name,
    plus_one_email: row.plus_one_email,
    seal_code: existing.seal_code || row.seal_code,
    plus_one_ticket_token: samePlusOne ? existing.plus_one_ticket_token : row.plus_one_ticket_token,
    plus_one_seal_code: samePlusOne ? existing.plus_one_seal_code || row.plus_one_seal_code : row.plus_one_seal_code,
    submitted_at: row.submitted_at,
  };
  if (!samePlusOne) patch.plus_one_checked_in_at = null;
  return patch;
}

// One RSVP row holds up to two tickets. Return the one this token opens, for its holder.
export function ticketForToken(row, token) {
  if (!row || row.status !== "attending" || !token) return null;
  if (row.ticket_token === token) {
    return {
      holder: "guest",
      guest_name: row.guest_name,
      seal_code: row.seal_code,
      checked_in_at: row.checked_in_at || null,
      bringing: row.plus_one_name || null,
      brought_by: null,
    };
  }
  if (row.plus_one_ticket_token === token) {
    return {
      holder: "plus_one",
      guest_name: row.plus_one_name,
      seal_code: row.plus_one_seal_code,
      checked_in_at: row.plus_one_checked_in_at || null,
      bringing: null,
      brought_by: row.guest_name,
    };
  }
  return null;
}

export function doorScans(rows, limit = 80) {
  const scans = [];
  for (const row of rows || []) {
    if (row.checked_in_at) {
      scans.push({ guest_name: row.guest_name, seal_code: row.seal_code, checked_in_at: row.checked_in_at, brought_by: null });
    }
    if (row.plus_one_checked_in_at) {
      scans.push({ guest_name: row.plus_one_name, seal_code: row.plus_one_seal_code, checked_in_at: row.plus_one_checked_in_at, brought_by: row.guest_name });
    }
  }
  return scans.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)).slice(0, limit);
}

// The address is secret until it is set in event_details and its reveal time has passed.
export function publicVenue(details, now = new Date()) {
  if (!details || (!details.venue_name && !details.venue_address)) return null;
  if (details.reveal_at && now < new Date(details.reveal_at)) return null;
  const mapUrl = typeof details.map_url === "string" && /^https:\/\//i.test(details.map_url) ? details.map_url : null;
  return { name: details.venue_name || null, address: details.venue_address || null, mapUrl };
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
