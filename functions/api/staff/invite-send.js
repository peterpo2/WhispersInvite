import { json, methodNotAllowed } from "../../_shared/responses.js";
import { buildInviteEmail, buildRsvpConfirmationEmails, buildTicketEmail, emailConfigFromEnv } from "../../_shared/email-content.js";
import { EVENT_KEY, buildConfirmationUrl, buildInviteUrl, buildTicketUrl } from "../../_shared/rsvp.js";
import { sendSmtpMail } from "../../_shared/smtp.js";
import { requireStaff } from "../../_shared/staff-auth.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const COLUMNS = "id,name,email,confirmation_email_send_count";
const RSVP_COLUMNS = "id,guest_id,guest_name,guest_email,status,confirmation_token,ticket_token,wants_table_reservation";
const COMPANION_COLUMNS = "id,rsvp_id,guest_name,email,confirmation_token,ticket_token";
const COMPANION_DIRECT_COLUMNS = "id,rsvp_id,guest_name,email,confirmation_token,ticket_token,rsvps!inner(guest_name,event_key,status,wants_table_reservation)";
const EVENT_DETAILS_COLUMNS = "venue_name,venue_address";
const SEND_TYPES = new Set(["invite", "confirmation", "ticket"]);

export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env, "admin");
  if (staff.error) return staff.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid invite send" }, 400);
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const type = typeof body?.type === "string" ? body.type.trim() : "invite";
  if (!id || id.length > 120) return json({ error: "Invalid invite send" }, 400);
  if (!SEND_TYPES.has(type)) return json({ error: "Invalid invite send" }, 400);

  const config = emailConfigFromEnv(env);
  if (config.error) return json({ error: config.error }, 500);

  if (id.startsWith("rsvp:")) {
    if (type === "invite") return json({ error: "Direct registrations do not have invite emails" }, 400);
    const built = await buildDirectRsvpEmails({ env, requestUrl: request.url, id: id.slice(5), type, config });
    const sent = await sendBuiltEmails({ config, built, type });
    if (sent) return sent;
    return json({ ok: true, type, sentAt: new Date().toISOString(), sent: built.emails.length });
  }

  if (id.startsWith("companion:")) {
    if (type === "invite") return json({ error: "Added guests do not have invite emails" }, 400);
    const built = await buildCompanionEmails({ env, requestUrl: request.url, id: id.slice(10), type, config });
    const sent = await sendBuiltEmails({ config, built, type });
    if (sent) return sent;
    return json({ ok: true, type, sentAt: new Date().toISOString(), sent: built.emails.length });
  }

  const found = await supabaseFetch(
    env,
    `/rest/v1/guest_list?select=${COLUMNS}&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  if (found.error) return found.error;
  if (!found.response.ok) return json({ error: "Could not send invite" }, 502);

  const [invite] = await found.response.json();
  if (!invite) return json({ error: "Invite not found" }, 404);

  const built = await buildEmailsForType({ env, requestUrl: request.url, invite, type, config });
  const sent = await sendBuiltEmails({ config, built, type });
  if (sent) return sent;

  const sentAt = new Date().toISOString();
  if (type !== "invite") {
    return json({ ok: true, type, sentAt, sent: built.emails.length });
  }

  const sendCount = Number(invite.confirmation_email_send_count || 0) + 1;
  const updated = await supabaseFetch(
    env,
    `/rest/v1/guest_list?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        confirmation_email_sent_at: sentAt,
        confirmation_email_send_count: sendCount,
        updated_at: sentAt,
      }),
    }
  );
  if (updated.error) return updated.error;
  if (!updated.response.ok) return json({ error: "Could not send invite" }, 502);

  return json({ ok: true, type, confirmationEmailSentAt: sentAt, confirmationEmailSendCount: sendCount, sent: built.emails.length });
}

async function sendBuiltEmails({ config, built, type }) {
  if (built.error instanceof Response) return built.error;
  if (built.error) return json({ error: built.error }, built.status || 400);

  try {
    for (const email of built.emails) {
      await sendSmtpMail(config, email);
    }
  } catch {
    return json({ error: `Could not send ${type} email` }, 502);
  }
  return null;
}

async function buildEmailsForType({ env, requestUrl, invite, type, config }) {
  if (type === "invite") {
    if (!invite.email) return { error: "Invite has no email", status: 400 };
    return {
      emails: [
        buildInviteEmail({
          to: invite.email,
          name: invite.name,
          inviteLink: buildInviteUrl(requestUrl, invite.id),
          config,
        }),
      ],
    };
  }

  const found = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${RSVP_COLUMNS}&event_key=eq.${encodeURIComponent(EVENT_KEY)}&guest_id=eq.${encodeURIComponent(invite.id)}&limit=1`
  );
  if (found.error) return { error: found.error };
  if (!found.response.ok) return { error: "Could not load registration", status: 502 };

  const [rsvp] = await found.response.json();
  if (!rsvp || rsvp.status !== "attending") return { error: "Invite is not registered", status: 400 };

  const companionsFound = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&rsvp_id=eq.${encodeURIComponent(rsvp.id)}&limit=10`
  );
  if (companionsFound.error) return { error: companionsFound.error };
  if (!companionsFound.response.ok) return { error: "Could not load registration", status: 502 };
  const companions = await companionsFound.response.json();

  return buildRegistrationEmails({ env, requestUrl, rsvp, companions, type, config });
}

async function buildDirectRsvpEmails({ env, requestUrl, id, type, config }) {
  const found = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=${RSVP_COLUMNS}&id=eq.${encodeURIComponent(id)}&event_key=eq.${encodeURIComponent(EVENT_KEY)}&limit=1`
  );
  if (found.error) return { error: found.error };
  if (!found.response.ok) return { error: "Could not load registration", status: 502 };
  const [rsvp] = await found.response.json();
  if (!rsvp || rsvp.status !== "attending") return { error: "Registration is not attending", status: 400 };

  const companionsFound = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_COLUMNS}&rsvp_id=eq.${encodeURIComponent(rsvp.id)}&limit=10`
  );
  if (companionsFound.error) return { error: companionsFound.error };
  if (!companionsFound.response.ok) return { error: "Could not load registration", status: 502 };
  return buildRegistrationEmails({ env, requestUrl, rsvp, companions: await companionsFound.response.json(), type, config });
}

async function buildCompanionEmails({ env, requestUrl, id, type, config }) {
  const found = await supabaseFetch(
    env,
    `/rest/v1/rsvp_companions?select=${COMPANION_DIRECT_COLUMNS}&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  if (found.error) return { error: found.error };
  if (!found.response.ok) return { error: "Could not load added guest", status: 502 };
  const [companion] = await found.response.json();
  const parent = Array.isArray(companion?.rsvps) ? companion.rsvps[0] : companion?.rsvps;
  if (!companion || parent?.event_key !== EVENT_KEY || parent?.status !== "attending") return { error: "Added guest is not registered", status: 400 };
  if (type === "confirmation") {
    const emails = buildRsvpConfirmationEmails({
      guestName: parent.guest_name,
      guestEmail: "",
      plusOneName: companion.guest_name,
      plusOneEmail: companion.email,
      confirmationLink: "",
      plusOneConfirmationLink: companion.confirmation_token ? buildConfirmationUrl(requestUrl, companion.confirmation_token) : "",
      wantsTableReservation: parent.wants_table_reservation === true,
      config,
    });
    if (!emails.length) return { error: "No confirmation email available", status: 400 };
    return { emails };
  }

  const venue = await loadTicketEmailVenue(env);
  if (venue.error instanceof Response) return { error: venue.error };
  if (venue.error) return { error: venue.error, status: 502 };
  if (!companion.email || !companion.ticket_token) return { error: "No ticket email available", status: 400 };
  return {
    emails: [buildTicketEmail({
      to: companion.email,
      name: companion.guest_name,
      guestOf: parent.guest_name,
      ticketLink: buildTicketUrl(requestUrl, companion.ticket_token),
      venue: venue.value,
      config,
    })],
  };
}

async function buildRegistrationEmails({ env, requestUrl, rsvp, companions, type, config }) {
  if (type === "confirmation") {
    const firstCompanion = companions.find((item) => item.email && item.confirmation_token) || null;
    const emails = buildRsvpConfirmationEmails({
      guestName: rsvp.guest_name,
      guestEmail: rsvp.guest_email,
      plusOneName: firstCompanion?.guest_name || "",
      plusOneEmail: firstCompanion?.email || "",
      confirmationLink: rsvp.confirmation_token ? buildConfirmationUrl(requestUrl, rsvp.confirmation_token) : "",
      plusOneConfirmationLink: firstCompanion?.confirmation_token ? buildConfirmationUrl(requestUrl, firstCompanion.confirmation_token) : "",
      wantsTableReservation: rsvp.wants_table_reservation === true,
      config,
    });
    if (!emails.length) return { error: "No confirmation email available", status: 400 };
    return { emails };
  }

  const emails = [];
  const venue = await loadTicketEmailVenue(env);
  if (venue.error instanceof Response) return { error: venue.error };
  if (venue.error) return { error: venue.error, status: 502 };
  const firstCompanionName = companions.find((item) => item.guest_name)?.guest_name || "";
  if (rsvp.guest_email && rsvp.ticket_token) {
    emails.push(buildTicketEmail({
      to: rsvp.guest_email,
      name: rsvp.guest_name,
      bringing: firstCompanionName,
      ticketLink: buildTicketUrl(requestUrl, rsvp.ticket_token),
      venue: venue.value,
      config,
    }));
  }
  for (const companion of companions) {
    if (!companion.email || !companion.ticket_token) continue;
    emails.push(buildTicketEmail({
      to: companion.email,
      name: companion.guest_name,
      guestOf: rsvp.guest_name,
      ticketLink: buildTicketUrl(requestUrl, companion.ticket_token),
      venue: venue.value,
      config,
    }));
  }
  if (!emails.length) return { error: "No ticket email available", status: 400 };
  return { emails };
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

export async function onRequest() {
  return methodNotAllowed();
}
