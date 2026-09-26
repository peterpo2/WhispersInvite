import { json, methodNotAllowed } from "../_shared/responses.js";
import { buildCompanionRow, buildRsvpRow, isDuplicateSealCode, normalizeEmail, nameKey, validateRsvpPayload, TICKET_RELEASE_AT } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const ALREADY_INSIDE = "This invitation has already been used at the door.";
const MAX_SEAL_CODE_RETRIES = 3;

const LOOKUP_COLUMNS = [
  "id",
  "event_key",
  "guest_id",
  "guest_name",
  "guest_email",
  "guest_phone",
  "status",
  "ticket_token",
  "seal_code",
  "checked_in_at",
  "plus_one_name",
  "plus_one_email",
  "plus_one_phone",
  "plus_one_email_is_fallback",
  "plus_one_ticket_token",
  "plus_one_seal_code",
  "plus_one_checked_in_at",
  "wants_table_reservation",
].join(",");

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid RSVP" }, 400);
  }

  const valid = validateRsvpPayload(body);
  if (valid.error) return json({ error: valid.error }, 400);

  let row = buildRsvpRow(body);
  const existing = await findExistingRsvp(env, row);
  if (existing.error) return existing.error;
  if (existing.row) return updateExistingRsvp(env, request.url, row, existing.row);

  for (let attempt = 1; ; attempt += 1) {
    const saved = await supabaseFetch(env, "/rest/v1/rsvps", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(primaryRsvpRow(row)),
    });

    if (saved.error) return saved.error;
    if (saved.response.ok) {
      const [inserted] = await saved.response.json();
      if (row.plus_one_name) {
        const insertedCompanion = await insertCompanion(env, inserted.id, row);
        if (insertedCompanion.error) return insertedCompanion.error;
      }
      return confirmationResponse(row.status, row.guest_name, row.plus_one_name, row.wants_table_reservation);
    }

    if (saved.response.status !== 409) return json({ error: "Could not save RSVP" }, 502);

    const pgError = await saved.response.json().catch(() => null);
    if (!isDuplicateSealCode(pgError) || attempt > MAX_SEAL_CODE_RETRIES) {
      return json({ error: "Could not save RSVP" }, 502);
    }
    row = buildRsvpRow(body);
  }
}

async function findExistingRsvp(env, row) {
  const byGuestId = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${LOOKUP_COLUMNS}&event_key=eq.${encodeURIComponent(row.event_key)}&guest_id=eq.${encodeURIComponent(row.guest_id)}&limit=1`
  );
  if (byGuestId.error) return { error: byGuestId.error };
  if (!byGuestId.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  const [guestIdMatch] = await byGuestId.response.json();
  if (guestIdMatch) return { row: guestIdMatch };

  if (!row.guest_email || !row.guest_phone) return { row: null };
  const byContact = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${LOOKUP_COLUMNS}&event_key=eq.${encodeURIComponent(row.event_key)}&guest_email=eq.${encodeURIComponent(row.guest_email)}&guest_phone=eq.${encodeURIComponent(row.guest_phone)}&limit=1`
  );
  if (byContact.error) return { error: byContact.error };
  if (!byContact.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  const [contactMatch] = await byContact.response.json();
  return { row: contactMatch || null };
}

async function updateExistingRsvp(env, requestUrl, row, existing) {
  if (existing.checked_in_at) return json({ error: ALREADY_INSIDE }, 409);

  const patch = {
    guest_name: row.guest_name,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone,
    status: row.status,
    wants_table_reservation: row.wants_table_reservation,
    submitted_at: row.submitted_at,
  };

  if (row.status === "attending" && !existing.seal_code) patch.seal_code = row.seal_code;
  if (row.status === "declined") {
    patch.plus_one_name = null;
    patch.plus_one_email = null;
    patch.plus_one_phone = null;
    patch.plus_one_email_is_fallback = false;
    patch.plus_one_ticket_token = null;
    patch.plus_one_seal_code = null;
    patch.plus_one_checked_in_at = null;
  }

  const updated = await supabaseFetch(env, `/rest/v1/rsvps?id=eq.${encodeURIComponent(existing.id)}&checked_in_at=is.null`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not save RSVP" }, 502);

  const rows = await updated.response.json();
  if (!rows.length) return json({ error: ALREADY_INSIDE }, 409);

  if (row.plus_one_name) {
    const duplicate = await findDuplicateCompanion(env, existing.id, row);
    if (duplicate.error) return duplicate.error;
    if (!duplicate.found) {
      const inserted = await insertCompanion(env, existing.id, row);
      if (inserted.error) return inserted.error;
    }
  }

  return confirmationResponse(row.status, row.guest_name, row.plus_one_name, row.wants_table_reservation);
}

async function findDuplicateCompanion(env, rsvpId, row) {
  const path = row.plus_one_email_is_fallback
    ? `/rest/v1/rsvp_companions?select=id&rsvp_id=eq.${encodeURIComponent(rsvpId)}&guest_name=eq.${encodeURIComponent(row.plus_one_name)}&phone=eq.${encodeURIComponent(row.plus_one_phone)}&limit=1`
    : `/rest/v1/rsvp_companions?select=id&rsvp_id=eq.${encodeURIComponent(rsvpId)}&email=eq.${encodeURIComponent(normalizeEmail(row.plus_one_email))}&email_is_fallback=eq.false&limit=1`;
  const result = await supabaseFetch(env, path);
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  const rows = await result.response.json();
  if (rows.length > 0) return { found: true };

  const byName = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=id,guest_name,phone&rsvp_id=eq.${encodeURIComponent(rsvpId)}&phone=eq.${encodeURIComponent(row.plus_one_phone)}`
  );
  if (byName.error) return { error: byName.error };
  if (!byName.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  const samePhoneRows = await byName.response.json();
  return { found: samePhoneRows.some((item) => nameKey(item.guest_name) === nameKey(row.plus_one_name)) };
}

async function insertCompanion(env, rsvpId, row) {
  const companion = buildCompanionRow(row, rsvpId);
  if (!companion) return { ok: true };
  const inserted = await supabaseFetch(env, "/rest/v1/rsvp_companions", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(companion),
  });
  if (inserted.error) return { error: inserted.error };
  if (!inserted.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  return { ok: true };
}

function confirmationResponse(status, guestName, plusOneName, wantsTableReservation) {
  return json({
    ok: true,
    status,
    guestName,
    plusOneName: status === "attending" ? plusOneName || null : null,
    addedGuestNames: status === "attending" && plusOneName ? [plusOneName] : [],
    wantsTableReservation: status === "attending" ? wantsTableReservation === true : false,
    ticketReleaseAt: TICKET_RELEASE_AT,
  });
}

function primaryRsvpRow(row) {
  return {
    ...row,
    plus_one_name: null,
    plus_one_email: null,
    plus_one_phone: null,
    plus_one_email_is_fallback: false,
    plus_one_ticket_token: null,
    plus_one_seal_code: null,
  };
}

export async function onRequest() {
  return methodNotAllowed();
}
