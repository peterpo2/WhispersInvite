const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9]{32,40}$/;
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_PHONE = 40;
const REDIRECT_TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const EVENT_KEY = "whispers-2026-10-10";
export const TICKET_RELEASE_AT = "2026-10-09T18:00:00+03:00";
// The brief's unambiguous alphabet: no 0/O, 1/I/L, 5/S, 8/B.
export const SEAL_ALPHABET = "ACDEFGHJKMNPQRTUVWXYZ234679";
const SEAL_PREFIX = "WSP·10·";
const SEAL_LENGTH = 4;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function nameKey(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function hasFullName(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length >= 2;
}

function validEmail(value) {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= MAX_EMAIL && EMAIL_RE.test(email);
}

function validPhone(value) {
  const phone = normalizePhone(value);
  return phone.length > 0 && phone.length <= MAX_PHONE;
}

export function isTicketReleased(now = new Date()) {
  return now >= new Date(TICKET_RELEASE_AT);
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

  if (body.referral != null) {
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

  if (!hasFullName(guestName)) {
    return { error: "Please give your full name." };
  }

  if (body.wantsTableReservation != null && typeof body.wantsTableReservation !== "boolean") {
    return { error: "Invalid RSVP" };
  }

  const attending = status === "attending";
  if (attending) {
    if (!validEmail(body.guestEmail)) {
      return { error: "Please give a valid email." };
    }
    if (!validPhone(body.guestPhone)) {
      return { error: "Please give your phone." };
    }
  }

  const plusOne = attending ? body.plusOne || null : null;
  if (plusOne) {
    if (typeof plusOne !== "object" || typeof plusOne.name !== "string") {
      return { error: "Invalid RSVP" };
    }

    const name = plusOne.name.trim();
    if (name.length > MAX_NAME) {
      return { error: "Please give a shorter name." };
    }
    if (!hasFullName(name)) {
      return { error: "Please give their full name." };
    }

    if (plusOne.email != null && normalizeEmail(plusOne.email) && !validEmail(plusOne.email)) {
      return { error: "Please give a valid email." };
    }
    if (!validPhone(plusOne.phone)) {
      return { error: "Please give their phone." };
    }
  }

  return { ok: true };
}

export function buildRsvpRow(body, makeId = makeTicketToken, now = () => new Date(), makeSeal = makeSealCode) {
  const status = String(body.status).trim();
  const attending = status === "attending";
  const plusOne = attending ? body.plusOne || null : null;
  const ticketToken = makeId();
  const sealCode = attending ? makeSeal() : null;
  const guestEmail = attending ? normalizeEmail(body.guestEmail) : null;
  const plusOneEmail = plusOne && normalizeEmail(plusOne.email) ? normalizeEmail(plusOne.email) : (plusOne ? guestEmail : null);

  return {
    event_key: EVENT_KEY,
    guest_id: body.guestId ? String(body.guestId).trim() : ticketToken,
    guest_name: String(body.guestName).trim().replace(/\s+/g, " "),
    guest_email: guestEmail,
    guest_phone: attending ? normalizePhone(body.guestPhone) : null,
    status,
    plus_one_name: plusOne ? String(plusOne.name || "").trim().replace(/\s+/g, " ") : null,
    plus_one_email: plusOneEmail,
    plus_one_email_is_fallback: Boolean(plusOne && !normalizeEmail(plusOne.email)),
    plus_one_phone: plusOne ? normalizePhone(plusOne.phone) : null,
    wants_table_reservation: attending ? body.wantsTableReservation === true : false,
    seal_code: sealCode,
    ticket_token: ticketToken,
    plus_one_ticket_token: plusOne ? makeId() : null,
    plus_one_seal_code: plusOne ? makeSeal() : null,
    submitted_at: now().toISOString(),
  };
}

export function buildCompanionRow(row, rsvpId) {
  if (!row || !row.plus_one_name || !row.plus_one_ticket_token) return null;
  return {
    rsvp_id: rsvpId,
    guest_name: row.plus_one_name,
    email: row.plus_one_email,
    email_is_fallback: row.plus_one_email_is_fallback === true,
    phone: row.plus_one_phone,
    ticket_token: row.plus_one_ticket_token,
    seal_code: row.plus_one_seal_code,
  };
}

export function buildRsvpUpdate(row, existing) {
  const keepPlusOne = row.status === "attending" && !row.plus_one_name && Boolean(existing.plus_one_ticket_token);
  const samePlusOne = Boolean(
    row.plus_one_name &&
    existing.plus_one_ticket_token &&
    normalizeEmail(existing.plus_one_email) === row.plus_one_email &&
    nameKey(existing.plus_one_name) === nameKey(row.plus_one_name)
  );
  const patch = {
    guest_name: row.guest_name,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone,
    status: row.status,
    plus_one_name: keepPlusOne ? existing.plus_one_name : row.plus_one_name,
    plus_one_email: keepPlusOne ? existing.plus_one_email : row.plus_one_email,
    plus_one_phone: keepPlusOne ? existing.plus_one_phone : row.plus_one_phone,
    plus_one_email_is_fallback: keepPlusOne ? existing.plus_one_email_is_fallback === true : row.plus_one_email_is_fallback === true,
    wants_table_reservation: row.wants_table_reservation,
    seal_code: existing.seal_code || row.seal_code,
    plus_one_ticket_token: keepPlusOne || samePlusOne ? existing.plus_one_ticket_token : row.plus_one_ticket_token,
    plus_one_seal_code: keepPlusOne || samePlusOne ? existing.plus_one_seal_code || row.plus_one_seal_code : row.plus_one_seal_code,
    submitted_at: row.submitted_at,
  };
  if (!keepPlusOne && !samePlusOne) patch.plus_one_checked_in_at = null;
  return patch;
}

export function ticketForToken(row, token, options = {}) {
  if (!row || row.status !== "attending" || !token) return null;
  const released = options.released ?? true;
  const tableLabel = row.table_label || null;
  if (row.ticket_token === token) {
    return {
      holder: "guest",
      guest_name: row.guest_name,
      seal_code: released ? row.seal_code : null,
      checked_in_at: row.checked_in_at || null,
      bringing: row.plus_one_name || null,
      brought_by: null,
      table_label: released ? tableLabel : null,
      locked: !released,
    };
  }
  if (row.plus_one_ticket_token === token) {
    return {
      holder: "plus_one",
      guest_name: row.plus_one_name,
      seal_code: released ? row.plus_one_seal_code : null,
      checked_in_at: row.plus_one_checked_in_at || null,
      bringing: null,
      brought_by: row.guest_name,
      table_label: released ? tableLabel : null,
      locked: !released,
    };
  }
  return null;
}

export function companionTicketForToken(row, primary, token, options = {}) {
  if (!row || !primary || primary.status !== "attending" || row.ticket_token !== token) return null;
  const released = options.released ?? true;
  return {
    holder: "companion",
    guest_name: row.guest_name,
    seal_code: released ? row.seal_code : null,
    checked_in_at: row.checked_in_at || null,
    bringing: null,
    brought_by: primary.guest_name,
    table_label: released ? primary.table_label || null : null,
    locked: !released,
  };
}

export function doorScans(rows, limit = 80) {
  const scans = [];
  for (const row of rows || []) {
    if (row.checked_in_at) {
      scans.push({ guest_name: row.guest_name, seal_code: row.seal_code, checked_in_at: row.checked_in_at, brought_by: row.brought_by || null });
    }
    if (row.plus_one_checked_in_at) {
      scans.push({ guest_name: row.plus_one_name, seal_code: row.plus_one_seal_code, checked_in_at: row.plus_one_checked_in_at, brought_by: row.guest_name });
    }
  }
  return scans.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)).slice(0, limit);
}

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
