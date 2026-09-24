import { json, methodNotAllowed } from "../_shared/responses.js";
import { buildCheckInUrl, buildRsvpRow, buildTicketUrl, normalizeEmail, validateRsvpPayload } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid RSVP" }, 400);
  }

  const valid = validateRsvpPayload(body);
  if (valid.error) return json({ error: valid.error }, 400);

  const row = buildRsvpRow(body);

  if (row.plus_one_email) {
    const email = encodeURIComponent(normalizeEmail(row.plus_one_email));
    const duplicate = await supabaseFetch(
      env,
      `/rest/v1/rsvps?select=id,guest_id&plus_one_email=eq.${email}&guest_id=neq.${encodeURIComponent(row.guest_id)}&limit=1`
    );

    if (duplicate.error) return duplicate.error;
    if (!duplicate.response.ok) return json({ error: "Could not validate plus-one email" }, 502);

    const rows = await duplicate.response.json();
    if (rows.length > 0) {
      return json({ error: "This email is already on the guest list." }, 409);
    }
  }

  const saved = await supabaseFetch(env, "/rest/v1/rsvps?on_conflict=event_key,guest_id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });

  if (saved.error) return saved.error;
  if (!saved.response.ok) {
    return json({ error: "Could not save RSVP" }, 502);
  }

  const rows = await saved.response.json();
  return json({
    ok: true,
    rows,
    ticketToken: row.ticket_token,
    ticketUrl: buildTicketUrl(request.url, row.ticket_token),
    checkInUrl: buildCheckInUrl(request.url, row.ticket_token),
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
