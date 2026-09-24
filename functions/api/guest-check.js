import { json } from "../_shared/responses.js";
import { referralBase } from "../_shared/rsvp.js";
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
  if (personal.row) return json({ found: true, name: personal.row.name, id: personal.row.id });

  // "<id>referral": someone invited by that guest. No name is shown; they type their own.
  const base = referralBase(token);
  if (base) {
    const inviter = await findGuest(env, base);
    if (inviter.error) return inviter.error;
    if (inviter.row) return json({ found: true, referral: true });
  }

  return json({ found: false }, 404);
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
