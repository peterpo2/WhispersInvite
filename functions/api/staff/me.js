import { json, methodNotAllowed } from "../../_shared/responses.js";
import { requireStaff } from "../../_shared/staff-auth.js";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "service");
  if (staff.error) return staff.error;
  return json({ ok: true, user: staff.user });
}

export async function onRequest() {
  return methodNotAllowed();
}
