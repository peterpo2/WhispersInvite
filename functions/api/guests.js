function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function validateGuestQuery(q) {
  const query = String(q || "").trim();
  if (query.length < 2) return { query, guests: [] };
  if (query.length > 80) return { error: "Search is too long" };
  return { query };
}

async function supabaseFetch(env, path, init = {}) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { error: json({ error: "Backend is not configured" }, 500) };
  }

  const headers = new Headers(init.headers || {});
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return {
    response: await fetch(`${url.replace(/\/$/, "")}${path}`, {
      ...init,
      headers,
    }),
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const parsed = validateGuestQuery(url.searchParams.get("q"));

  if (parsed.error) return json({ error: parsed.error }, 400);
  if (parsed.guests) return json({ guests: parsed.guests });

  const filter = encodeURIComponent(`*${parsed.query.replace(/[%*]/g, "")}*`);
  const result = await supabaseFetch(
    env,
    `/rest/v1/guest_list?select=id,name&name=ilike.${filter}&order=name.asc&limit=8`
  );

  if (result.error) return result.error;
  if (!result.response.ok) return json({ error: "Guest search failed" }, 502);

  return json({ guests: await result.response.json() });
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
