import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { validateTableAssignmentPayload } from "../../_shared/staff-tables.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "door");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid table assignment" }, 400);
  }
  const assignment = validateTableAssignmentPayload(body);
  if (!assignment) return json({ error: "Invalid table assignment" }, 400);
  const { subjectType, subjectId, tableId } = assignment;
  const subjectColumn = subjectType === "rsvp" ? "rsvp_id" : "invite_id";

  if (subjectType === "rsvp") {
    const rsvp = await supabaseFetch(
      env,
      `/rest/v1/rsvps?select=id&event_key=eq.${encodeURIComponent(EVENT_KEY)}&id=eq.${encodeURIComponent(subjectId)}&status=eq.attending&limit=1`
    );
    if (rsvp.error) return rsvp.error;
    if (!rsvp.response.ok) return json({ error: "Could not assign table" }, 502);
    if (!(await rsvp.response.json()).length) return json({ error: "Guest is not confirmed" }, 409);
  } else if (subjectType === "invite") {
    const invite = await supabaseFetch(
      env,
      `/rest/v1/guest_list?select=id&id=eq.${encodeURIComponent(subjectId)}&limit=1`
    );
    if (invite.error) return invite.error;
    if (!invite.response.ok) return json({ error: "Could not assign table" }, 502);
    if (!(await invite.response.json()).length) return json({ error: "Invite not found" }, 404);

    const responded = await supabaseFetch(
      env,
      `/rest/v1/rsvps?select=id,status&event_key=eq.${encodeURIComponent(EVENT_KEY)}&guest_id=eq.${encodeURIComponent(subjectId)}&limit=1`
    );
    if (responded.error) return responded.error;
    if (!responded.response.ok) return json({ error: "Could not assign table" }, 502);
    if ((await responded.response.json()).length) {
      return json({ error: "Guest has already responded. Refresh and try again." }, 409);
    }
  }

  if (!tableId) {
    const removed = await supabaseFetch(
      env,
      `/rest/v1/staff_table_assignments?event_key=eq.${encodeURIComponent(EVENT_KEY)}&${subjectColumn}=eq.${encodeURIComponent(subjectId)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );
    if (removed.error) return removed.error;
    if (!removed.response.ok) return json({ error: "Could not assign table" }, 502);
    return json({ ok: true });
  }

  const assignmentPath = subjectType === "rsvp"
    ? "/rest/v1/staff_table_assignments?on_conflict=event_key,rsvp_id"
    : "/rest/v1/staff_table_assignments?on_conflict=event_key,invite_id";
  const row = subjectType === "rsvp"
    ? { event_key: EVENT_KEY, rsvp_id: subjectId, table_id: tableId }
    : { event_key: EVENT_KEY, invite_id: subjectId, table_id: tableId };
  const saved = await supabaseFetch(env, assignmentPath, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (saved.error) return saved.error;
  if (!saved.response.ok) return json({ error: "Could not assign table" }, 502);
  return json({ ok: true });
}

export async function onRequest() {
  return methodNotAllowed();
}
