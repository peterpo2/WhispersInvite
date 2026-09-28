import { json, methodNotAllowed } from "../_shared/responses.js";
import { EVENT_KEY, TICKET_RELEASE_AT, buildCheckInUrl, buildInviteUrl, buildTicketUrl, companionTicketForToken, isTicketReleasedForRequest, pendingInviteTicket, publicVenue, ticketForToken, tokenFromValue } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const PRIMARY_COLUMNS = "id,guest_name,seal_code,ticket_token,checked_in_at,status,plus_one_name,plus_one_seal_code,plus_one_ticket_token,plus_one_checked_in_at,reservation_confirmed";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,seal_code,ticket_token,checked_in_at,rsvps!inner(id,guest_name,status,event_key,wants_table_reservation,reservation_confirmed)";

export async function onRequestGet({ request, env }) {
  const raw = new URL(request.url).searchParams.get("token");
  if (!raw) return json({ error: "Missing ticket" }, 400);
  const token = tokenFromValue(raw);
  if (!token) return json({ error: "Ticket not found" }, 404);

  const released = isTicketReleasedForRequest(request.url);
  const primary = await findPrimaryTicket(env, token, released);
  if (primary.error) return primary.error;
  let ticket = primary.ticket;

  if (!ticket) {
    const companion = await findCompanionTicket(env, token, released);
    if (companion.error) return companion.error;
    ticket = companion.ticket;
  }

  if (!ticket) {
    const invite = await findPendingInviteTicket(env, token);
    if (invite.error) return invite.error;
    ticket = invite.ticket;
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

  return json({
    ok: true,
    locked: !released || ticket.pending === true,
    ticketReleaseAt: TICKET_RELEASE_AT,
    ticket,
    venue,
    ticketUrl: buildTicketUrl(request.url, token),
    inviteUrl: ticket.pending === true && ticket.invite_id ? buildInviteUrl(request.url, ticket.invite_id) : null,
    checkInUrl: buildCheckInUrl(request.url, token),
  });
}

async function findPendingInviteTicket(env, token) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/guest_list?select=id,name,ticket_token&ticket_token=eq.${token}&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load ticket" }, 502) };
  const [row] = await lookup.response.json();
  return { ticket: pendingInviteTicket(row, token) };
}

async function findPrimaryTicket(env, token, released) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${PRIMARY_COLUMNS}&or=(ticket_token.eq.${token},plus_one_ticket_token.eq.${token})&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load ticket" }, 502) };
  const [row] = await lookup.response.json();
  let ticket = ticketForToken(row, token, { released });
  if (ticket?.holder === "guest" && !ticket.bringing) {
    const companions = await findCompanions(env, row.id);
    if (companions.error) return { error: companions.error };
    const firstCompanion = companions.rows[0] || null;
    if (firstCompanion) ticket = { ...ticket, bringing: firstCompanion.guest_name || null };
  }
  return { ticket };
}

async function findCompanions(env, rsvpId) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=id,guest_name&rsvp_id=eq.${encodeURIComponent(rsvpId)}&limit=2`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load ticket" }, 502) };
  const rows = await lookup.response.json();
  return { rows: Array.isArray(rows) ? rows : [] };
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
  return { ticket };
}

export async function onRequest() {
  return methodNotAllowed();
}
