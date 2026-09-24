import { json } from "../_shared/responses.js";
import { supabaseFetch } from "../_shared/supabase.js";

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || token.length < 4 || token.length > 120) {
    return json({ found: false }, 404);
  }

  const result = await supabaseFetch(
    env,
    `/rest/v1/guest_list?id=eq.${encodeURIComponent(token)}&select=id,name&limit=1`
  );
  if (result.error) return result.error;
  if (!result.response.ok) return json({ error: "Lookup failed" }, 502);

  const rows = await result.response.json();
  if (!rows.length) return json({ found: false }, 404);

  return json({ found: true, name: rows[0].name, id: rows[0].id });
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
