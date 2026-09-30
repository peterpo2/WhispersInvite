import { json, methodNotAllowed } from "../../_shared/responses.js";
import { hashPassword, isValidRole, makeTemporaryPassword, requireStaff, safeStaffUser, validateStaffUsername } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const USER_COLUMNS = "id,username,role,active,created_at,last_login_at";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;
  const listed = await supabaseFetch(env, `/rest/v1/staff_users?select=${USER_COLUMNS}&order=username.asc`);
  if (listed.error) return listed.error;
  if (!listed.response.ok) return json({ error: "Could not load staff users" }, 502);
  return json({ ok: true, users: (await listed.response.json()).map(safeStaffUser) });
}

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid staff user" }, 400);
  }

  const username = validateStaffUsername(body?.username);
  let role = "admin";
  if (typeof body?.role === "string" && body.role.trim()) role = body.role.trim();
  if (!username || !isValidRole(role)) return json({ error: "Invalid staff user" }, 400);

  const temporaryPassword = makeTemporaryPassword();
  const saved = await supabaseFetch(env, "/rest/v1/staff_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ username, role, password_hash: await hashPassword(temporaryPassword) }),
  });
  if (saved.error) return saved.error;
  if (saved.response.status === 409) return json({ error: "Username already exists" }, 409);
  if (!saved.response.ok) return json({ error: "Could not create staff user" }, 502);
  const [user] = await saved.response.json();
  return json({ ok: true, user: safeStaffUser(user), temporaryPassword });
}

export async function onRequestPatch({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid staff user" }, 400);
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return json({ error: "Invalid staff user" }, 400);
  const patch = { updated_at: new Date().toISOString() };
  if (Object.hasOwn(body, "username")) {
    const username = validateStaffUsername(body.username);
    if (!username) return json({ error: "Invalid username" }, 400);
    patch.username = username;
  }
  if (Object.hasOwn(body, "role")) {
    if (!isValidRole(body.role)) return json({ error: "Invalid role" }, 400);
    if (id === staff.user.id && body.role !== "owner") return json({ error: "The active owner cannot change their own role" }, 400);
    patch.role = body.role;
  }
  if (Object.hasOwn(body, "active")) {
    if (typeof body.active !== "boolean") return json({ error: "Invalid active state" }, 400);
    if (id === staff.user.id && body.active !== true) return json({ error: "The active owner cannot deactivate themselves" }, 400);
    patch.active = body.active;
  }
  if (Object.keys(patch).length === 1) return json({ error: "Nothing to update" }, 400);

  const updated = await supabaseFetch(env, `/rest/v1/staff_users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (updated.error) return updated.error;
  if (updated.response.status === 409) return json({ error: "Username already exists" }, 409);
  if (!updated.response.ok) return json({ error: "Could not update staff user" }, 502);
  const [user] = await updated.response.json();
  if (!user) return json({ error: "Staff user not found" }, 404);
  return json({ ok: true, user: safeStaffUser(user) });
}

export async function onRequestDelete({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid staff user" }, 400);
  }
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return json({ error: "Invalid staff user" }, 400);
  if (id === staff.user.id) return json({ error: "The active owner cannot delete themselves" }, 400);

  const removed = await supabaseFetch(env, `/rest/v1/staff_users?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (removed.error) return removed.error;
  if (!removed.response.ok) return json({ error: "Could not delete staff user" }, 502);
  return json({ ok: true });
}

export async function onRequest() {
  return methodNotAllowed();
}
