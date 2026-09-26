import { json } from "../_shared/responses.js";
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

  return json({ found: false }, 404);
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
