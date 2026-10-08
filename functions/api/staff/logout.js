import { json, methodNotAllowed } from "../../_shared/responses.js";
import { clearStaffCookie, requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  return logout(request, env, false);
}

export async function onRequestGet({ request, env }) {
  return logout(request, env, true);
}

async function logout(request, env, redirect) {
  const staff = await requireStaff(request, env, "service");
  if (!staff.error) {
    await supabaseFetch(env, `/rest/v1/staff_sessions?id=eq.${encodeURIComponent(staff.sessionId)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }
  const response = redirect
    ? new Response(null, { status: 302, headers: { Location: new URL("/staff/rose-door-10", request.url).toString() } })
    : json({ ok: true });
  response.headers.set("Set-Cookie", clearStaffCookie());
  return response;
}

export async function onRequest() {
  return methodNotAllowed();
}
