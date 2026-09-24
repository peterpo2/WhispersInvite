import { json, methodNotAllowed } from "../_shared/responses.js";
import { supabaseFetch } from "../_shared/supabase.js";

function tokenFromValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.searchParams.get("token") || parsed.pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return raw;
  }
}

async function findTicket(env, token) {
  return supabaseFetch(
    env,
    `/rest/v1/rsvps?select=id,guest_name,plus_one_name,seal_code,checked_in_at,status,submitted_at&ticket_token=eq.${encodeURIComponent(token)}&limit=1`
  );
}

export async function onRequestGet({ env }) {
  const listed = await supabaseFetch(
    env,
    "/rest/v1/rsvps?select=guest_name,plus_one_name,seal_code,checked_in_at,submitted_at,status&status=eq.attending&checked_in_at=not.is.null&order=checked_in_at.desc&limit=80"
  );
  if (listed.error) return listed.error;
  if (!listed.response.ok) return json({ error: "Could not load door list" }, 502);
  return json({ ok: true, scans: await listed.response.json() });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid scan" }, 400);
  }

  const token = tokenFromValue(body.token || body.value || body.url);
  if (!token) return json({ error: "Missing ticket token" }, 400);

  const lookup = await findTicket(env, token);
  if (lookup.error) return lookup.error;
  if (!lookup.response.ok) return json({ error: "Could not verify ticket" }, 502);

  const rows = await lookup.response.json();
  if (!rows.length || rows[0].status !== "attending") {
    return json({ error: "Invalid ticket" }, 404);
  }

  const ticket = rows[0];
  if (ticket.checked_in_at) {
    return json({ ok: true, status: "already_checked_in", ticket });
  }

  const checkedAt = new Date().toISOString();
  const update = await supabaseFetch(env, `/rest/v1/rsvps?id=eq.${encodeURIComponent(ticket.id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({ checked_in_at: checkedAt }),
  });

  if (update.error) return update.error;
  if (!update.response.ok) return json({ error: "Could not check in ticket" }, 502);

  const updatedRows = await update.response.json();
  return json({ ok: true, status: "checked_in", ticket: updatedRows[0] || { ...ticket, checked_in_at: checkedAt } });
}

export async function onRequest() {
  return methodNotAllowed();
}
