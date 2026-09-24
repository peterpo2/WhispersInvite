import { json, methodNotAllowed } from "../_shared/responses.js";
import { doorScans, ticketForToken, tokenFromValue } from "../_shared/rsvp.js";
import { supabaseFetch } from "../_shared/supabase.js";

const TICKET_COLUMNS = "id,guest_name,seal_code,ticket_token,checked_in_at,status,plus_one_name,plus_one_seal_code,plus_one_ticket_token,plus_one_checked_in_at";

// Only what the scanner shows: never the tokens.
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
  return json({ ok: true, scans: doorScans(await listed.response.json()) });
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

  // tokenFromValue only lets through [A-Za-z0-9], so the token is safe inside or=(...).
  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${TICKET_COLUMNS}&or=(ticket_token.eq.${token},plus_one_ticket_token.eq.${token})&limit=1`
  );
  if (lookup.error) return lookup.error;
  if (!lookup.response.ok) return json({ error: "Could not verify ticket" }, 502);

  const rows = await lookup.response.json();
  const ticket = ticketForToken(rows[0], token);
  if (!ticket) return json({ error: "Invalid ticket" }, 404);

  if (ticket.checked_in_at) {
    return json({ ok: true, status: "already_checked_in", ticket: publicTicket(ticket) });
  }

  // The guest and the plus-one are checked in separately, each atomically.
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

  if (update.error) return update.error;
  if (!update.response.ok) return json({ error: "Could not check in ticket" }, 502);

  const updatedRows = await update.response.json();
  if (!updatedRows.length) {
    return json({ ok: true, status: "already_checked_in", ticket: publicTicket(ticket) });
  }

  return json({ ok: true, status: "checked_in", ticket: publicTicket({ ...ticket, checked_in_at: checkedAt }) });
}

export async function onRequest() {
  return methodNotAllowed();
}
