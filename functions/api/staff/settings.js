import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { buildRsvpSettingsPatch, effectiveRsvpPolicy, loadRsvpPolicy } from "../../_shared/rsvp-settings.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;

  const current = await loadRsvpPolicy(env);
  if (current.error) return current.error;
  return json({ ok: true, rsvp: current.policy });
}

export async function onRequestPatch({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid RSVP setting" }, 400);
  }

  const now = new Date();
  const current = await loadRsvpPolicy(env, now);
  if (current.error) return current.error;
  const validated = buildRsvpSettingsPatch(body, current.policy, now);
  if (validated.error) return json({ error: validated.error }, 400);

  const updated = await supabaseFetch(
    env,
    "/rest/v1/event_details?on_conflict=event_key&select=rsvp_open,rsvp_change_at,rsvp_change_to_open",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        event_key: EVENT_KEY,
        ...validated.patch,
        updated_at: now.toISOString(),
      }),
    }
  );
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not save RSVP settings" }, 502);
  const rows = await updated.response.json();
  if (!rows.length) return json({ error: "Could not save RSVP settings" }, 502);
  return json({ ok: true, rsvp: effectiveRsvpPolicy(rows[0], now) });
}

export async function onRequest() {
  return methodNotAllowed();
}
