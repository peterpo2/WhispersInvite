import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { validateMinimumSpendPayload, validateTablePositionPayload } from "../../_shared/staff-tables.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "service");
  if (staff.error) return staff.error;

  const tables = await supabaseFetch(env, "/rest/v1/staff_tables?select=id,label,sort_order,minimum_spend_eur,map_x,map_y&order=sort_order.asc");
  if (tables.error) return tables.error;
  if (!tables.response.ok) return json({ error: "Could not load tables" }, 502);

  const rsvps = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=id,guest_name,guest_email,guest_phone,wants_table_reservation,reservation_confirmed,status,plus_one_name,plus_one_email,plus_one_phone,staff_table_assignments(table_id)&event_key=eq.${encodeURIComponent(EVENT_KEY)}&status=eq.attending&order=submitted_at.asc`
  );
  if (rsvps.error) return rsvps.error;
  if (!rsvps.response.ok) return json({ error: "Could not load tables" }, 502);

  const companions = await supabaseFetch(
    env,
    "/rest/v1/rsvp_companions?select=rsvp_id,id,guest_name,email,phone,rsvps!inner(event_key,status)&order=created_at.asc"
  );
  if (companions.error) return companions.error;
  if (!companions.response.ok) return json({ error: "Could not load tables" }, 502);

  const companionsByRsvp = new Map();
  for (const row of await companions.response.json()) {
    const parent = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    if (parent?.event_key !== EVENT_KEY || parent?.status !== "attending") continue;
    const people = companionsByRsvp.get(row.rsvp_id) || [];
    people.push({ name: row.guest_name, email: row.email || "", phone: row.phone || "" });
    companionsByRsvp.set(row.rsvp_id, people);
  }

  const groups = (await rsvps.response.json()).map((row) => {
    const assignment = Array.isArray(row.staff_table_assignments) ? row.staff_table_assignments[0] : row.staff_table_assignments;
    const peopleDetails = [{ name: row.guest_name, email: row.guest_email || "", phone: row.guest_phone || "" }];
    if (row.plus_one_name) {
      peopleDetails.push({ name: row.plus_one_name, email: row.plus_one_email || "", phone: row.plus_one_phone || "" });
    }
    for (const person of companionsByRsvp.get(row.id) || []) {
      if (person.name && !peopleDetails.some((existing) => existing.name === person.name)) peopleDetails.push(person);
    }
    const people = peopleDetails.map((person) => person.name);
    return {
      rsvpId: row.id,
      name: row.guest_name,
      size: people.length,
      people,
      peopleDetails,
      wantsTableReservation: row.wants_table_reservation === true,
      reservationConfirmed: row.reservation_confirmed === true,
      tableId: assignment?.table_id || null,
    };
  });

  const tableRows = (await tables.response.json()).map((table) => ({
    id: table.id,
    label: table.label,
    sortOrder: table.sort_order,
    minimumSpendEur: table.minimum_spend_eur || 0,
    mapX: Number(table.map_x),
    mapY: Number(table.map_y),
  }));

  return json({ ok: true, tables: tableRows, groups });
}

export async function onRequestPatch({ request, env }) {
  const staff = await requireStaff(request, env, "door");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid table update" }, 400);
  }

  const position = validateTablePositionPayload(body);
  const minimumSpend = position ? null : validateMinimumSpendPayload(body);
  const value = position || minimumSpend;
  if (!value) return json({ error: "Invalid table update" }, 400);
  const patch = position
    ? { map_x: value.mapX, map_y: value.mapY }
    : { minimum_spend_eur: value.minimumSpendEur };

  const updated = await supabaseFetch(
    env,
    `/rest/v1/staff_tables?id=eq.${encodeURIComponent(value.tableId)}&select=id,minimum_spend_eur,map_x,map_y`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }
  );
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not update table" }, 502);

  const rows = await updated.response.json();
  if (!rows.length) return json({ error: "Table not found" }, 404);
  if (position) return json({ ok: true, tableId: rows[0].id, mapX: Number(rows[0].map_x), mapY: Number(rows[0].map_y) });
  return json({ ok: true, tableId: rows[0].id, minimumSpendEur: rows[0].minimum_spend_eur });
}

export async function onRequest() {
  return methodNotAllowed();
}
