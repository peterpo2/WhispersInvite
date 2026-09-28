import test from "node:test";
import assert from "node:assert/strict";
import { buildInviteEmail, buildRsvpConfirmationEmails, emailConfigFromEnv } from "../functions/_shared/email-content.js";

test("invite email uses noreply sender, guestlist reply-to and contact details", () => {
  const config = emailConfigFromEnv({
    SMTP_HOST: "mail.whisperssociety.com",
    SMTP_PORT: "465",
    SMTP_USER: "noreply@whisperssociety.com",
    SMTP_PASS: "secret",
    EMAIL_FROM: "WHISPERS <noreply@whisperssociety.com>",
    EMAIL_REPLY_TO: "guestlist@whisperssociety.com",
    EMAIL_CONTACT_PHONE: "+359 888 012 380",
  });

  assert.equal(config.from, "WHISPERS <noreply@whisperssociety.com>");
  assert.equal(config.replyTo, "guestlist@whisperssociety.com");

  const email = buildInviteEmail({
    to: "guest@example.com",
    name: "Georgi Petrov",
    inviteLink: "https://whisperssociety.com/invite/abc123",
    config,
  });

  assert.equal(email.to, "guest@example.com");
  assert.equal(email.subject, "Your WHISPERS invitation");
  assert.match(email.text, /Georgi Petrov/);
  assert.match(email.text, /You have been invited to WHISPERS/);
  assert.doesNotMatch(email.text, /private invitation is waiting/i);
  assert.match(email.text, /https:\/\/whisperssociety\.com\/invite\/abc123/);
  assert.doesNotMatch(email.text, /https:\/\/whisperssociety\.com\/hi\/abc123/);
  assert.match(email.text, /guestlist@whisperssociety\.com/);
  assert.match(email.text, /\+359 888 012 380/);
  assert.match(email.html, /guestlist@whisperssociety\.com/);
  assert.match(email.html, /\+359 888 012 380/);
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
    confirmationLink: "https://whisperssociety.com/hi/primaryconfirm",
    plusOneConfirmationLink: "https://whisperssociety.com/hi/plusconfirm",
    wantsTableReservation: true,
    config,
  });

  assert.equal(emails.length, 2);
  assert.equal(emails[0].to, "peter@example.com");
  assert.equal(emails[1].to, "michaella@example.com");
  assert.equal(emails[0].subject, "WHISPERS RSVP confirmed");
  assert.match(emails[0].text, /Your registration is confirmed/);
  assert.match(emails[0].text, /https:\/\/whisperssociety\.com\/hi\/primaryconfirm/);
  assert.match(emails[0].text, /Michelle G/);
  assert.match(emails[0].text, /Table reservation requested/);
  assert.match(emails[0].text, /09\.10 at 18:00/);
  assert.match(emails[1].text, /You are registered as Peter Popov's guest/);
  assert.match(emails[1].text, /https:\/\/whisperssociety\.com\/hi\/plusconfirm/);
  assert.match(emails[1].html, /guestlist@whisperssociety\.com/);
  assert.match(emails[1].html, /\+359 888 012 380/);
});
