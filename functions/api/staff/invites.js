import { json, methodNotAllowed } from "../../_shared/responses.js";
import { buildInviteEmail, emailConfigFromEnv } from "../../_shared/email-content.js";
import { retryAsync } from "../../_shared/retry.js";
import { EVENT_KEY, buildConfirmationUrl, buildInviteRow, buildInviteUrl, buildTicketUrl, normalizeEmail, normalizePhone, validateInvitePayload } from "../../_shared/rsvp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const MAX_RETRIES = 3;
const INVITE_COLUMNS = "id,name,email,phone,ticket_token,confirmation_email_sent_at,confirmation_email_send_count,created_at,updated_at";
const RSVP_COLUMNS = "id,guest_id,status,submitted_at,guest_name,guest_email,guest_phone,confirmation_token,ticket_token";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,email,phone,confirmation_token,ticket_token,created_at,rsvps!inner(guest_name,event_key,status,submitted_at)";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "door");
  if (staff.error) return staff.error;
  return listInvites(request, env);
}

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "door");
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
      const emailDelivery = await sendCreatedInviteEmail(env, request.url, created);
      return json({ ok: true, invite: publicInvite(request.url, { ...created, ...emailDelivery.patch }, null), emailDelivery: emailDelivery.public });
    }
    if (saved.response.status !== 409 || attempt === MAX_RETRIES) {
      return json({ error: "Could not create invite" }, 502);
    }
  }

  return json({ error: "Could not create invite" }, 502);
}

export async function onRequestPatch({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid invite" }, 400);
  }

  const valid = validateInviteUpdatePayload(body);
  if (valid.error) return json({ error: valid.error }, 400);
  const { id, patch } = valid;
  patch.updated_at = new Date().toISOString();

  const updated = await supabaseFetch(env, `/rest/v1/guest_list?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not update invite" }, 502);
  const [invite] = await updated.response.json();
  if (!invite) return json({ error: "Invite not found" }, 404);
  return json({ ok: true, invite: publicInvite(request.url, invite, null) });
}

export async function onRequestDelete({ request, env }) {
  const staff = await requireStaff(request, env, "owner");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid invite" }, 400);
  }

  const id = validEditableInviteId(body?.id);
  if (!id) return json({ error: "Invalid invite" }, 400);

  const linked = await supabaseFetch(env, `/rest/v1/rsvps?select=id&event_key=eq.${encodeURIComponent(EVENT_KEY)}&guest_id=eq.${encodeURIComponent(id)}`);
  if (linked.error) return linked.error;
  if (!linked.response.ok) return json({ error: "Could not delete invite" }, 502);
  const linkedRsvps = await linked.response.json();
  for (const rsvp of linkedRsvps) {
    const rsvpId = encodeURIComponent(rsvp.id);
    const companions = await supabaseFetch(env, `/rest/v1/rsvp_companions?rsvp_id=eq.${rsvpId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    if (companions.error) return companions.error;
    if (!companions.response.ok) return json({ error: "Could not delete invite" }, 502);
  }
  const removedRsvps = await supabaseFetch(env, `/rest/v1/rsvps?event_key=eq.${encodeURIComponent(EVENT_KEY)}&guest_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (removedRsvps.error) return removedRsvps.error;
  if (!removedRsvps.response.ok) return json({ error: "Could not delete invite" }, 502);

  const removed = await supabaseFetch(env, `/rest/v1/guest_list?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (removed.error) return removed.error;
  if (!removed.response.ok) return json({ error: "Could not delete invite" }, 502);
  return json({ ok: true });
}

export function validateInviteUpdatePayload(body) {
  if (!body || typeof body !== "object") return { error: "Invalid invite" };
  const id = validEditableInviteId(body.id);
  if (!id) return { error: "Invalid invite" };

  const patch = {};
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string") return { error: "Invalid invite" };
    const name = body.name.trim().replace(/\s+/g, " ");
    if (name.length > 120) return { error: "Please give a shorter name." };
    if (name.length < 2) return { error: "Please give their name." };
    patch.name = name;
  }
  if (Object.hasOwn(body, "email")) {
    if (body.email != null && typeof body.email !== "string") return { error: "Invalid invite" };
    const email = normalizeEmail(body.email);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { error: "Please give a valid email." };
    patch.email = email || null;
  }
  if (Object.hasOwn(body, "phone")) {
    if (body.phone != null && typeof body.phone !== "string") return { error: "Invalid invite" };
    const phone = normalizePhone(body.phone);
    if (phone && phone.length > 40) return { error: "Please give a valid phone." };
    patch.phone = phone || null;
  }
  if (!Object.keys(patch).length) return { error: "Nothing to update" };
  return { ok: true, id, patch };
}

function validEditableInviteId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || id.length > 120) return "";
  if (id.startsWith("rsvp:") || id.startsWith("companion:")) return "";
  return id;
}

async function sendCreatedInviteEmail(env, requestUrl, invite) {
  if (!invite?.email) return { public: { attempted: false, sent: 0 }, patch: {} };
  const config = emailConfigFromEnv(env);
  if (config.error) return { public: { attempted: false, sent: 0, error: config.error }, patch: {} };
  const email = buildInviteEmail({
    to: invite.email,
    name: invite.name,
    inviteLink: buildInviteUrl(requestUrl, invite.id),
    config,
  });
  try {
    const { sendSmtpMail } = await import("../../_shared/smtp.js");
    await retryAsync(() => sendSmtpMail(config, email), { attempts: 2, delayMs: 350 });
  } catch (error) {
    return { public: { attempted: true, sent: 0, error: `Could not send invite email: ${String(error?.message || error)}` }, patch: {} };
  }

  const sentAt = new Date().toISOString();
  const sendCount = Number(invite.confirmation_email_send_count || 0) + 1;
  const patch = {
    confirmation_email_sent_at: sentAt,
    confirmation_email_send_count: sendCount,
    updated_at: sentAt,
  };
  const updated = await supabaseFetch(env, `/rest/v1/guest_list?id=eq.${encodeURIComponent(invite.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (updated.error) return { public: { attempted: true, sent: 1, error: "Invite email sent, but send status was not saved." }, patch: {} };
  if (!updated.response.ok) return { public: { attempted: true, sent: 1, error: "Invite email sent, but send status was not saved." }, patch: {} };
  return { public: { attempted: true, sent: 1 }, patch };
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

  const companions = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&order=created_at.desc&limit=1000`
  );
  if (companions.error) return companions.error;
  if (!companions.response.ok) return json({ error: "Could not load invites" }, 502);

  const rsvpRows = await rsvps.response.json();
  const rows = await invites.response.json();
  return json({
    ok: true,
    invites: mergeInviteRowsForStaff(request.url, {
      invites: rows,
      rsvps: rsvpRows,
      companions: await companions.response.json(),
    }),
  });
}

export function mergeInviteRowsForStaff(requestUrl, { invites = [], rsvps = [], companions = [] } = {}) {
  const rsvpByGuestId = new Map(rsvps.map((row) => [row.guest_id, row]));
  const inviteIds = new Set(invites.map((row) => row.id));
  const matchedRsvpIds = new Set();
  const rsvpsByEmail = new Map();
  const rsvpsByPhone = new Map();
  for (const rsvp of rsvps) {
    const email = contactEmailKey(rsvp.guest_email);
    const phone = contactPhoneKey(rsvp.guest_phone);
    if (email && !rsvpsByEmail.has(email)) rsvpsByEmail.set(email, rsvp);
    if (phone && !rsvpsByPhone.has(phone)) rsvpsByPhone.set(phone, rsvp);
  }
  const rows = invites.map((row) => {
    const rsvp = rsvpByGuestId.get(row.id) || rsvpsByEmail.get(contactEmailKey(row.email)) || rsvpsByPhone.get(contactPhoneKey(row.phone)) || null;
    if (rsvp) matchedRsvpIds.add(rsvp.id);
    return publicInvite(requestUrl, row, rsvp);
  });

  for (const rsvp of rsvps) {
    if (inviteIds.has(rsvp.guest_id)) continue;
    if (matchedRsvpIds.has(rsvp.id)) continue;
    rows.push(publicDirectRsvp(requestUrl, rsvp));
  }

  for (const companion of companions) {
    const parent = Array.isArray(companion.rsvps) ? companion.rsvps[0] : companion.rsvps;
    if (parent?.event_key && parent.event_key !== EVENT_KEY) continue;
    rows.push(publicCompanion(requestUrl, companion, parent));
  }

  return rows.sort((a, b) => new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime());
}

function contactEmailKey(value) {
  return String(value || "").trim().toLowerCase();
}

function contactPhoneKey(value) {
  return String(value || "").replace(/\D/g, "");
}

function publicInvite(requestUrl, row, rsvp) {
  const ticketToken = rsvp?.ticket_token || row.ticket_token || "";
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
    guestOf: "",
    source: "invite",
    submittedAt: rsvp?.submitted_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function publicDirectRsvp(requestUrl, rsvp) {
  return {
    id: `rsvp:${rsvp.id}`,
    name: rsvp.guest_name,
    email: rsvp.guest_email || "",
    phone: rsvp.guest_phone || "",
    ticketToken: rsvp.ticket_token || "",
    confirmationEmailSentAt: null,
    confirmationEmailSendCount: 0,
    inviteLink: "",
    confirmationLink: rsvp.confirmation_token ? buildConfirmationUrl(requestUrl, rsvp.confirmation_token) : "",
    ticketLink: rsvp.ticket_token ? buildTicketUrl(requestUrl, rsvp.ticket_token) : "",
    status: rsvp.status || "not_responded",
    rsvpName: rsvp.guest_name || "",
    rsvpEmail: rsvp.guest_email || "",
    rsvpPhone: rsvp.guest_phone || "",
    guestOf: "",
    source: "rsvp",
    submittedAt: rsvp.submitted_at || null,
    createdAt: rsvp.submitted_at || null,
    updatedAt: null,
  };
}

function publicCompanion(requestUrl, companion, parent) {
  return {
    id: `companion:${companion.id}`,
    name: companion.guest_name,
    email: companion.email || "",
    phone: companion.phone || "",
    ticketToken: companion.ticket_token || "",
    confirmationEmailSentAt: null,
    confirmationEmailSendCount: 0,
    inviteLink: "",
    confirmationLink: companion.confirmation_token ? buildConfirmationUrl(requestUrl, companion.confirmation_token) : "",
    ticketLink: companion.ticket_token ? buildTicketUrl(requestUrl, companion.ticket_token) : "",
    status: parent?.status || "not_responded",
    rsvpName: parent?.guest_name || "",
    rsvpEmail: companion.email || "",
    rsvpPhone: companion.phone || "",
    guestOf: parent?.guest_name || "",
    source: "companion",
    submittedAt: companion.created_at || parent?.submitted_at || null,
    createdAt: companion.created_at || parent?.submitted_at || null,
    updatedAt: null,
  };
}

export async function onRequest() {
  return methodNotAllowed();
}
