import { json } from "./responses.js";

export function getSupabaseEnv(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { error: json({ error: "Backend is not configured" }, 500) };
  }

  return { url: url.replace(/\/$/, ""), key };
}

export async function supabaseFetch(env, path, init = {}) {
  const config = getSupabaseEnv(env);
  if (config.error) return config;

  const headers = new Headers(init.headers || {});
  headers.set("apikey", config.key);
  headers.set("Authorization", `Bearer ${config.key}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers,
  });

  return { response };
}
