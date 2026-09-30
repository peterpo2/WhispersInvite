import { json, methodNotAllowed } from "../../_shared/responses.js";
import { EVENT_KEY, buildConfirmationUrl, buildInviteRow, buildInviteUrl, buildTicketUrl, validateInvitePayload } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const MAX_RETRIES = 3;
const INVITE_COLUMNS = "id,name,email,phone,ticket_token,confirmation_email_sent_at,confirmation_email_send_count,created_at,updated_at";
const RSVP_COLUMNS = "guest_id,status,submitted_at,guest_name,guest_email,guest_phone,confirmation_token,ticket_token";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "admin");
  if (staff.error) return staff.error;
  return listInvites(request, env);
}

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "admin");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid invite" }, 400);
  }

  const valid = validateInvitePayload(body);
  if (valid.error) return json({ error: valid.error }, 400);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const row = buildInviteRow(body);
    const saved = await supabaseFetch(env, "/rest/v1/guest_list", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (saved.error) return saved.error;
    if (saved.response.ok) {
      const [created] = await saved.response.json();
      return json({ ok: true, invite: publicInvite(request.url, created, null) });
    }
    if (saved.response.status !== 409 || attempt === MAX_RETRIES) {
      return json({ error: "Could not create invite" }, 502);
    }
  }

  return json({ error: "Could not create invite" }, 502);
}

async function listInvites(request, env) {
  const invites = await supabaseFetch(
    env,
    `/rest/v1/guest_list?select=${INVITE_COLUMNS}&order=created_at.desc&limit=1000`
  );
  if (invites.error) return invites.error;
  if (!invites.response.ok) return json({ error: "Could not load invites" }, 502);

  const rsvps = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${RSVP_COLUMNS}&event_key=eq.${encodeURIComponent(EVENT_KEY)}&order=submitted_at.desc&limit=1000`
  );
  if (rsvps.error) return rsvps.error;
  if (!rsvps.response.ok) return json({ error: "Could not load invites" }, 502);

  const rsvpByGuestId = new Map((await rsvps.response.json()).map((row) => [row.guest_id, row]));
  const rows = await invites.response.json();
  return json({
    ok: true,
    invites: rows.map((row) => publicInvite(request.url, row, rsvpByGuestId.get(row.id) || null)),
  });
}

function publicInvite(requestUrl, row, rsvp) {
  const ticketToken = row.ticket_token || rsvp?.ticket_token || "";
  const confirmationToken = rsvp?.confirmation_token || "";
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    ticketToken,
    confirmationEmailSentAt: row.confirmation_email_sent_at || null,
    confirmationEmailSendCount: Number(row.confirmation_email_send_count || 0),
    inviteLink: buildInviteUrl(requestUrl, row.id),
    confirmationLink: confirmationToken ? buildConfirmationUrl(requestUrl, confirmationToken) : "",
    ticketLink: ticketToken ? buildTicketUrl(requestUrl, ticketToken) : "",
    status: rsvp?.status || "not_responded",
    rsvpName: rsvp?.guest_name || "",
    rsvpEmail: rsvp?.guest_email || "",
    rsvpPhone: rsvp?.guest_phone || "",
    submittedAt: rsvp?.submitted_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function onRequest() {
  return methodNotAllowed();
}
