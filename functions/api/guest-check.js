import { json } from "../_shared/responses.js";
import { buildConfirmationUrl } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

async function findGuest(env, id) {
  const result = await supabaseFetch(env, `/rest/v1/guest_list?id=eq.${encodeURIComponent(id)}&select=id,name&limit=1`);
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: json({ error: "Lookup failed" }, 502) };
  const [row] = await result.response.json();
  return { row };
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length < 4 || token.length > 120) {
    return json({ found: false }, 404);
  }

  const personal = await findGuest(env, token);
  if (personal.error) return personal.error;
  if (personal.row) {
    const rsvp = await findRsvp(env, personal.row.id);
    if (rsvp.error) return rsvp.error;
    const row = rsvp.row;
    return json({
      found: true,
      name: row?.guest_name || personal.row.name,
      id: personal.row.id,
      alreadyRegistered: row?.status === "attending",
      confirmationUrl: row?.status === "attending" && row.confirmation_token ? buildConfirmationUrl(request.url, row.confirmation_token) : null,
    });
  }

  return json({ found: false }, 404);
}

async function findRsvp(env, guestId) {
  const result = await supabaseFetch(env, `/rest/v1/rsvps?guest_id=eq.${encodeURIComponent(guestId)}&select=guest_name,status,confirmation_token&limit=1`);
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: json({ error: "Lookup failed" }, 502) };
  const [row] = await result.response.json();
  return { row: row || null };
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
