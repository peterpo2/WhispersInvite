import { json, methodNotAllowed } from "../_shared/responses.js";
import { buildCheckInUrl } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return json({ error: "Missing ticket" }, 400);

  const ticket = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=guest_name,plus_one_name,seal_code,ticket_token,checked_in_at,status&ticket_token=eq.${encodeURIComponent(token)}&limit=1`
  );

  if (ticket.error) return ticket.error;
  if (!ticket.response.ok) return json({ error: "Could not load ticket" }, 502);

  const rows = await ticket.response.json();
  if (!rows.length || rows[0].status !== "attending") return json({ error: "Ticket not found" }, 404);

  return json({
    ok: true,
    ticket: rows[0],
    checkInUrl: buildCheckInUrl(request.url, token),
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
