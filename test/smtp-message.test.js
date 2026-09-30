import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSmtpMimeMessage } from "../functions/_shared/smtp-message.js";

test("SMTP MIME message includes Gmail-required Message-ID and Date headers", () => {
  const message = buildSmtpMimeMessage({
    from: "WHISPERS <noreply@whisperssociety.com>",
    replyTo: "guestlist@whisperssociety.com",
    to: "guest@example.com",
    subject: "WHISPERS Door",
    text: "Hello",
    html: "<p>Hello</p>",
  }, {
    id: "abc123",
    now: new Date("2026-09-28T18:41:00Z"),
    domain: "whisperssociety.com",
  });

  assert.match(message, /^Message-ID: <abc123@whisperssociety\.com>\r\n/m);
  assert.match(message, /^Date: Mon, 28 Sep 2026 18:41:00 GMT\r\n/m);
});

test("SMTP transport allows enough time for production mail servers", () => {
  const smtpSource = readFileSync("functions/_shared/smtp.js", "utf8");

  assert.match(smtpSource, /const SMTP_READ_TIMEOUT_MS = 8000;/);
  assert.match(smtpSource, /const SMTP_SESSION_TIMEOUT_MS = 20000;/);
});
