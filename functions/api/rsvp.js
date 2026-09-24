import { json, methodNotAllowed } from "../_shared/responses.js";
import { buildCheckInUrl, buildRsvpRow, buildRsvpUpdate, buildTicketUrl, isDuplicatePlusOneEmail, isDuplicateSealCode, validateRsvpPayload } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const DUPLICATE_EMAIL = "This email is already on the guest list.";
const ALREADY_INSIDE = "This invitation has already been used at the door.";
const MAX_SEAL_CODE_RETRIES = 3;

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
  const guestFilter = `event_key=eq.${encodeURIComponent(row.event_key)}&guest_id=eq.${encodeURIComponent(row.guest_id)}`;

  if (row.plus_one_email) {
    const duplicate = await supabaseFetch(
      env,
      `/rest/v1/rsvps?select=id&event_key=eq.${encodeURIComponent(row.event_key)}&status=eq.attending&plus_one_email=eq.${encodeURIComponent(row.plus_one_email)}&guest_id=neq.${encodeURIComponent(row.guest_id)}&limit=1`
    );

    if (duplicate.error) return duplicate.error;
    if (!duplicate.response.ok) return json({ error: "Could not validate plus-one email" }, 502);

    const rows = await duplicate.response.json();
    if (rows.length > 0) {
      return json({ error: DUPLICATE_EMAIL }, 409);
    }
  }

  if (body.guestId) {
    const lookup = await supabaseFetch(env, `/rest/v1/rsvps?select=ticket_token,seal_code,checked_in_at,plus_one_email,plus_one_ticket_token,plus_one_seal_code,plus_one_checked_in_at&${guestFilter}&limit=1`);
    if (lookup.error) return lookup.error;
    if (!lookup.response.ok) return json({ error: "Could not save RSVP" }, 502);

    const [existing] = await lookup.response.json();
    if (existing) {
      if (existing.checked_in_at) return json({ error: ALREADY_INSIDE }, 409);

      const patch = buildRsvpUpdate(row, existing);
      if (existing.plus_one_checked_in_at && patch.plus_one_ticket_token !== existing.plus_one_ticket_token) {
        return json({ error: ALREADY_INSIDE }, 409);
      }
      const updated = await supabaseFetch(env, `/rest/v1/rsvps?${guestFilter}&checked_in_at=is.null`, {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify(patch),
      });

      if (updated.error) return updated.error;
      if (!updated.response.ok) {
        const pgError = await updated.response.json().catch(() => null);
        if (isDuplicatePlusOneEmail(pgError)) return json({ error: DUPLICATE_EMAIL }, 409);
        return json({ error: "Could not save RSVP" }, 502);
      }

      const rows = await updated.response.json();
      if (!rows.length) return json({ error: ALREADY_INSIDE }, 409);

      return ticketResponse(request.url, existing.ticket_token, patch.seal_code, patch.plus_one_ticket_token, patch.plus_one_seal_code);
    }
  }

  for (let attempt = 1; ; attempt += 1) {
    const saved = await supabaseFetch(env, "/rest/v1/rsvps", {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (saved.error) return saved.error;
    if (saved.response.ok) break;
    if (saved.response.status !== 409) return json({ error: "Could not save RSVP" }, 502);

    const pgError = await saved.response.json().catch(() => null);
    if (isDuplicatePlusOneEmail(pgError)) return json({ error: DUPLICATE_EMAIL }, 409);
    if (!isDuplicateSealCode(pgError) || attempt > MAX_SEAL_CODE_RETRIES) {
      return json({ error: "Could not save RSVP" }, 502);
    }
    row = buildRsvpRow(body);
  }

  return ticketResponse(request.url, row.ticket_token, row.seal_code, row.plus_one_ticket_token, row.plus_one_seal_code);
}

function ticketResponse(requestUrl, ticketToken, sealCode, plusOneTicketToken, plusOneSealCode) {
  return json({
    ok: true,
    ticketToken,
    sealCode,
    ticketUrl: buildTicketUrl(requestUrl, ticketToken),
    checkInUrl: buildCheckInUrl(requestUrl, ticketToken),
    plusOneTicketToken: plusOneTicketToken || null,
    plusOneSealCode: plusOneSealCode || null,
    plusOneTicketUrl: plusOneTicketToken ? buildTicketUrl(requestUrl, plusOneTicketToken) : null,
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
