import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { buildTableRegistry, validateMinimumSpendPayload, validateTableEditedPayload, validateTablePositionPayload, validateTableReadyPayload } from "../../_shared/staff-tables.js";
import { supabaseFetch } from "../../_shared/supabase.js";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "service");
  if (staff.error) return staff.error;

  const tables = await supabaseFetch(env, "/rest/v1/staff_tables?select=id,label,sort_order,minimum_spend_eur,map_x,map_y,table_map_edited_at,is_ready&order=sort_order.asc");
  if (tables.error) return tables.error;
  if (!tables.response.ok) return json({ error: "Could not load tables" }, 502);

  const rsvps = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=id,guest_id,guest_name,guest_email,guest_phone,wants_table_reservation,called,status,plus_one_name,plus_one_email,plus_one_phone&event_key=eq.${encodeURIComponent(EVENT_KEY)}&order=submitted_at.asc&limit=1000`
  );
  if (rsvps.error) return rsvps.error;
  if (!rsvps.response.ok) return json({ error: "Could not load tables" }, 502);

  const companions = await supabaseFetch(
    env,
    "/rest/v1/rsvp_companions?select=rsvp_id,id,guest_name,email,phone,rsvps!inner(guest_name,event_key,status)&order=created_at.asc&limit=1000"
  );
  if (companions.error) return companions.error;
  if (!companions.response.ok) return json({ error: "Could not load tables" }, 502);

  const invites = await supabaseFetch(
    env,
    "/rest/v1/guest_list?select=id,name,email,phone&order=created_at.asc&limit=1000"
  );
  if (invites.error) return invites.error;
  if (!invites.response.ok) return json({ error: "Could not load tables" }, 502);

  const assignments = await supabaseFetch(
    env,
    `/rest/v1/staff_table_assignments?select=rsvp_id,invite_id,table_id&event_key=eq.${encodeURIComponent(EVENT_KEY)}&limit=2000`
  );
  if (assignments.error) return assignments.error;
  if (!assignments.response.ok) return json({ error: "Could not load tables" }, 502);

  const rsvpRows = await rsvps.response.json();
  const companionRows = [];
  for (const row of await companions.response.json()) {
    const parent = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    if (parent?.event_key !== EVENT_KEY) continue;
    companionRows.push({
      ...row,
      status: parent?.status || "",
      guest_of: parent?.guest_name || "",
    });
  }

  const tableRows = (await tables.response.json()).map((table) => ({
    id: table.id,
    label: table.label,
    sortOrder: table.sort_order,
    minimumSpendEur: table.minimum_spend_eur || 0,
    mapX: Number(table.map_x),
    mapY: Number(table.map_y),
    tableMapEditedAt: table.table_map_edited_at || null,
    isReady: table.is_ready === true,
  }));

  const { groups, searchPeople } = buildTableRegistry({
    invites: await invites.response.json(),
    rsvps: rsvpRows,
    companions: companionRows,
    assignments: await assignments.response.json(),
  });

  return json({ ok: true, tables: tableRows, groups, searchPeople });
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
  const edited = position || minimumSpend ? null : validateTableEditedPayload(body);
  const ready = position || minimumSpend || edited ? null : validateTableReadyPayload(body);
  if (ready && staff.user.role !== "owner") return json({ error: "Forbidden" }, 403);
  const value = position || minimumSpend || edited || ready;
  if (!value) return json({ error: "Invalid table update" }, 400);
  const editedAt = new Date().toISOString();
  const patch = position
    ? { map_x: value.mapX, map_y: value.mapY, table_map_edited_at: editedAt }
    : minimumSpend
      ? { minimum_spend_eur: value.minimumSpendEur }
      : edited.editSurface === "hall"
        ? { hall_map_edited_at: editedAt, is_ready: true }
        : edited.editSurface === "tables"
          ? { table_map_edited_at: editedAt, is_ready: true }
          : ready
            ? { is_ready: ready.isReady }
            : {};

  const updated = await supabaseFetch(
    env,
    `/rest/v1/staff_tables?id=eq.${encodeURIComponent(value.tableId)}&select=id,minimum_spend_eur,map_x,map_y,table_map_edited_at,hall_map_edited_at,is_ready`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: editedAt }),
    }
  );
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not update table" }, 502);

  const rows = await updated.response.json();
  if (!rows.length) return json({ error: "Table not found" }, 404);
  if (position) return json({ ok: true, tableId: rows[0].id, mapX: Number(rows[0].map_x), mapY: Number(rows[0].map_y), tableMapEditedAt: rows[0].table_map_edited_at, isReady: rows[0].is_ready === true });
  return json({
    ok: true,
    tableId: rows[0].id,
    minimumSpendEur: rows[0].minimum_spend_eur,
    tableMapEditedAt: rows[0].table_map_edited_at,
    hallMapEditedAt: rows[0].hall_map_edited_at,
    isReady: rows[0].is_ready === true,
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
