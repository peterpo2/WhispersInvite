import { json, methodNotAllowed } from "../../_shared/responses.js";
import { reservationStatePatch } from "../../_shared/reservation-state.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "door");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid reservation update" }, 400);
  }

  const rsvpId = Number(body?.rsvpId);
  const patch = reservationStatePatch(body);

  if (!Number.isInteger(rsvpId) || rsvpId <= 0 || !patch) {
    return json({ error: "Invalid reservation update" }, 400);
  }

  const updated = await supabaseFetch(
    env,
    `/rest/v1/rsvps?id=eq.${encodeURIComponent(rsvpId)}&event_key=eq.${encodeURIComponent(EVENT_KEY)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    }
  );

  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not update reservation" }, 502);
  return json({
    ok: true,
    wantsTableReservation: body.wantsTableReservation,
    called: body.called,
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
