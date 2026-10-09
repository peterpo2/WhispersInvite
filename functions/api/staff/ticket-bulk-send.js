import { buildTicketEmail, emailConfigFromEnv } from "../../_shared/email-content.js";
import { postmarkBatchSend } from "../../_shared/postmark.js";
import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY, buildTicketUrl } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const PRIMARY_COLUMNS = "id,guest_name,guest_email,ticket_token,plus_one_name";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,email,ticket_token,rsvps!inner(guest_name,event_key,status)";
const EVENT_DETAILS_COLUMNS = "venue_name,venue_address";
const BATCH_LIMIT = 500;

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid ticket send" }, 400);
  }

  const dryRun = body?.dryRun === true;
  const scheduledAtLocal = typeof body?.scheduledAtLocal === "string" ? body.scheduledAtLocal.trim() : "";
  const schedule = dryRun ? { ok: true } : validateSchedule(scheduledAtLocal);
  if (schedule.error) return json({ error: schedule.error }, 400);

  const config = emailConfigFromEnv({ ...env, POSTMARK_SERVER_TOKEN: env.POSTMARK_SERVER_TOKEN });
  if (config.error) return json({ error: config.error }, 500);
  config.postmarkToken = String(env.POSTMARK_SERVER_TOKEN || env.SMTP_PASS || env.SMTP_USER || "").trim();

  const pending = await loadPendingTicketEmails({ env, requestUrl: request.url, config });
  if (pending.error instanceof Response) return pending.error;
  if (pending.error) return json({ error: pending.error }, 502);

  const skipped = { alreadySent: 0, noEmail: 0, noTicket: 0 };
  const emails = pending.items;
  if (dryRun) {
    return json({
      ok: true,
      dryRun: true,
      pending: emails.length,
      primary: emails.filter((item) => item.kind === "primary").length,
      companions: emails.filter((item) => item.kind === "companion").length,
      skipped,
    });
  }

  if (!emails.length) {
    return json({ ok: true, dryRun: false, sent: 0, failed: 0, skipped, failures: [] });
  }
  if (emails.length > BATCH_LIMIT) {
    return json({ error: "Too many ticket emails for one batch" }, 400);
  }

  let results;
  try {
    results = await postmarkBatchSend(config, emails.map((item) => item.email));
  } catch (error) {
    return json({ error: `Could not send ticket emails: ${String(error?.message || error)}` }, 502);
  }

  const sentAt = new Date().toISOString();
  const failures = [];
  const primarySentIds = [];
  const companionSentIds = [];
  for (let index = 0; index < emails.length; index += 1) {
    const item = emails[index];
    const result = results[index] || {};
    if (Number(result.ErrorCode || 0) === 0) {
      if (item.kind === "primary") {
        primarySentIds.push(item.id);
      } else {
        companionSentIds.push(item.id);
      }
    } else {
      failures.push({ to: item.to, name: item.name, error: result.Message || "Postmark rejected this email" });
    }
  }

  const markedPrimary = await markPrimarySent(env, primarySentIds, sentAt);
  if (markedPrimary.error instanceof Response) return markedPrimary.error;
  if (markedPrimary.error) failures.push({ to: "", name: "Primary tickets", error: markedPrimary.error });

  const markedCompanions = await markCompanionSent(env, companionSentIds, sentAt);
  if (markedCompanions.error instanceof Response) return markedCompanions.error;
  if (markedCompanions.error) failures.push({ to: "", name: "Added guest tickets", error: markedCompanions.error });

  const sent = primarySentIds.length + companionSentIds.length;
  return json({ ok: true, dryRun: false, sent, failed: failures.length, skipped, failures: failures.slice(0, 20), sentAt });
}

async function loadPendingTicketEmails({ env, requestUrl, config }) {
  const venue = await loadTicketEmailVenue(env);
  if (venue.error instanceof Response) return { error: venue.error };
  if (venue.error) return { error: venue.error };

  const primary = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${PRIMARY_COLUMNS}&event_key=eq.${encodeURIComponent(EVENT_KEY)}&status=eq.attending&guest_email=not.is.null&ticket_token=not.is.null&ticket_email_sent_at=is.null&order=submitted_at.asc&limit=1000`
  );
  if (primary.error) return { error: primary.error };
  if (!primary.response.ok) return { error: "Could not load ticket recipients" };

  const companions = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&email=not.is.null&ticket_token=not.is.null&ticket_email_sent_at=is.null&rsvps.status=eq.attending&rsvps.event_key=eq.${encodeURIComponent(EVENT_KEY)}&order=created_at.asc&limit=1000`
  );
  if (companions.error) return { error: companions.error };
  if (!companions.response.ok) return { error: "Could not load added guest recipients" };

  const primaryRows = await primary.response.json();
  const companionRows = await companions.response.json();
  const items = [];

  for (const row of primaryRows) {
    const to = String(row.guest_email || "").trim().toLowerCase();
    if (!to || !row.ticket_token) continue;
    items.push({
      kind: "primary",
      id: row.id,
      to,
      name: row.guest_name,
      email: buildTicketEmail({
        to,
        name: row.guest_name,
        bringing: row.plus_one_name || "",
        ticketLink: buildTicketUrl(requestUrl, row.ticket_token),
        venue: venue.value,
        config,
      }),
    });
  }

  for (const row of companionRows) {
    const parent = Array.isArray(row.rsvps) ? row.rsvps[0] : row.rsvps;
    if (parent?.event_key !== EVENT_KEY || parent?.status !== "attending") continue;
    const to = String(row.email || "").trim().toLowerCase();
    if (!to || !row.ticket_token) continue;
    items.push({
      kind: "companion",
      id: row.id,
      to,
      name: row.guest_name,
      email: buildTicketEmail({
        to,
        name: row.guest_name,
        guestOf: parent.guest_name,
        ticketLink: buildTicketUrl(requestUrl, row.ticket_token),
        venue: venue.value,
        config,
      }),
    });
  }

  return { items };
}

async function markPrimarySent(env, ids, sentAt) {
  if (!ids.length) return { ok: true };
  const result = await supabaseFetch(env, `/rest/v1/rsvps?id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ticket_email_sent_at: sentAt }),
  });
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: "Could not record primary ticket send" };
  return { ok: true };
}

async function markCompanionSent(env, ids, sentAt) {
  if (!ids.length) return { ok: true };
  const result = await supabaseFetch(env, `/rest/v1/rsvp_companions?id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ticket_email_sent_at: sentAt }),
  });
  if (result.error) return { error: result.error };
  if (!result.response.ok) return { error: "Could not record added guest ticket send" };
  return { ok: true };
}

async function loadTicketEmailVenue(env) {
  const found = await supabaseFetch(
    env,
    `/rest/v1/event_details?select=${EVENT_DETAILS_COLUMNS}&event_key=eq.${encodeURIComponent(EVENT_KEY)}&limit=1`
  );
  if (found.error) return { error: found.error };
  if (!found.response.ok) return { error: "Could not load event details" };

  const [details] = await found.response.json();
  const name = String(details?.venue_name || "").trim();
  const address = String(details?.venue_address || "").trim();
  return { value: name || address ? { name, address } : null };
}

function validateSchedule(value) {
  if (!value) return { ok: true };
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return { error: "Choose a valid ticket send date and time." };
  if (at.getTime() > Date.now() + 30000) return { error: "This ticket send is scheduled for later. Keep the Settings tab open until then." };
  return { ok: true };
}

export async function onRequest() {
  return methodNotAllowed();
}
