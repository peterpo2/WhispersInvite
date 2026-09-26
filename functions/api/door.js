import { json, methodNotAllowed } from "../_shared/responses.js";
import { doorScans, ticketForToken, tokenFromValue } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const TICKET_COLUMNS = "id,guest_name,seal_code,ticket_token,checked_in_at,status,plus_one_name,plus_one_seal_code,plus_one_ticket_token,plus_one_checked_in_at";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,seal_code,ticket_token,checked_in_at,rsvps!inner(guest_name,status)";

function publicTicket(ticket) {
  const { holder, ...rest } = ticket;
  return rest;
}

export async function onRequestGet({ env }) {
  const listed = await supabaseFetch(
    env,
    "/rest/v1/rsvps?select=guest_name,seal_code,checked_in_at,plus_one_name,plus_one_seal_code,plus_one_checked_in_at&status=eq.attending&or=(checked_in_at.not.is.null,plus_one_checked_in_at.not.is.null)&order=submitted_at.desc&limit=200"
  );
  if (listed.error) return listed.error;
  if (!listed.response.ok) return json({ error: "Could not load door list" }, 502);

  const companionListed = await supabaseFetch(
    env,
    "/rest/v1/rsvp_companions?select=guest_name,seal_code,checked_in_at,rsvps!inner(guest_name,status)&checked_in_at=not.is.null&order=checked_in_at.desc&limit=200"
  );
  let companionRows = [];
  if (!companionListed.error && companionListed.response.ok) {
    const rows = await companionListed.response.json();
    companionRows = rows.map((row) => {
      const primary = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
      return { guest_name: row.guest_name, seal_code: row.seal_code, checked_in_at: row.checked_in_at, brought_by: primary?.guest_name || null };
    });
  }

  return json({ ok: true, scans: doorScans([...(await listed.response.json()), ...companionRows]) });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid scan" }, 400);
  }
  if (!body || typeof body !== "object") return json({ error: "Invalid scan" }, 400);

  const token = tokenFromValue(body.token || body.value || body.url);
  if (!token) return json({ error: "Missing ticket token" }, 400);

  const primary = await checkPrimary(env, token);
  if (primary.done) return primary.response;
  if (primary.error) return primary.error;

  const companion = await checkCompanion(env, token);
  if (companion.done) return companion.response;
  if (companion.error) return companion.error;

  return json({ error: "Invalid ticket" }, 404);
}

async function checkPrimary(env, token) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${TICKET_COLUMNS}&or=(ticket_token.eq.${token},plus_one_ticket_token.eq.${token})&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not verify ticket" }, 502) };

  const rows = await lookup.response.json();
  const ticket = ticketForToken(rows[0], token);
  if (!ticket) return { done: false };

  if (ticket.checked_in_at) {
    return { done: true, response: json({ ok: true, status: "already_checked_in", ticket: publicTicket(ticket) }) };
  }

  const column = ticket.holder === "plus_one" ? "plus_one_checked_in_at" : "checked_in_at";
  const tokenColumn = ticket.holder === "plus_one" ? "plus_one_ticket_token" : "ticket_token";
  const checkedAt = new Date().toISOString();
  const update = await supabaseFetch(
    env,
    `/rest/v1/rsvps?id=eq.${encodeURIComponent(rows[0].id)}&${tokenColumn}=eq.${token}&${column}=is.null`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({ [column]: checkedAt }),
    }
  );

  if (update.error) return { error: update.error };
  if (!update.response.ok) return { error: json({ error: "Could not check in ticket" }, 502) };

  const updatedRows = await update.response.json();
  if (!updatedRows.length) {
    return { done: true, response: json({ ok: true, status: "already_checked_in", ticket: publicTicket(ticket) }) };
  }

  return { done: true, response: json({ ok: true, status: "checked_in", ticket: publicTicket({ ...ticket, checked_in_at: checkedAt }) }) };
}

async function checkCompanion(env, token) {
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&ticket_token=eq.${token}&limit=1`
  );
  if (lookup.error) return { error: lookup.error };
  if (!lookup.response.ok) return { error: json({ error: "Could not verify ticket" }, 502) };

  const [row] = await lookup.response.json();
  const primary = Array.isArray(row?.rsvps) ? row.rsvps[0] : row?.rsvps;
  if (!row || primary?.status !== "attending") return { done: false };

  const ticket = {
    holder: "companion",
    guest_name: row.guest_name,
    seal_code: row.seal_code,
    checked_in_at: row.checked_in_at || null,
    bringing: null,
    brought_by: primary?.guest_name || null,
  };
  if (ticket.checked_in_at) {
    return { done: true, response: json({ ok: true, status: "already_checked_in", ticket: publicTicket(ticket) }) };
  }

  const checkedAt = new Date().toISOString();
  const update = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?id=eq.${encodeURIComponent(row.id)}&ticket_token=eq.${token}&checked_in_at=is.null`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({ checked_in_at: checkedAt }),
    }
  );

  if (update.error) return { error: update.error };
  if (!update.response.ok) return { error: json({ error: "Could not check in ticket" }, 502) };

  const updatedRows = await update.response.json();
  if (!updatedRows.length) {
    return { done: true, response: json({ ok: true, status: "already_checked_in", ticket: publicTicket(ticket) }) };
  }

  return { done: true, response: json({ ok: true, status: "checked_in", ticket: publicTicket({ ...ticket, checked_in_at: checkedAt }) }) };
}

export async function onRequest() {
  return methodNotAllowed();
}
