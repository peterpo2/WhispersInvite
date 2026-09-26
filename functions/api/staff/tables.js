import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestGet({ env }) {
  const tables = await supabaseFetch(env, "/rest/v1/staff_tables?select=id,label,capacity,sort_order&order=sort_order.asc");
  if (tables.error) return tables.error;
  if (!tables.response.ok) return json({ error: "Could not load tables" }, 502);

  const rsvps = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=id,guest_name,wants_table_reservation,status,plus_one_name,staff_table_assignments(table_id)&event_key=eq.${encodeURIComponent(EVENT_KEY)}&status=eq.attending&wants_table_reservation=eq.true&order=submitted_at.asc`
  );
  if (rsvps.error) return rsvps.error;
  if (!rsvps.response.ok) return json({ error: "Could not load tables" }, 502);

  const companions = await supabaseFetch(
    env,
    "/rest/v1/rsvp_companions?select=rsvp_id,id,guest_name,rsvps!inner(event_key,status)&order=created_at.asc"
  );
  if (companions.error) return companions.error;
  if (!companions.response.ok) return json({ error: "Could not load tables" }, 502);

  const companionsByRsvp = new Map();
  for (const row of await companions.response.json()) {
    const parent = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    if (parent?.event_key !== EVENT_KEY || parent?.status !== "attending") continue;
    const people = companionsByRsvp.get(row.rsvp_id) || [];
    people.push(row.guest_name);
    companionsByRsvp.set(row.rsvp_id, people);
  }

  const groups = (await rsvps.response.json()).map((row) => {
    const assignment = Array.isArray(row.staff_table_assignments) ? row.staff_table_assignments[0] : row.staff_table_assignments;
    const people = [row.guest_name];
    if (row.plus_one_name) people.push(row.plus_one_name);
    for (const name of companionsByRsvp.get(row.id) || []) {
      if (name && !people.includes(name)) people.push(name);
    }
    return {
      rsvpId: row.id,
      name: row.guest_name,
      size: people.length,
      people,
      tableId: assignment?.table_id || null,
    };
  });

  return json({ ok: true, tables: await tables.response.json(), groups });
}

export async function onRequest() {
  return methodNotAllowed();
}
