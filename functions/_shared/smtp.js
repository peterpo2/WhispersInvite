import { connect } from "cloudflare:sockets";
import { buildSmtpMimeMessage } from "./smtp-message.js";

const CRLF = "\r\n";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SMTP_READ_TIMEOUT_MS = 3500;
const SMTP_SESSION_TIMEOUT_MS = 4500;

export async function sendSmtpMail(config, message) {
  const secureTransport = smtpTransportMode(config);
  let socket = connect(
    { hostname: config.smtpHost, port: config.smtpPort },
    { secureTransport }
  );
  let activeSocket = socket;
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();
  let timedOut = false;
  const sessionTimeout = setTimeout(() => {
    timedOut = true;
    try {
      activeSocket.close();
    } catch {
      // Closing a timed-out socket is best effort.
    }
  }, Number(config.smtpTimeoutMs || SMTP_SESSION_TIMEOUT_MS));

  try {
    await readResponse(reader, 220);
    await command(writer, reader, `EHLO whisperssociety.com`, 250);
    if (secureTransport === "starttls") {
      await command(writer, reader, "STARTTLS", 220);
      writer.releaseLock();
      reader.releaseLock();
      socket = socket.startTls();
      activeSocket = socket;
      reader = socket.readable.getReader();
      writer = socket.writable.getWriter();
      await command(writer, reader, `EHLO whisperssociety.com`, 250);
    }
    await command(writer, reader, `AUTH PLAIN ${base64Auth(config.smtpUser, config.smtpPass)}`, 235);
    await command(writer, reader, `MAIL FROM:<${mailbox(config.from)}>`, 250);
    await command(writer, reader, `RCPT TO:<${mailbox(message.to)}>`, [250, 251]);
    await command(writer, reader, "DATA", 354);
    await writeLine(writer, buildSmtpMimeMessage(message));
    await readResponse(reader, 250);
    await command(writer, reader, "QUIT", 221);
    if (timedOut) throw new Error("SMTP session timed out");
  } finally {
    clearTimeout(sessionTimeout);
    try {
      writer.releaseLock();
      reader.releaseLock();
    } catch {
      // The Workers socket may already be closed after QUIT or a failed SMTP command.
    }
    try {
      activeSocket.close();
    } catch {
      // Best effort close.
    }
  }
}

function smtpTransportMode(config) {
  const secure = String(config.smtpSecure || "").toLowerCase();
  if (secure === "starttls") return "starttls";
  if (secure === "off") return "off";
  if (secure === "on" || secure === "tls") return "on";
  return Number(config.smtpPort) === 587 ? "starttls" : "on";
}

async function command(writer, reader, line, expected) {
  await writeLine(writer, line);
  return readResponse(reader, expected);
}

async function writeLine(writer, line) {
  await writer.write(encoder.encode(`${line}${CRLF}`));
}

async function readResponse(reader, expected) {
  const expectedCodes = Array.isArray(expected) ? expected : [expected];
  let text = "";
  for (;;) {
    const { value, done } = await readWithTimeout(reader);
    if (done) throw new Error("SMTP connection closed");
    text += decoder.decode(value, { stream: true });
    const lines = text.split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1] || "";
    const match = last.match(/^(\d{3}) /);
    if (!match) continue;
    const code = Number(match[1]);
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP rejected command (${code})`);
    }
    return text;
  }
}

async function readWithTimeout(reader) {
  let timeout;
  try {
    return await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("SMTP response timed out")), SMTP_READ_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function mailbox(value) {
  const match = String(value || "").match(/<([^<>@\s]+@[^<>\s]+)>/);
  if (match) return match[1];
  return String(value || "").trim();
}

function base64Auth(user, pass) {
  return bytesToBase64(encoder.encode(`\0${user}\0${pass}`));
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
