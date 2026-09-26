import { json, methodNotAllowed } from "../_shared/responses.js";
import { EVENT_KEY, TICKET_RELEASE_AT, buildCheckInUrl, buildTicketUrl, companionTicketForToken, isTicketReleased, publicVenue, ticketForToken, tokenFromValue } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const PRIMARY_COLUMNS = "id,guest_name,seal_code,ticket_token,checked_in_at,status,plus_one_name,plus_one_seal_code,plus_one_ticket_token,plus_one_checked_in_at";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,seal_code,ticket_token,checked_in_at,rsvps!inner(id,guest_name,status,event_key,wants_table_reservation)";

export async function onRequestGet({ request, env }) {
  const raw = new URL(request.url).searchParams.get("token");
  if (!raw) return json({ error: "Missing ticket" }, 400);
  const token = tokenFromValue(raw);
  if (!token) return json({ error: "Ticket not found" }, 404);

  const released = isTicketReleased();
  const primary = await findPrimaryTicket(env, token, released);
  if (primary.error) return primary.error;
  let ticket = primary.ticket;
  let rsvpId = primary.rsvpId;

  if (!ticket) {
    const companion = await findCompanionTicket(env, token, released);
    if (companion.error) return companion.error;
    ticket = companion.ticket;
    rsvpId = companion.rsvpId;
  }

  if (!ticket) return json({ error: "Ticket not found" }, 404);

  let venue = null;
  if (released) {
    const details = await supabaseFetch(
      env,
      `/rest/v1/event_details?select=venue_name,venue_address,map_url,reveal_at&event_key=eq.${encodeURIComponent(EVENT_KEY)}&limit=1`
    );
    if (!details.error && details.response.ok) {
      const [row] = await details.response.json().catch(() => []);
      venue = publicVenue(row);
    }
  }

  if (released && rsvpId) {
    const table = await tableLabel(env, rsvpId);
    if (table) ticket.table_label = table;
  }

  return json({
    ok: true,
    locked: !released,
    ticketReleaseAt: TICKET_RELEASE_AT,
    ticket,
    venue,
    ticketUrl: buildTicketUrl(request.url, token),
    checkInUrl: buildCheckInUrl(request.url, token),
  });
}

async function findPrimaryTicket(env, token, released) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${PRIMARY_COLUMNS}&or=(ticket_token.eq.${token},plus_one_ticket_token.eq.${token})&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load ticket" }, 502) };
  const [row] = await lookup.response.json();
  const ticket = ticketForToken(row, token, { released });
  return { ticket, rsvpId: row?.id || null };
}

async function findCompanionTicket(env, token, released) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&ticket_token=eq.${token}&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load ticket" }, 502) };
  const [row] = await lookup.response.json();
  const primary = Array.isArray(row?.rsvps) ? row.rsvps[0] : row?.rsvps;
  const ticket = companionTicketForToken(row, primary, token, { released });
  return { ticket, rsvpId: row?.rsvp_id || null };
}

async function tableLabel(env, rsvpId) {
  const result = await supabaseFetch(
    env,
    `/rest/v1/staff_table_assignments?select=staff_tables(label)&event_key=eq.${encodeURIComponent(EVENT_KEY)}&rsvp_id=eq.${encodeURIComponent(rsvpId)}&limit=1`
  );
  if (result.error || !result.response.ok) return null;
  const [row] = await result.response.json().catch(() => []);
  const table = Array.isArray(row?.staff_tables) ? row.staff_tables[0] : row?.staff_tables;
  return table?.label || null;
}

export async function onRequest() {
  return methodNotAllowed();
}
