import { json, methodNotAllowed } from "../_shared/responses.js";
import { EVENT_KEY, buildCheckInUrl, buildTicketUrl, publicVenue, ticketForToken, tokenFromValue } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const TICKET_COLUMNS = "guest_name,seal_code,ticket_token,checked_in_at,status,plus_one_name,plus_one_seal_code,plus_one_ticket_token,plus_one_checked_in_at";

export async function onRequestGet({ request, env }) {
  const raw = new URL(request.url).searchParams.get("token");
  if (!raw) return json({ error: "Missing ticket" }, 400);
  const token = tokenFromValue(raw);
  if (!token) return json({ error: "Ticket not found" }, 404);

  // tokenFromValue only lets through [A-Za-z0-9], so the token is safe inside or=(...).
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${TICKET_COLUMNS}&or=(ticket_token.eq.${token},plus_one_ticket_token.eq.${token})&limit=1`
  );

  if (lookup.error) return lookup.error;
  if (!lookup.response.ok) return json({ error: "Could not load ticket" }, 502);

  const rows = await lookup.response.json();
  const ticket = ticketForToken(rows[0], token);
  if (!ticket) return json({ error: "Ticket not found" }, 404);

  // The venue is optional: a missing event_details row or table just means "not announced yet".
  let venue = null;
  const details = await supabaseFetch(
    env,
    `/rest/v1/event_details?select=venue_name,venue_address,map_url,reveal_at&event_key=eq.${encodeURIComponent(EVENT_KEY)}&limit=1`
  );
  if (!details.error && details.response.ok) {
    const [row] = await details.response.json().catch(() => []);
    venue = publicVenue(row);
  }

  return json({
    ok: true,
    ticket,
    venue,
    ticketUrl: buildTicketUrl(request.url, token),
    checkInUrl: buildCheckInUrl(request.url, token),
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
