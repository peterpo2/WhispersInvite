import { json, methodNotAllowed } from "../../../_shared/responses.js";
import { hashPassword, makeTemporaryPassword, requireStaff, safeStaffUser } from "../../../_shared/staff-auth.js";
import { supabaseFetch } from "../../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid password reset" }, 400);
  }
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return json({ error: "Invalid password reset" }, 400);

  const temporaryPassword = makeTemporaryPassword();
  const updated = await supabaseFetch(env, `/rest/v1/staff_users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      password_hash: await hashPassword(temporaryPassword),
      failed_login_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not reset password" }, 502);
  const [user] = await updated.response.json();
  if (!user) return json({ error: "Staff user not found" }, 404);
  return json({ ok: true, user: safeStaffUser(user), temporaryPassword });
}

export async function onRequest() {
  return methodNotAllowed();
}
