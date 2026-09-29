import { json, methodNotAllowed } from "../_shared/responses.js";
import { buildRsvpConfirmationEmails, emailConfigFromEnv } from "../_shared/email-content.js";
import { retryAsync } from "../_shared/retry.js";
import { applyInviteToRsvpRow, buildCompanionRow, buildConfirmationUrl, buildRsvpRow, buildTicketUrl, companionMatchesRsvp, isDuplicateSealCode, isRsvpClosed, isTicketReleased, tableReservationForUpdate, validateRsvpPayload, TICKET_RELEASE_AT } from "../_shared/rsvp.js";
import { sendSmtpMail } from "../_shared/smtp.js";
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
  "confirmation_token",
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
  "reservation_confirmed",
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
  if (isRsvpClosed()) return json({ error: "RSVP is closed." }, 409);

  let row = buildRsvpRow(body);
  if (body.guestId) {
    const invite = await findInvite(env, body.guestId);
    if (invite.error) return invite.error;
    row = applyInviteToRsvpRow(row, invite.row);
  }
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
      const emailDelivery = await sendRsvpConfirmation(env, request.url, row);
      return confirmationResponse(request.url, row, emailDelivery);
    }

    if (saved.response.status !== 409) return json({ error: "Could not save RSVP" }, 502);

    const pgError = await saved.response.json().catch(() => null);
    if (!isDuplicateSealCode(pgError) || attempt > MAX_SEAL_CODE_RETRIES) {
      return json({ error: "Could not save RSVP" }, 502);
    }
    row = buildRsvpRow(body);
  }
}

async function findInvite(env, id) {
  const result = await supabaseFetch(
    env,
    `/rest/v1/guest_list?select=id,ticket_token&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  const [row] = await result.response.json();
  return { row: row || null };
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
  if (isTicketReleased()) return json({ error: "Guest-list changes are closed." }, 409);

  const patch = {
    guest_name: row.guest_name,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone,
    status: row.status,
    wants_table_reservation: tableReservationForUpdate(row, existing),
    plus_one_name: null,
    plus_one_email: null,
    plus_one_phone: null,
    plus_one_email_is_fallback: false,
    plus_one_ticket_token: null,
    plus_one_seal_code: null,
    plus_one_checked_in_at: null,
    submitted_at: row.submitted_at,
  };

  if (!existing.confirmation_token) patch.confirmation_token = row.confirmation_token;
  if (row.status === "attending" && !existing.seal_code) patch.seal_code = row.seal_code;

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

  const companions = await findCompanions(env, existing.id);
  if (companions.error) return companions.error;
  const synced = await syncCompanion(env, existing.id, row, companions.rows);
  if (synced.error) return synced.error;

  const responseRow = {
    ...row,
    wants_table_reservation: rows[0].wants_table_reservation === true,
    confirmation_token: rows[0].confirmation_token || existing.confirmation_token || row.confirmation_token,
    ticket_token: rows[0].ticket_token || existing.ticket_token,
  };
  const emailDelivery = await sendRsvpConfirmation(env, requestUrl, responseRow);
  return confirmationResponse(requestUrl, responseRow, emailDelivery);
}

async function findCompanions(env, rsvpId) {
  const result = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=id,guest_name,email,email_is_fallback,phone,confirmation_token,ticket_token,seal_code&rsvp_id=eq.${encodeURIComponent(rsvpId)}&order=created_at.desc&limit=10`
  );
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  const rows = await result.response.json();
  return { rows: Array.isArray(rows) ? rows : [] };
}

async function syncCompanion(env, rsvpId, row, companions) {
  const latest = companions[0] || null;
  const stale = companions.slice(1);
  if (stale.length) {
    const removed = await deleteCompanions(env, stale.map((item) => item.id));
    if (removed.error) return removed;
  }

  if (!row.plus_one_name) {
    if (!latest) return { ok: true };
    return deleteCompanions(env, [latest.id]);
  }

  if (!latest) return insertCompanion(env, rsvpId, row);

  if (companionMatchesRsvp(latest, row)) {
    row.plus_one_confirmation_token = latest.confirmation_token || row.plus_one_confirmation_token;
    row.plus_one_ticket_token = latest.ticket_token || row.plus_one_ticket_token;
    row.plus_one_seal_code = latest.seal_code || row.plus_one_seal_code;
  }

  const companion = buildCompanionRow(row, rsvpId);
  const updated = await supabaseFetch(env, `/rest/v1/rsvp_companions?id=eq.${encodeURIComponent(latest.id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ ...companion, checked_in_at: null, updated_at: row.submitted_at }),
  });
  if (updated.error) return { error: updated.error };
  if (!updated.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  return { ok: true };
}

async function deleteCompanions(env, ids) {
  const values = ids.map((id) => String(id).replaceAll(",", "")).filter(Boolean);
  if (!values.length) return { ok: true };
  const removed = await supabaseFetch(env, `/rest/v1/rsvp_companions?id=in.(${values.join(",")})`, {
    method: "DELETE",
    headers: {
      Prefer: "return=minimal",
    },
  });
  if (removed.error) return { error: removed.error };
  if (!removed.response.ok) return { error: json({ error: "Could not save RSVP" }, 502) };
  return { ok: true };
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

async function sendRsvpConfirmation(env, requestUrl, row) {
  if (row.status !== "attending") return { attempted: false, sent: 0 };
  const config = emailConfigFromEnv(env);
  if (config.error) return { attempted: false, sent: 0, error: config.error };
  const emails = buildRsvpConfirmationEmails({
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    plusOneName: row.plus_one_name,
    plusOneEmail: row.plus_one_email,
    confirmationLink: row.confirmation_token ? buildConfirmationUrl(requestUrl, row.confirmation_token) : "",
    plusOneConfirmationLink: row.plus_one_confirmation_token ? buildConfirmationUrl(requestUrl, row.plus_one_confirmation_token) : "",
    wantsTableReservation: row.wants_table_reservation === true,
    config,
  });
  let sent = 0;
  for (const email of emails) {
    try {
      await retryAsync(() => sendSmtpMail(config, email), { attempts: 2, delayMs: 350 });
      sent += 1;
    } catch (error) {
      return { attempted: true, sent, error: `Could not send RSVP confirmation email: ${String(error?.message || error)}` };
    }
  }
  return { attempted: emails.length > 0, sent };
}

function confirmationResponse(requestUrl, row, emailDelivery = { attempted: false, sent: 0 }) {
  const attending = row.status === "attending";
  return json({
    ok: true,
    status: row.status,
    guestName: row.guest_name,
    plusOneName: attending ? row.plus_one_name || null : null,
    addedGuestNames: attending && row.plus_one_name ? [row.plus_one_name] : [],
    wantsTableReservation: attending ? row.wants_table_reservation === true : false,
    confirmationToken: attending ? row.confirmation_token : null,
    confirmationUrl: attending && row.confirmation_token ? buildConfirmationUrl(requestUrl, row.confirmation_token) : null,
    ticketToken: attending ? row.ticket_token : null,
    ticketUrl: attending && row.ticket_token ? buildTicketUrl(requestUrl, row.ticket_token) : null,
    plusOneTicketToken: attending ? row.plus_one_ticket_token || null : null,
    plusOneTicketUrl: attending && row.plus_one_ticket_token ? buildTicketUrl(requestUrl, row.plus_one_ticket_token) : null,
    ticketReleaseAt: TICKET_RELEASE_AT,
    emailDelivery,
  });
}

function primaryRsvpRow(row) {
  return {
    ...row,
    plus_one_name: null,
    plus_one_email: null,
    plus_one_phone: null,
    plus_one_email_is_fallback: false,
    plus_one_confirmation_token: undefined,
    plus_one_ticket_token: null,
    plus_one_seal_code: null,
  };
}

export async function onRequest() {
  return methodNotAllowed();
}
