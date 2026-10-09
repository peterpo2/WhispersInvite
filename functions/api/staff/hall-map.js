import { json, methodNotAllowed } from "../../_shared/responses.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { validateHallPositionPayload } from "../../_shared/staff-tables.js";
import { supabaseFetch } from "../../_shared/supabase.js";

// MAP tab positions. Separate from the Show map positions in /api/staff/tables.
function toPosition(value) {
  return value === null || value === undefined ? null : Number(value);
}

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "service");
  if (staff.error) return staff.error;

  const tables = await supabaseFetch(env, "/rest/v1/staff_tables?select=id,label,sort_order,hall_x,hall_y,hall_map_edited_at&order=sort_order.asc");
  if (tables.error) return tables.error;
  if (!tables.response.ok) return json({ error: "Could not load map" }, 502);

  const rows = (await tables.response.json()).map((table) => ({
    id: table.id,
    label: table.label,
    sortOrder: table.sort_order,
    hallX: toPosition(table.hall_x),
    hallY: toPosition(table.hall_y),
    hallMapEditedAt: table.hall_map_edited_at || null,
  }));
  return json({ ok: true, tables: rows });
}

export async function onRequestPatch({ request, env }) {
  const staff = await requireStaff(request, env, "door");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid table position" }, 400);
  }

  const position = validateHallPositionPayload(body);
  if (!position) return json({ error: "Invalid table position" }, 400);
  const editedAt = new Date().toISOString();

  const updated = await supabaseFetch(
    env,
    `/rest/v1/staff_tables?id=eq.${encodeURIComponent(position.tableId)}&select=id,hall_x,hall_y,hall_map_edited_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ hall_x: position.hallX, hall_y: position.hallY, hall_map_edited_at: editedAt, updated_at: editedAt }),
    }
  );
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not save table position" }, 502);

  const rows = await updated.response.json();
  if (!rows.length) return json({ error: "Table not found" }, 404);
  return json({ ok: true, tableId: rows[0].id, hallX: Number(rows[0].hall_x), hallY: Number(rows[0].hall_y), hallMapEditedAt: rows[0].hall_map_edited_at });
}

export async function onRequest() {
  return methodNotAllowed();
}
