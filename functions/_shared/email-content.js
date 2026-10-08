const DEFAULT_FROM = "WHISPERS <guestlist@whisperssociety.com>";
const DEFAULT_REPLY_TO = "guestlist@whisperssociety.com";
const DEFAULT_PHONE = "+359 888 012 380";
const LOGO_URL = "https://whisperssociety.com/assets/whispers-lockup-transparent.png";
const EMAIL_SERIF = "Georgia,'Times New Roman',serif";
const EMAIL_SANS = "'Trebuchet MS','Helvetica Neue',Arial,sans-serif";
const EMAIL_BG = "#100D0B";
const EMAIL_PANEL = "#130F0C";
const EMAIL_HEADING = "#FFF4E0";
const EMAIL_TEXT = "#F8E7C8";

export function emailConfigFromEnv(env) {
  const smtpHost = String(env.SMTP_HOST || "").trim();
  const smtpPort = Number(env.SMTP_PORT || 465);
  const smtpSecure = String(env.SMTP_SECURE || "").trim().toLowerCase();
  const smtpUser = String(env.SMTP_USER || "").trim();
  const smtpPass = String(env.SMTP_PASS || "");
  const from = String(env.EMAIL_FROM || DEFAULT_FROM).trim();
  const replyTo = String(env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO).trim();
  const contactPhone = String(env.EMAIL_CONTACT_PHONE || DEFAULT_PHONE).trim();

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !from || !replyTo) {
    return { error: "Email is not configured" };
  }

  return { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, from, replyTo, contactPhone };
}

export function buildInviteEmail({ to, name, inviteLink, confirmationLink, config }) {
  const safeName = String(name || "").trim() || "Guest";
  const link = String(inviteLink || confirmationLink || "").trim();
  const contact = config.replyTo;
  const phone = config.contactPhone;
  const subject = `Your WHISPERS invitation - ${safeName}`;
  const text = [
    "WHISPERS",
    "",
    `${safeName},`,
    "",
    "Your invitation is waiting.",
    "Open it below:",
    "",
    link,
    "",
    "For questions:",
    contact,
    phone,
  ].join("\n");
  const html = `<!doctype html>
<html style="margin:0;padding:0;background:${EMAIL_BG};">
${emailHead()}
<body bgcolor="${EMAIL_BG}" style="margin:0;padding:0;background:${EMAIL_BG};color:${EMAIL_TEXT};font-family:${EMAIL_SERIF};border:0;outline:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BG}" style="${emailBackdropStyle(EMAIL_BG)};color:${EMAIL_TEXT};border-collapse:collapse;border-spacing:0;border:0;outline:0;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" bgcolor="${EMAIL_BG}" style="padding:0;${emailBackdropStyle(EMAIL_BG)};border:0;outline:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${emailShellStyle()}">
          ${brandHeader()}
          <tr><td style="height:28px;"></td></tr>
          <tr><td style="${nameStyle()}"><font color="${EMAIL_HEADING}"><span style="color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};">${escapeHtml(safeName)}</span></font></td></tr>
          <tr><td style="height:20px;"></td></tr>
          <tr><td style="${titleStyle()}"><font color="${EMAIL_HEADING}"><span style="color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};">Your invitation is waiting.</span></font></td></tr>
          <tr><td style="height:14px;"></td></tr>
          ${copyLine("Open it below.", 17)}
          <tr><td style="height:26px;"></td></tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(link)}" style="${buttonStyle("0.22em", 13, "17px 30px")}">Respond</a>
            </td>
          </tr>
          <tr><td style="height:30px;"></td></tr>
          ${contactLine(contact, phone, 17)}
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
  const hasCompanion = Boolean(safePlus || companion);

  if (primary) {
    emails.push(rsvpEmail({
      to: primary,
      name: safeGuest,
      title: "Your registration is confirmed.",
      lines: [
        safePlus ? `Registered with ${safePlus}.` : "Registered for one.",
        wantsTableReservation ? "Table reservation requested." : "",
        "Your private ticket and the confirmed location will be released on 09.10 at 18:00.",
        confirmationLink ? (hasCompanion ? "Your confirmation is saved here:" : "You can confirm or update this before ticket release.") : "",
      ].filter(Boolean),
      actionLink: confirmationLink,
      actionLabel: hasCompanion ? "Open confirmation" : "Update details",
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
        plusOneConfirmationLink ? "Your confirmation is saved here:" : "",
      ].filter(Boolean),
      actionLink: plusOneConfirmationLink,
      actionLabel: "Open confirmation",
      contact,
      phone,
      config,
    }));
  }

  return emails;
}

export function buildTicketEmail({ to, name, ticketLink, guestOf, bringing, venue, config }) {
  const safeName = String(name || "").trim() || "Guest";
  const link = String(ticketLink || "").trim();
  const subject = `Your WHISPERS Ticket - ${safeName}`;
  const contact = config.replyTo;
  const phone = config.contactPhone;
  const title = "Your private ticket is ready.";
  const safeVenueName = String(venue?.name || "").trim();
  const safeVenueAddress = String(venue?.address || "").trim();
  const lines = [
    guestOf ? `Guest of ${guestOf}.` : "",
    !guestOf && bringing ? `Bringing ${bringing}.` : "",
    !guestOf && !bringing ? "Coming on your own." : "",
    "Saturday 10 October",
    "Doors open at 22:00",
    safeVenueName || safeVenueAddress ? "The address is now revealed:" : "",
    safeVenueName,
    safeVenueAddress,
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
  const htmlLines = lines.map((line) => copyLine(line, 17)).join("");
  const html = `<!doctype html>
<html style="margin:0;padding:0;background:${EMAIL_BG};">
${emailHead()}
<body bgcolor="${EMAIL_BG}" style="margin:0;padding:0;background:${EMAIL_BG};color:${EMAIL_TEXT};font-family:${EMAIL_SERIF};border:0;outline:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BG}" style="${emailBackdropStyle(EMAIL_BG)};color:${EMAIL_TEXT};border-collapse:collapse;border-spacing:0;border:0;outline:0;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" bgcolor="${EMAIL_BG}" style="padding:0;${emailBackdropStyle(EMAIL_BG)};border:0;outline:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${emailShellStyle()}">
          ${brandHeader()}
          <tr><td style="height:28px;"></td></tr>
          <tr><td style="${nameStyle()}"><font color="${EMAIL_HEADING}"><span style="color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};">${escapeHtml(safeName)}</span></font></td></tr>
          <tr><td style="height:20px;"></td></tr>
          <tr><td style="${titleStyle()}"><font color="${EMAIL_HEADING}"><span style="color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};">${escapeHtml(title)}</span></font></td></tr>
          <tr><td style="height:14px;"></td></tr>
          ${htmlLines}
          <tr><td style="height:26px;"></td></tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(link)}" style="${buttonStyle("0.22em", 13, "17px 30px")}">Open Ticket</a>
            </td>
          </tr>
          <tr><td style="height:30px;"></td></tr>
          ${contactLine(contact, phone, 17)}
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

function rsvpEmail({ to, name, title, lines, actionLink, actionLabel, contact, phone, config }) {
  const subject = `WHISPERS RSVP confirmed - ${String(name || "Guest").trim() || "Guest"}`;
  const text = [
    "WHISPERS",
    "",
    `${name},`,
    "",
    title,
    ...lines,
    "",
    actionLink ? `${actionLabel}:` : "",
    actionLink || "",
    "",
    "For questions:",
    contact,
    phone,
  ].join("\n");
  const safeActionLink = String(actionLink || "").trim();
  const safeActionLabel = String(actionLabel || "Open confirmation").trim();
  const htmlLines = lines.map((line) => copyLine(line, 16)).join("");
  const actionHtml = safeActionLink ? `<tr><td style="height:22px;"></td></tr>
          <tr>
            <td align="center">
              <a href="${escapeHtml(safeActionLink)}" style="${buttonStyle("0.18em", 12, "15px 24px")}">${escapeHtml(safeActionLabel)}</a>
            </td>
          </tr>` : "";
  const html = `<!doctype html>
<html style="margin:0;padding:0;background:${EMAIL_BG};">
${emailHead()}
<body bgcolor="${EMAIL_BG}" style="margin:0;padding:0;background:${EMAIL_BG};color:${EMAIL_TEXT};font-family:${EMAIL_SERIF};border:0;outline:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BG}" style="${emailBackdropStyle(EMAIL_BG)};color:${EMAIL_TEXT};border-collapse:collapse;border-spacing:0;border:0;outline:0;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center" bgcolor="${EMAIL_BG}" style="padding:0;${emailBackdropStyle(EMAIL_BG)};border:0;outline:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${emailShellStyle()}">
          ${brandHeader()}
          <tr><td style="height:24px;"></td></tr>
          <tr><td style="${nameStyle()}"><font color="${EMAIL_HEADING}"><span style="color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};">${escapeHtml(name)}</span></font></td></tr>
          <tr><td style="height:20px;"></td></tr>
          <tr><td style="${titleStyle()}"><font color="${EMAIL_HEADING}"><span style="color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};">${escapeHtml(title)}</span></font></td></tr>
          <tr><td style="height:14px;"></td></tr>
          ${htmlLines}
          ${actionHtml}
          <tr><td style="height:28px;"></td></tr>
          ${contactLine(contact, phone, 16)}
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

function brandHeader() {
  return `<tr><td align="center" style="padding:4px 0 20px;"><img alt="WHISPERS" src="${LOGO_URL}" width="260" height="119" style="display:block;width:260px;max-width:82%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;background:transparent;"/></td></tr>
  <tr><td align="center" style="padding:4px 0 0;"><table role="presentation" width="78" cellspacing="0" cellpadding="0"><tr><td style="height:1px;background:#8B6F4C;font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`;
}

function emailHead() {
  return `<head><meta name="color-scheme" content="only light"><meta name="supported-color-schemes" content="only light"></head>`;
}

function nameStyle() {
  return `font-size:27px;line-height:1.2;text-align:center;color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};font-weight:400;font-family:${EMAIL_SERIF};`;
}

function titleStyle() {
  return `font-size:19px;line-height:1.5;text-align:center;color:${EMAIL_HEADING}!important;-webkit-text-fill-color:${EMAIL_HEADING};font-weight:400;font-family:${EMAIL_SERIF};`;
}

function copyLine(line, fontSize) {
  return `<tr><td style="font-size:${fontSize}px;line-height:1.82;text-align:center;color:${EMAIL_TEXT}!important;-webkit-text-fill-color:${EMAIL_TEXT};font-weight:400;font-family:${EMAIL_SERIF};padding:0 0 18px;"><font color="${EMAIL_TEXT}"><span style="color:${EMAIL_TEXT}!important;-webkit-text-fill-color:${EMAIL_TEXT};">${escapeHtml(line)}</span></font></td></tr>`;
}

function contactLine(contact, phone, fontSize) {
  return `<tr><td style="font-size:${fontSize}px;line-height:1.82;text-align:center;color:${EMAIL_TEXT}!important;-webkit-text-fill-color:${EMAIL_TEXT};font-weight:400;font-family:${EMAIL_SERIF};padding:0 0 18px;"><font color="${EMAIL_TEXT}"><span style="color:${EMAIL_TEXT}!important;-webkit-text-fill-color:${EMAIL_TEXT};">For questions:</span></font><br><a href="mailto:${escapeHtml(contact)}" style="${textLinkStyle()}">${escapeHtml(contact)}</a><br><font color="${EMAIL_TEXT}"><span style="color:${EMAIL_TEXT}!important;-webkit-text-fill-color:${EMAIL_TEXT};">${escapeHtml(phone)}</span></font></td></tr>`;
}

function textLinkStyle() {
  return `font-family:${EMAIL_SERIF};font-size:16px;line-height:1.82;text-decoration:none;color:${EMAIL_TEXT}!important;-webkit-text-fill-color:${EMAIL_TEXT};font-weight:400;`;
}

function buttonStyle() {
  return `display:inline-block;border:1px solid #F6C987;color:#0B0908!important;-webkit-text-fill-color:#0B0908;background:#E2B578!important;text-decoration:none;font-family:${EMAIL_SANS};letter-spacing:0.22em;text-transform:uppercase;font-size:13px;font-weight:bold;padding:17px 30px;`;
}

function emailShellStyle() {
  return [
    "width:100%",
    "min-width:100%",
    `background-color:${EMAIL_PANEL}`,
    emailBackgroundImage(),
    "background-repeat:no-repeat,no-repeat,no-repeat",
    "background-position:center bottom,center top,center center",
    "background-size:100% 100%,100% 100%,100% 100%",
    "border:0",
    "box-shadow:none",
  ].join(";");
}

function emailBackdropStyle(color) {
  return [
    "width:100%",
    "min-width:100%",
    `background-color:${color}`,
    emailBackgroundImage(),
    "background-repeat:no-repeat,no-repeat,no-repeat",
    "background-position:center bottom,center top,center center",
    "background-size:100% 100%,100% 100%,100% 100%",
  ].join(";");
}

function emailBackgroundImage() {
  return "background-image:radial-gradient(120% 72% at 50% 116%,rgba(80,43,24,.34) 0%,rgba(31,20,14,.22) 42%,transparent 68%),radial-gradient(92% 58% at 50% -12%,rgba(217,174,120,.12) 0%,rgba(217,174,120,.04) 42%,transparent 68%),linear-gradient(180deg,#18120E 0%,#100D0B 48%,#0B0908 100%)";
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
