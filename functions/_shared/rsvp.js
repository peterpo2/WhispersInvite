const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const TOKEN_RE = /^[A-Za-z0-9]{32,40}$/;
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_SEAL_CODE = 32;

export const EVENT_KEY = "whispers-2026-10-10";

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

  const status = body.status.trim();
  const guestName = body.guestName.trim();

  if (!guestName || !["attending", "declined"].includes(status)) {
    return { error: "Invalid RSVP" };
  }

  if (wordCount(guestName) < 2) {
    return { error: "Please give your full name." };
  }

  if (guestName.length > MAX_NAME) {
    return { error: "Please give a shorter name." };
  }

  if (body.sealCode != null && (typeof body.sealCode !== "string" || body.sealCode.trim().length > MAX_SEAL_CODE)) {
    return { error: "Invalid RSVP" };
  }

  const plusOne = status === "attending" ? body.plusOne || null : null;
  if (plusOne) {
    if (typeof plusOne !== "object" || typeof plusOne.name !== "string" || typeof plusOne.email !== "string") {
      return { error: "Invalid RSVP" };
    }

    const name = plusOne.name.trim();
    const email = normalizeEmail(plusOne.email);

    if (wordCount(name) < 2) {
      return { error: "Please give their full name." };
    }

    if (name.length > MAX_NAME) {
      return { error: "Please give a shorter name." };
    }

    if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return { error: "Please give a valid email." };
    }
  }

  return { ok: true };
}

export function buildRsvpRow(body, makeId = makeTicketToken, now = () => new Date()) {
  const status = String(body.status).trim();
  const plusOne = status === "attending" ? body.plusOne || null : null;
  const ticketToken = makeId();

  return {
    event_key: EVENT_KEY,
    guest_id: ticketToken,
    guest_name: String(body.guestName).trim(),
    status,
    plus_one_name: plusOne ? String(plusOne.name || "").trim() : null,
    plus_one_email: plusOne ? normalizeEmail(plusOne.email) : null,
    seal_code: body.sealCode ? String(body.sealCode).trim().slice(0, MAX_SEAL_CODE) : null,
    ticket_token: ticketToken,
    submitted_at: now().toISOString(),
  };
}

export function makeTicketToken(randomId = () => crypto.randomUUID()) {
  return String(randomId()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
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

export function siteOriginFromRequestUrl(requestUrl) {
  return new URL(requestUrl).origin;
}

export function buildTicketUrl(requestUrl, token) {
  return `${siteOriginFromRequestUrl(requestUrl)}/ticket/${encodeURIComponent(token)}`;
}

export function buildCheckInUrl(requestUrl, token) {
  return `${siteOriginFromRequestUrl(requestUrl)}/api/checkin?token=${encodeURIComponent(token)}`;
}
