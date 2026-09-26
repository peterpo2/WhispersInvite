import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid table assignment" }, 400);
  }
  const rsvpId = Number(body?.rsvpId);
  if (!Number.isInteger(rsvpId) || rsvpId <= 0) return json({ error: "Invalid table assignment" }, 400);

  if (body.tableId == null || body.tableId === "") {
    const removed = await supabaseFetch(
      env,
      `/rest/v1/staff_table_assignments?event_key=eq.${encodeURIComponent(EVENT_KEY)}&rsvp_id=eq.${encodeURIComponent(rsvpId)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );
    if (removed.error) return removed.error;
    if (!removed.response.ok) return json({ error: "Could not assign table" }, 502);
    return json({ ok: true });
  }

  if (typeof body.tableId !== "string" || body.tableId.length > 40) {
    return json({ error: "Invalid table assignment" }, 400);
  }

  const saved = await supabaseFetch(env, "/rest/v1/staff_table_assignments", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ event_key: EVENT_KEY, rsvp_id: rsvpId, table_id: body.tableId }),
  });
  if (saved.error) return saved.error;
  if (!saved.response.ok) return json({ error: "Could not assign table" }, 502);
  return json({ ok: true });
}

export async function onRequest() {
  return methodNotAllowed();
}
