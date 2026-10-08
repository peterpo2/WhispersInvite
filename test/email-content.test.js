import test from "node:test";
import assert from "node:assert/strict";
import { buildInviteEmail, buildRsvpConfirmationEmails, buildTicketEmail, emailConfigFromEnv } from "../functions/_shared/email-content.js";

test("invite email defaults to guestlist sender, guestlist reply-to and contact details", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "guestlist@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  assert.equal(config.from, "WHISPERS <guestlist@whisperssociety.com>");
  assert.equal(config.replyTo, "guestlist@whisperssociety.com");

  const email = buildInviteEmail({
    to: "guest@example.com",
    name: "Georgi Petrov",
    inviteLink: "https://whisperssociety.com/invite/abc123",
    config,
  });

  assert.equal(email.to, "guest@example.com");
  assert.equal(email.subject, "Your WHISPERS invitation - Georgi Petrov");
  assert.match(email.text, /Georgi Petrov/);
  assert.match(email.text, /Your invitation is waiting/);
  assert.match(email.text, /Open it below/);
  assert.doesNotMatch(email.text, /Your private invitation is waiting/);
  assert.doesNotMatch(email.text, /Open your personal RSVP link and complete the steps/);
  assert.doesNotMatch(email.text, /confirmation link/i);
  assert.match(email.text, /https:\/\/whisperssociety\.com\/invite\/abc123/);
  assert.doesNotMatch(email.text, /https:\/\/whisperssociety\.com\/hi\/abc123/);
  assert.match(email.text, /guestlist@whisperssociety\.com/);
  assert.match(email.text, /\+359 888 012 380/);
  assert.match(email.html, /guestlist@whisperssociety\.com/);
  assert.match(email.html, /\+359 888 012 380/);
  assert.match(email.html, /https:\/\/whisperssociety\.com\/assets\/whispers-lockup-transparent\.png/);
  assert.doesNotMatch(email.html, /whispers-lockup-dark\.png/);
  assert.doesNotMatch(email.html, /whispers-rose\.png/);
  assert.doesNotMatch(email.html, /https:\/\/whisperssociety\.com\/assets\/aviano-contrast\.ttf/);
  assert.match(email.html, /font-family:Georgia,'Times New Roman',serif/);
  assert.match(email.html, /background-image:radial-gradient/);
  assert.doesNotMatch(email.html, /text-shadow/);
  assert.doesNotMatch(email.html, /font-size:32px/);
  assert.doesNotMatch(email.html, /font-size:22px/);
  assert.doesNotMatch(email.html, />WHISPERS<\/td>/);
});

test("email config reports missing required sender settings", () => {
  const config = emailConfigFromEnv({});
  assert.equal(config.error, "Email is not configured");
});

test("RSVP confirmation email goes to the guest and their registered guest", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const emails = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    plusOneName: "Michelle G",
    plusOneEmail: "michaella@example.com",
    confirmationLink: "https://whisperssociety.com/confirmation/primaryconfirm",
    plusOneConfirmationLink: "https://whisperssociety.com/confirmation/plusconfirm",
    wantsTableReservation: true,
    config,
  });

  assert.equal(emails.length, 2);
  assert.equal(emails[0].to, "peter@example.com");
  assert.equal(emails[1].to, "michaella@example.com");
  assert.equal(emails[0].subject, "WHISPERS RSVP confirmed - Peter Popov");
  assert.match(emails[0].text, /Your registration is confirmed/);
  assert.match(emails[0].text, /https:\/\/whisperssociety\.com\/confirmation\/primaryconfirm/);
  assert.match(emails[0].text, /Michelle G/);
  assert.match(emails[0].text, /Table reservation requested/);
  assert.match(emails[0].text, /09\.10 at 18:00/);
  assert.match(emails[0].text, /Your confirmation is saved here:/);
  assert.match(emails[0].text, /Open confirmation:\nhttps:\/\/whisperssociety\.com\/confirmation\/primaryconfirm/);
  assert.doesNotMatch(emails[0].text, /You can confirm or update this before ticket release/);
  assert.match(emails[1].text, /You are registered as Peter Popov's guest/);
  assert.equal(emails[1].subject, "WHISPERS RSVP confirmed - Michelle G");
  assert.match(emails[1].text, /https:\/\/whisperssociety\.com\/confirmation\/plusconfirm/);
  assert.match(emails[1].text, /Your confirmation is saved here:/);
  assert.match(emails[0].html, /href="https:\/\/whisperssociety\.com\/confirmation\/primaryconfirm"/);
  assert.match(emails[0].html, />Open confirmation<\/a>/);
  assert.doesNotMatch(emails[0].html, />https:\/\/whisperssociety\.com\/confirmation\/primaryconfirm</);
  assert.doesNotMatch(emails[0].html, /font-size:32px/);
  assert.doesNotMatch(emails[0].html, /font-size:22px/);
  assert.match(emails[1].html, /guestlist@whisperssociety\.com/);
  assert.match(emails[1].html, /\+359 888 012 380/);
  assert.match(emails[0].html, /https:\/\/whisperssociety\.com\/assets\/whispers-lockup-transparent\.png/);
  assert.doesNotMatch(emails[0].html, /whispers-lockup-dark\.png/);
  assert.doesNotMatch(emails[0].html, /whispers-rose\.png/);
  assert.doesNotMatch(emails[0].html, /https:\/\/whisperssociety\.com\/assets\/aviano-contrast\.ttf/);
  assert.match(emails[0].html, /font-family:Georgia,'Times New Roman',serif/);
  assert.match(emails[0].html, /background-image:radial-gradient/);
  assert.doesNotMatch(emails[0].html, /text-shadow/);
  assert.doesNotMatch(emails[0].html, />WHISPERS<\/td>/);
});

test("RSVP confirmation email offers updates only when no guest is already added", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const emails = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    plusOneName: "",
    plusOneEmail: "",
    confirmationLink: "https://whisperssociety.com/confirmation/primaryconfirm",
    plusOneConfirmationLink: "",
    wantsTableReservation: false,
    config,
  });

  assert.equal(emails.length, 1);
  assert.match(emails[0].text, /You can confirm or update this before ticket release\./);
  assert.match(emails[0].text, /Update details:\nhttps:\/\/whisperssociety\.com\/confirmation\/primaryconfirm/);
  assert.match(emails[0].html, />Update details<\/a>/);
  assert.doesNotMatch(emails[0].text, /Your confirmation is saved here:/);
});

test("RSVP confirmation subjects include the guest name to avoid Gmail quote threading", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const [peter] = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    confirmationLink: "https://whisperssociety.com/confirmation/peter",
    wantsTableReservation: false,
    config,
  });
  const [berta] = buildRsvpConfirmationEmails({
    guestName: "Berta Gacheva",
    guestEmail: "berta@example.com",
    confirmationLink: "https://whisperssociety.com/confirmation/berta",
    wantsTableReservation: false,
    config,
  });

  assert.equal(peter.subject, "WHISPERS RSVP confirmed - Peter Popov");
  assert.equal(berta.subject, "WHISPERS RSVP confirmed - Berta Gacheva");
  assert.notEqual(peter.subject, berta.subject);
});

test("ticket release email uses the ticket link and polished WHISPERS copy", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const email = buildTicketEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    ticketLink: "https://whisperssociety.com/ticket/tickettoken",
    config,
  });

  assert.equal(email.subject, "Your WHISPERS Ticket - Peter Popov");
  assert.match(email.text, /Your private ticket is ready/);
  assert.match(email.text, /Coming on your own\./);
  assert.match(email.text, /Saturday 10 October\nDoors open at 22:00/);
  assert.doesNotMatch(email.text, /Saturday 10 October · Doors 22:00/);
  assert.doesNotMatch(email.text, /Bringing/);
  assert.doesNotMatch(email.text, /Guest of/);
  assert.match(email.text, /https:\/\/whisperssociety\.com\/ticket\/tickettoken/);
  assert.doesNotMatch(email.text, /https:\/\/whisperssociety\.com\/hi\//);
  assert.match(email.html, /Open Ticket/);
  assert.match(email.html, /https:\/\/whisperssociety\.com\/assets\/whispers-lockup-transparent\.png/);
  assert.doesNotMatch(email.html, /whispers-lockup-dark\.png/);
  assert.doesNotMatch(email.html, /whispers-rose\.png/);
  assert.doesNotMatch(email.html, /https:\/\/whisperssociety\.com\/assets\/aviano-contrast\.ttf/);
  assert.match(email.html, /font-family:Georgia,'Times New Roman',serif/);
  assert.match(email.html, /background-image:radial-gradient/);
  assert.doesNotMatch(email.html, /text-shadow/);
  assert.doesNotMatch(email.html, /font-size:32px/);
  assert.doesNotMatch(email.html, /font-size:22px/);
  assert.doesNotMatch(email.html, />WHISPERS<\/td>/);
});

test("ticket release email distinguishes primary and plus-one relationships and shows revealed venue", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });
  const venue = {
    name: "Junó Hotel Sofia",
    address: "Sofia Center, ul. \"Ivan Denkoglu\" 40",
  };

  const primary = buildTicketEmail({
    to: "primary@example.com",
    name: "Berta Gacheva",
    bringing: "Peter Popov",
    ticketLink: "https://whisperssociety.com/ticket/primarytoken",
    venue,
    config,
  });
  const plusOne = buildTicketEmail({
    to: "plus@example.com",
    name: "Peter Popov",
    guestOf: "Berta Gacheva",
    ticketLink: "https://whisperssociety.com/ticket/plustoken",
    venue,
    config,
  });

  assert.match(primary.text, /Bringing Peter Popov\./);
  assert.doesNotMatch(primary.text, /Guest of/);
  assert.match(primary.text, /The address is now revealed:\nJunó Hotel Sofia\nSofia Center, ul\. "Ivan Denkoglu" 40/);
  assert.match(primary.html, /Bringing Peter Popov\./);
  assert.match(primary.html, /The address is now revealed:/);
  assert.match(primary.html, /Junó Hotel Sofia/);
  assert.match(primary.html, /Sofia Center, ul\. &quot;Ivan Denkoglu&quot; 40/);

  assert.match(plusOne.text, /Guest of Berta Gacheva\./);
  assert.doesNotMatch(plusOne.text, /Bringing/);
  assert.match(plusOne.text, /The address is now revealed:\nJunó Hotel Sofia\nSofia Center, ul\. "Ivan Denkoglu" 40/);
});

test("email HTML uses Cyrillic-safe text fonts with roomier sentence spacing", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const invite = buildInviteEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    inviteLink: "https://whisperssociety.com/invite/token",
    config,
  });
  const [rsvp] = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    plusOneName: "Michelle G",
    plusOneEmail: "",
    confirmationLink: "https://whisperssociety.com/confirmation/token",
    wantsTableReservation: true,
    config,
  });
  const ticket = buildTicketEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    ticketLink: "https://whisperssociety.com/ticket/token",
    config,
  });

  for (const html of [invite.html, rsvp.html, ticket.html]) {
    assert.doesNotMatch(html, /@font-face\{font-family:'AvianoContrast'/);
    assert.match(html, /font-family:Georgia,'Times New Roman',serif/);
    assert.match(html, /font-family:'Trebuchet MS','Helvetica Neue',Arial,sans-serif/);
    assert.match(html, /line-height:1\.82/);
    assert.match(html, /padding:0 0 18px;/);
  }
});

test("email links share one visual style in Gmail-friendly inline CSS", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const invite = buildInviteEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    inviteLink: "https://whisperssociety.com/invite/token",
    config,
  });
  const [rsvp] = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    confirmationLink: "https://whisperssociety.com/confirmation/token",
    wantsTableReservation: false,
    config,
  });
  const ticket = buildTicketEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    ticketLink: "https://whisperssociety.com/ticket/token",
    config,
  });

  for (const html of [invite.html, rsvp.html, ticket.html]) {
    assert.match(html, /color:#FFF4E0!important;-webkit-text-fill-color:#FFF4E0/);
    assert.match(html, /color:#F8E7C8!important;-webkit-text-fill-color:#F8E7C8;font-weight:400/);
    assert.doesNotMatch(html, /color:#F6C987!important;-webkit-text-fill-color:#F6C987/);
    assert.match(html, /href="mailto:guestlist@whisperssociety\.com" style="[^"]*font-family:Georgia,'Times New Roman',serif[^"]*font-size:16px[^"]*text-decoration:none[^"]*color:#F8E7C8!important[^"]*font-weight:400/);
  }

  const ctaStyles = [invite.html, rsvp.html, ticket.html].map((html) => {
    const match = html.match(/<a href="https:\/\/whisperssociety\.com\/(?:invite|confirmation|ticket)\/token" style="([^"]+)"/);
    assert.ok(match);
    return match[1];
  });
  assert.deepEqual(ctaStyles, [ctaStyles[0], ctaStyles[0], ctaStyles[0]]);
  assert.match(ctaStyles[0], /font-family:'Trebuchet MS','Helvetica Neue',Arial,sans-serif/);
  assert.match(ctaStyles[0], /font-size:13px/);
  assert.match(ctaStyles[0], /color:#0B0908!important/);
  assert.match(ctaStyles[0], /text-decoration:none/);
});

test("email HTML keeps text high-contrast on dark mobile mail clients", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const invite = buildInviteEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    inviteLink: "https://whisperssociety.com/invite/token",
    config,
  });
  const [rsvp] = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    confirmationLink: "https://whisperssociety.com/confirmation/token",
    wantsTableReservation: true,
    config,
  });
  const ticket = buildTicketEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    ticketLink: "https://whisperssociety.com/ticket/token",
    config,
  });

  for (const html of [invite.html, rsvp.html, ticket.html]) {
    assert.match(html, /bgcolor="#100D0B"/);
    assert.match(html, /color:#FFF4E0!important/);
    assert.match(html, /color:#F8E7C8!important/);
    assert.match(html, /line-height:1\.82/);
    assert.match(html, /padding:0 0 18px;/);
    assert.doesNotMatch(html, /color:#FFF8EC/);
    assert.match(html, /background-image:radial-gradient/);
  }
});

test("email HTML uses a full-width dark WHISPERS gradient without the rose artwork", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  const invite = buildInviteEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    inviteLink: "https://whisperssociety.com/invite/token",
    config,
  });
  const [rsvp] = buildRsvpConfirmationEmails({
    guestName: "Peter Popov",
    guestEmail: "peter@example.com",
    confirmationLink: "https://whisperssociety.com/confirmation/token",
    wantsTableReservation: true,
    config,
  });
  const ticket = buildTicketEmail({
    to: "guest@example.com",
    name: "Peter Popov",
    ticketLink: "https://whisperssociety.com/ticket/token",
    config,
  });

  for (const html of [invite.html, rsvp.html, ticket.html]) {
    assert.match(html, /style="width:100%;min-width:100%;background-color:#100D0B;background-image:radial-gradient/);
    assert.match(html, /width:100%;min-width:100%;background-color:#130F0C/);
    assert.doesNotMatch(html, /background="https:\/\/whisperssociety\.com\/assets\/whispers-rose\.png"/);
    assert.doesNotMatch(html, /url\('https:\/\/whisperssociety\.com\/assets\/whispers-rose\.png'\)/);
    assert.doesNotMatch(html, /max-width:560px/);
    assert.doesNotMatch(html, /bgcolor="#ffffff"/i);
    assert.doesNotMatch(html, /background:#fff/i);
  }
});
