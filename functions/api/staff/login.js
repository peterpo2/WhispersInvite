import { json, methodNotAllowed } from "../../_shared/responses.js";
import { buildStaffCookie, hashPassword, hashSessionToken, makeSessionToken, safeStaffUser, validateStaffUsername, verifyPassword, STAFF_SESSION_SECONDS } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const INVALID = "Invalid username or password.";
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: INVALID }, 401);
  }

  const username = validateStaffUsername(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return json({ error: INVALID }, 401);

  const found = await supabaseFetch(
    env,
    `/rest/v1/staff_users?select=id,username,password_hash,role,active,failed_login_count,locked_until,created_at,last_login_at&username=eq.${encodeURIComponent(username)}&limit=1`
  );
  if (found.error) return found.error;
  if (!found.response.ok) return json({ error: INVALID }, 401);

  const [user] = await found.response.json();
  if (!user || user.active !== true) return json({ error: INVALID }, 401);
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) return json({ error: INVALID }, 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await recordFailure(env, user);
    return json({ error: INVALID }, 401);
  }

  const token = makeSessionToken();
  const tokenHash = await hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STAFF_SESSION_SECONDS * 1000).toISOString();
  const inserted = await supabaseFetch(env, "/rest/v1/staff_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ staff_user_id: user.id, session_token_hash: tokenHash, expires_at: expiresAt, last_seen_at: now.toISOString() }),
  });
  if (inserted.error) return inserted.error;
  if (!inserted.response.ok) return json({ error: "Could not start session" }, 502);

  await supabaseFetch(env, `/rest/v1/staff_users?id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ failed_login_count: 0, locked_until: null, last_login_at: now.toISOString(), updated_at: now.toISOString() }),
  });

  const response = json({ ok: true, user: safeStaffUser(user) });
  response.headers.set("Set-Cookie", buildStaffCookie(token));
  return response;
}

async function recordFailure(env, user) {
  const failed = Number(user.failed_login_count || 0) + 1;
  const patch = { failed_login_count: failed, updated_at: new Date().toISOString() };
  if (failed >= LOCK_AFTER) patch.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
  await supabaseFetch(env, `/rest/v1/staff_users?id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

export { hashPassword };

export async function onRequest() {
  return methodNotAllowed();
}
