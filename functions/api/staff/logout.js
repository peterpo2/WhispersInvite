import { json, methodNotAllowed } from "../../_shared/responses.js";
import { clearStaffCookie, requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "door");
  if (!staff.error) {
    await supabaseFetch(env, `/rest/v1/staff_sessions?id=eq.${encodeURIComponent(staff.sessionId)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }
  const response = json({ ok: true });
  response.headers.set("Set-Cookie", clearStaffCookie());
  return response;
}

export async function onRequest() {
  return methodNotAllowed();
}
