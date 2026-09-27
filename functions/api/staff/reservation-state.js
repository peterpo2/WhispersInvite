import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid reservation update" }, 400);
  }

  const rsvpId = Number(body?.rsvpId);
  const patch = {};
  if (typeof body?.wantsTableReservation === "boolean") patch.wants_table_reservation = body.wantsTableReservation;
  if (typeof body?.reservationConfirmed === "boolean") patch.reservation_confirmed = body.reservationConfirmed;

  if (!Number.isInteger(rsvpId) || rsvpId <= 0 || !Object.keys(patch).length) {
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
    reservationConfirmed: body.reservationConfirmed,
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
