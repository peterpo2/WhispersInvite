const CRLF = "\r\n";
const encoder = new TextEncoder();

export function buildSmtpMimeMessage(message, options = {}) {
  const boundary = `whispers-${(options.id || crypto.randomUUID()).replace(/-/g, "")}`;
  const messageId = options.id || crypto.randomUUID().replace(/-/g, "");
  const domain = options.domain || "whisperssociety.com";
  const now = options.now || new Date();
  return [
    `Message-ID: <${messageId}@${domain}>`,
    `Date: ${now.toUTCString()}`,
    `From: ${message.from}`,
    `To: ${message.to}`,
    `Reply-To: ${message.replyTo}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(message.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(message.html),
    `--${boundary}--`,
    ".",
  ].join(CRLF);
}

function dotStuff(value) {
  return String(value || "").replace(/\r?\n/g, CRLF).replace(/^\./gm, "..");
}

function encodeHeader(value) {
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${bytesToBase64(encoder.encode(value))}?=`;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
