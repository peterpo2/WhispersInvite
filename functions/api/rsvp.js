import { json, methodNotAllowed } from "../_shared/responses.js";
import { buildCheckInUrl, buildRsvpRow, buildTicketUrl, validateRsvpPayload } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const DUPLICATE_EMAIL = "This email is already on the guest list.";

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
    const duplicate = await supabaseFetch(
      env,
      `/rest/v1/rsvps?select=id&event_key=eq.${encodeURIComponent(row.event_key)}&status=eq.attending&plus_one_email=eq.${encodeURIComponent(row.plus_one_email)}&limit=1`
    );

    if (duplicate.error) return duplicate.error;
    if (!duplicate.response.ok) return json({ error: "Could not validate plus-one email" }, 502);

    const rows = await duplicate.response.json();
    if (rows.length > 0) {
      return json({ error: DUPLICATE_EMAIL }, 409);
    }
  }

  const saved = await supabaseFetch(env, "/rest/v1/rsvps", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (saved.error) return saved.error;
  if (saved.response.status === 409) return json({ error: DUPLICATE_EMAIL }, 409);
  if (!saved.response.ok) return json({ error: "Could not save RSVP" }, 502);

  return json({
    ok: true,
    ticketToken: row.ticket_token,
    ticketUrl: buildTicketUrl(request.url, row.ticket_token),
    checkInUrl: buildCheckInUrl(request.url, row.ticket_token),
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
