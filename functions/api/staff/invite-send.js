import { json, methodNotAllowed } from "../../_shared/responses.js";
import { buildInviteEmail, emailConfigFromEnv } from "../../_shared/email-content.js";
import { sendSmtpMail } from "../../_shared/smtp.js";
import { supabaseFetch } from "../../_shared/supabase.js";

const COLUMNS = "id,name,email,confirmation_email_send_count";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid invite send" }, 400);
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id || id.length > 120) return json({ error: "Invalid invite send" }, 400);

  const found = await supabaseFetch(
    env,
    `/rest/v1/guest_list?select=${COLUMNS}&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  if (found.error) return found.error;
  if (!found.response.ok) return json({ error: "Could not send invite" }, 502);

  const [invite] = await found.response.json();
  if (!invite) return json({ error: "Invite not found" }, 404);
  if (!invite.email) return json({ error: "Invite has no email" }, 400);

  const config = emailConfigFromEnv(env);
  if (config.error) return json({ error: config.error }, 500);

  const confirmationLink = `${new URL(request.url).origin}/hi/${encodeURIComponent(invite.id)}`;
  try {
    await sendSmtpMail(config, buildInviteEmail({
      to: invite.email,
      name: invite.name,
      confirmationLink,
      config,
    }));
  } catch {
    return json({ error: "Could not send invite email" }, 502);
  }

  const sentAt = new Date().toISOString();
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

  return json({ ok: true, confirmationEmailSentAt: sentAt, confirmationEmailSendCount: sendCount });
}

export async function onRequest() {
  return methodNotAllowed();
}
