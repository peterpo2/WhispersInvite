const DEFAULT_FROM = "WHISPERS <noreply@whisperssociety.com>";
const DEFAULT_REPLY_TO = "guestlist@whisperssociety.com";
const DEFAULT_PHONE = "+359 888 012 380";

export function emailConfigFromEnv(env) {
  const smtpHost = String(env.SMTP_HOST || "").trim();
  const smtpPort = Number(env.SMTP_PORT || 465);
  const smtpUser = String(env.SMTP_USER || "").trim();
  const smtpPass = String(env.SMTP_PASS || "");
  const from = String(env.EMAIL_FROM || DEFAULT_FROM).trim();
  const replyTo = String(env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO).trim();
  const contactPhone = String(env.EMAIL_CONTACT_PHONE || DEFAULT_PHONE).trim();

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !from || !replyTo) {
    return { error: "Email is not configured" };
  }

  return { smtpHost, smtpPort, smtpUser, smtpPass, from, replyTo, contactPhone };
}

export function buildInviteEmail({ to, name, inviteLink, confirmationLink, config }) {
  const safeName = String(name || "").trim() || "Guest";
  const link = String(inviteLink || confirmationLink || "").trim();
  const contact = config.replyTo;
  const phone = config.contactPhone;
  const subject = "Your WHISPERS invitation";
  const text = [
    "WHISPERS",
    "",
    `${safeName},`,
    "",
    "You have been invited to WHISPERS.",
    "Please confirm your attendance using your private RSVP link:",
    "",
    link,
    "",
    "For questions:",
    contact,
    phone,
  ].join("\n");
  const html = `<!doctype html>
<html>
<body style="margin:0;background:#0B0908;color:#EDE6DA;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B0908;color:#EDE6DA;">
    <tr>
      <td align="center" style="padding:40px 18px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr><td style="font-family:Arial,sans-serif;letter-spacing:0.34em;text-transform:uppercase;color:#D9AE78;font-size:13px;text-align:center;">WHISPERS</td></tr>
          <tr><td style="height:28px;"></td></tr>
          <tr><td style="font-size:28px;line-height:1.2;text-align:center;color:#F6EFE4;">${escapeHtml(safeName)}</td></tr>
          <tr><td style="height:18px;"></td></tr>
          <tr><td style="font-size:20px;line-height:1.5;text-align:center;color:#EDE6DA;">You have been invited to WHISPERS.</td></tr>
          <tr><td style="height:10px;"></td></tr>
          <tr><td style="font-size:15px;line-height:1.6;text-align:center;color:#B4A99D;">Please confirm your attendance using your private RSVP link.</td></tr>
          <tr><td style="height:26px;"></td></tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(link)}" style="display:inline-block;border:1px solid #D9AE78;color:#0B0908;background:#D9AE78;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:0.22em;text-transform:uppercase;font-size:13px;padding:16px 24px;">Respond</a>
            </td>
          </tr>
          <tr><td style="height:30px;"></td></tr>
          <tr><td style="font-size:15px;line-height:1.6;text-align:center;color:#B4A99D;">For questions:<br><a href="mailto:${escapeHtml(contact)}" style="color:#D9AE78;">${escapeHtml(contact)}</a><br>${escapeHtml(phone)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    from: config.from,
    replyTo: config.replyTo,
    to,
    subject,
    text,
    html,
  };
}

export function buildRsvpConfirmationEmails({ guestName, guestEmail, plusOneName, plusOneEmail, confirmationLink, plusOneConfirmationLink, wantsTableReservation, config }) {
  const emails = [];
  const contact = config.replyTo;
  const phone = config.contactPhone;
  const primary = normalizeEmailForSend(guestEmail);
  const companion = normalizeEmailForSend(plusOneEmail);
  const safeGuest = String(guestName || "").trim() || "Guest";
  const safePlus = String(plusOneName || "").trim();

  if (primary) {
    emails.push(rsvpEmail({
      to: primary,
      name: safeGuest,
      title: "Your registration is confirmed.",
      lines: [
        safePlus ? `Registered with ${safePlus}.` : "Registered for one.",
        wantsTableReservation ? "Table reservation requested." : "",
        "Your private ticket and the confirmed location will be released on 09.10 at 18:00.",
        confirmationLink ? `Your confirmation link: ${confirmationLink}` : "",
      ].filter(Boolean),
      contact,
      phone,
      config,
    }));
  }

  if (companion && companion !== primary) {
    emails.push(rsvpEmail({
      to: companion,
      name: safePlus || "Guest",
      title: `You are registered as ${safeGuest}'s guest.`,
      lines: [
        "Your private ticket and the confirmed location will be released on 09.10 at 18:00.",
        plusOneConfirmationLink ? `Your confirmation link: ${plusOneConfirmationLink}` : "",
      ],
      contact,
      phone,
      config,
    }));
  }

  return emails;
}

export function buildTicketEmail({ to, name, ticketLink, guestOf, config }) {
  const safeName = String(name || "").trim() || "Guest";
  const link = String(ticketLink || "").trim();
  const subject = "WHISPERS Ticket";
  const contact = config.replyTo;
  const phone = config.contactPhone;
  const title = "Your private ticket is ready.";
  const lines = [
    guestOf ? `Guest of ${guestOf}.` : "",
    "Saturday 10 October · Doors 22:00",
    "Show this ticket at the door.",
  ].filter(Boolean);
  const text = [
    "WHISPERS",
    "",
    `${safeName},`,
    "",
    title,
    ...lines,
    "",
    "Open ticket:",
    link,
    "",
    "For questions:",
    contact,
    phone,
  ].join("\n");
  const htmlLines = lines.map((line) => `<tr><td style="font-size:15px;line-height:1.6;text-align:center;color:#B4A99D;">${escapeHtml(line)}</td></tr>`).join("");
  const html = `<!doctype html>
<html>
<body style="margin:0;background:#0B0908;color:#EDE6DA;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B0908;color:#EDE6DA;">
    <tr>
      <td align="center" style="padding:40px 18px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr><td style="font-family:Arial,sans-serif;letter-spacing:0.34em;text-transform:uppercase;color:#D9AE78;font-size:13px;text-align:center;">WHISPERS</td></tr>
          <tr><td style="height:28px;"></td></tr>
          <tr><td style="font-size:28px;line-height:1.2;text-align:center;color:#F6EFE4;">${escapeHtml(safeName)}</td></tr>
          <tr><td style="height:18px;"></td></tr>
          <tr><td style="font-size:20px;line-height:1.5;text-align:center;color:#EDE6DA;">${escapeHtml(title)}</td></tr>
          <tr><td style="height:12px;"></td></tr>
          ${htmlLines}
          <tr><td style="height:26px;"></td></tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(link)}" style="display:inline-block;border:1px solid #D9AE78;color:#0B0908;background:#D9AE78;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:0.22em;text-transform:uppercase;font-size:13px;padding:16px 24px;">Open Ticket</a>
            </td>
          </tr>
          <tr><td style="height:30px;"></td></tr>
          <tr><td style="font-size:15px;line-height:1.6;text-align:center;color:#B4A99D;">For questions:<br><a href="mailto:${escapeHtml(contact)}" style="color:#D9AE78;">${escapeHtml(contact)}</a><br>${escapeHtml(phone)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    from: config.from,
    replyTo: config.replyTo,
    to,
    subject,
    text,
    html,
  };
}

function rsvpEmail({ to, name, title, lines, contact, phone, config }) {
  const subject = "WHISPERS RSVP confirmed";
  const text = [
    "WHISPERS",
    "",
    `${name},`,
    "",
    title,
    ...lines,
    "",
    "For questions:",
    contact,
    phone,
  ].join("\n");
  const htmlLines = lines.map((line) => `<tr><td style="font-size:15px;line-height:1.6;text-align:center;color:#B4A99D;">${escapeHtml(line)}</td></tr>`).join("");
  const html = `<!doctype html>
<html>
<body style="margin:0;background:#0B0908;color:#EDE6DA;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B0908;color:#EDE6DA;">
    <tr>
      <td align="center" style="padding:40px 18px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr><td style="font-family:Arial,sans-serif;letter-spacing:0.34em;text-transform:uppercase;color:#D9AE78;font-size:13px;text-align:center;">WHISPERS</td></tr>
          <tr><td style="height:28px;"></td></tr>
          <tr><td style="font-size:28px;line-height:1.2;text-align:center;color:#F6EFE4;">${escapeHtml(name)}</td></tr>
          <tr><td style="height:18px;"></td></tr>
          <tr><td style="font-size:20px;line-height:1.5;text-align:center;color:#EDE6DA;">${escapeHtml(title)}</td></tr>
          <tr><td style="height:12px;"></td></tr>
          ${htmlLines}
          <tr><td style="height:30px;"></td></tr>
          <tr><td style="font-size:15px;line-height:1.6;text-align:center;color:#B4A99D;">For questions:<br><a href="mailto:${escapeHtml(contact)}" style="color:#D9AE78;">${escapeHtml(contact)}</a><br>${escapeHtml(phone)}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    from: config.from,
    replyTo: config.replyTo,
    to,
    subject,
    text,
    html,
  };
}

function normalizeEmailForSend(value) {
  return String(value || "").trim().toLowerCase();
}

export function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}
