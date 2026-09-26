import { json, methodNotAllowed } from "../../_shared/responses.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid check-in update" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Invalid check-in update" }, 400);
  const checkedIn = body.checkedIn === true;
  const value = checkedIn ? new Date().toISOString() : null;

  if (body.holder === "guest" || body.holder === "plus_one") {
    const rsvpId = Number(body.rsvpId);
    if (!Number.isInteger(rsvpId) || rsvpId <= 0) return json({ error: "Invalid check-in update" }, 400);
    const column = body.holder === "plus_one" ? "plus_one_checked_in_at" : "checked_in_at";
    const updated = await supabaseFetch(env, `/rest/v1/rsvps?id=eq.${encodeURIComponent(rsvpId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ [column]: value }),
    });
    if (updated.error) return updated.error;
    if (!updated.response.ok) return json({ error: "Could not update check-in" }, 502);
    return json({ ok: true, checkedIn, checkedInAt: value });
  }

  if (body.holder === "companion") {
    const companionId = Number(body.companionId);
    if (!Number.isInteger(companionId) || companionId <= 0) return json({ error: "Invalid check-in update" }, 400);
    const updated = await supabaseFetch(env, `/rest/v1/rsvp_companions?id=eq.${encodeURIComponent(companionId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ checked_in_at: value }),
    });
    if (updated.error) return updated.error;
    if (!updated.response.ok) return json({ error: "Could not update check-in" }, 502);
    return json({ ok: true, checkedIn, checkedInAt: value });
  }

  return json({ error: "Invalid check-in update" }, 400);
}

export async function onRequest() {
  return methodNotAllowed();
}
