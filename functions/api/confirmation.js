import { json, methodNotAllowed } from "../_shared/responses.js";
import { TICKET_RELEASE_AT, buildConfirmationUpdateUrl, buildTicketUrl, confirmationCanUpdate, tokenFromValue } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const PRIMARY_COLUMNS = "id,guest_id,guest_name,guest_email,guest_phone,status,confirmation_token,ticket_token,plus_one_name,wants_table_reservation,reservation_confirmed,submitted_at";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,confirmation_token,ticket_token,rsvps!inner(id,guest_name,status,wants_table_reservation,reservation_confirmed,submitted_at)";

export async function onRequestGet({ request, env }) {
  const raw = new URL(request.url).searchParams.get("token");
  if (!raw) return json({ error: "Missing confirmation" }, 400);
  const token = tokenFromValue(raw);
  if (!token) return json({ error: "Confirmation not found" }, 404);

  const primary = await findPrimaryConfirmation(env, token);
  if (primary.error) return primary.error;
  let ticket = primary.ticket;

  if (!ticket) {
    const companion = await findCompanionConfirmation(env, token);
    if (companion.error) return companion.error;
    ticket = companion.ticket;
  }

  if (!ticket) return json({ error: "Confirmation not found" }, 404);
  const canUpdate = confirmationCanUpdate(ticket);

  return json({
    ok: true,
    locked: true,
    ticketReleaseAt: TICKET_RELEASE_AT,
    canUpdate,
    updateUrl: canUpdate ? buildConfirmationUpdateUrl(request.url, token) : null,
    ticket,
    venue: null,
    ticketUrl: ticket.ticket_token ? buildTicketUrl(request.url, ticket.ticket_token) : null,
  });
}

async function findPrimaryConfirmation(env, token) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${PRIMARY_COLUMNS}&confirmation_token=eq.${token}&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load confirmation" }, 502) };
  const [row] = await lookup.response.json();
  if (!row || row.status !== "attending") return { ticket: null };
  const companions = await findCompanions(env, row.id);
  if (companions.error) return { error: companions.error };
  const firstCompanion = companions.rows[0] || null;
  return {
    ticket: {
      holder: "guest",
      status: row.status,
      guest_id: row.guest_id,
      guest_email: row.guest_email || null,
      guest_phone: row.guest_phone || null,
      guest_name: row.guest_name,
      ticket_token: row.ticket_token || null,
      seal_code: null,
      checked_in_at: null,
      bringing: firstCompanion?.guest_name || row.plus_one_name || null,
      brought_by: null,
      table_label: null,
      table_reserved: row.reservation_confirmed === true,
      table_requested: row.wants_table_reservation === true,
      locked: true,
    },
  };
}

async function findCompanions(env, rsvpId) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=id,guest_name&rsvp_id=eq.${encodeURIComponent(rsvpId)}&limit=2`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load confirmation" }, 502) };
  const rows = await lookup.response.json();
  return { rows: Array.isArray(rows) ? rows : [] };
}

async function findCompanionConfirmation(env, token) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&confirmation_token=eq.${token}&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not load confirmation" }, 502) };
  const [row] = await lookup.response.json();
  const primary = Array.isArray(row?.rsvps) ? row.rsvps[0] : row?.rsvps;
  if (!row || primary?.status !== "attending") return { ticket: null };
  return {
    ticket: {
      holder: "companion",
      status: primary.status,
      guest_name: row.guest_name,
      ticket_token: row.ticket_token || null,
      seal_code: null,
      checked_in_at: null,
      bringing: null,
      brought_by: primary.guest_name,
      table_label: null,
      table_reserved: primary.reservation_confirmed === true,
      table_requested: primary.wants_table_reservation === true,
      locked: true,
    },
  };
}

export async function onRequest() {
  return methodNotAllowed();
}
