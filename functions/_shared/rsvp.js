const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateGuestQuery(q) {
  const query = String(q || "").trim();
  if (query.length < 2) return { query, guests: [] };
  if (query.length > 80) return { error: "Search is too long" };
  return { query };
}

export function validateRsvpPayload(body) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid RSVP" };
  }

  const status = String(body.status || "").trim();
  const guestId = String(body.guestId || "").trim();
  const guestName = String(body.guestName || "").trim();

  if (!guestName || !["attending", "declined"].includes(status)) {
    return { error: "Invalid RSVP" };
  }

  if (guestName.split(/\s+/).filter(Boolean).length < 2) {
    return { error: "Please give your full name." };
  }

  const plusOne = body.plusOne || null;
  if (plusOne) {
    const name = String(plusOne.name || "").trim();
    const email = normalizeEmail(plusOne.email);

    if (name.split(/\s+/).filter(Boolean).length < 2) {
      return { error: "Please give their full name." };
    }

    if (!EMAIL_RE.test(email)) {
      return { error: "Please give a valid email." };
    }
  }

  return { ok: true };
}

export function buildRsvpRow(body, makeId = makeTicketToken) {
  const plusOne = body.plusOne || null;
  const ticketToken = String(body.ticketToken || makeId()).trim();

  return {
    event_key: String(body.event || "whispers-2026-10-10").trim(),
    guest_id: String(body.guestId || ticketToken).trim(),
    guest_name: String(body.guestName).trim(),
    status: String(body.status).trim(),
    plus_one_name: plusOne ? String(plusOne.name || "").trim() : null,
    plus_one_email: plusOne ? normalizeEmail(plusOne.email) : null,
    seal_code: body.sealCode ? String(body.sealCode).trim() : null,
    ticket_token: ticketToken,
    submitted_at: body.submittedAt || new Date().toISOString(),
  };
}

export function makeTicketToken(randomId = () => crypto.randomUUID()) {
  return String(randomId()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
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
