import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const ticketPage = readFileSync("functions/ticket/[token].js", "utf8");
const staffPage = readFileSync("functions/staff/rose-door-10.js", "utf8");
const rsvpApi = readFileSync("functions/api/rsvp.js", "utf8");

test("pre-release confirmation does not expose the private ticket action", () => {
  assert.match(html, /\[hidden\]\{display:none!important\}/);
  assert.match(html, /<button[^>]*hidden[^>]*id="saveTickets"/);
  assert.match(html, /\$\('#saveTickets'\)\.hidden=true/);
  assert.match(html, /Private ticket/);
});

test("pre-release confirmation message is not styled as a white QR card", () => {
  assert.match(html, /\.qr\.release-note\{[^}]*background:rgba\(8,6,5,\.\d+\)/);
  assert.doesNotMatch(html, /\.qr\.release-note\{[^}]*background:#F1E9DC/);
  assert.match(html, /\$\('#doneCopy'\)\.textContent=''/);
});

test("cancel attendance asks for confirmation before submitting", () => {
  assert.match(html, /confirm\('Are you sure you want to cancel your attendance\?'\)/);
});

test("personal invite contact step does not keep the shared name prompt", () => {
  assert.match(html, /id="identifyTitle"/);
  assert.match(html, /id="identifySub"/);
  assert.match(html, /Confirm your details\./);
  assert.match(html, /Your name is already on the list\. Please leave your email and phone so we can reach you\./);
});

test("ticket fallback and pending states are dark, not paper-white QR cards", () => {
  assert.match(ticketPage, /\.qr\{[^}]*background:rgba\(8,6,5,\.\d+\)/);
  assert.match(ticketPage, /\.qr\.ready\{[^}]*background:var\(--paper\)/);
  assert.match(ticketPage, /\.qr\.fallback\{[^}]*background:rgba\(8,6,5,\.\d+\)/);
  assert.match(ticketPage, /\.qr\.fallback\{[^}]*border:1px solid rgba\(217,174,120,\.\d+\)/);
  assert.doesNotMatch(ticketPage, /\.qr\{[^}]*background:var\(--paper\)/);
  assert.doesNotMatch(ticketPage, /\.qr\.fallback\{[^}]*background:var\(--paper\)/);
  assert.match(ticketPage, /darkQr\('This ticket link is invalid\.'\)/);
  assert.match(ticketPage, /darkQr\('Your ticket could not be loaded\. Please refresh to try again\.'\)/);
  assert.match(ticketPage, /id="ticketNote"><\/p>/);
  assert.match(ticketPage, /\$\('ticketNote'\)\.textContent=''/);
  assert.match(ticketPage, /\$\('ticketNote'\)\.textContent='Show this seal at the door\. The QR confirms your place in the WHISPERS list\.'/);
});

test("all public HTML shells use the WHISPERS tab icon", () => {
  for (const source of [html, ticketPage, staffPage]) {
    assert.match(source, /<link href="\/assets\/whispers-favicon\.png" rel="icon" type="image\/png"\/>/);
    assert.match(source, /<link href="\/assets\/whispers-favicon\.png" rel="apple-touch-icon"\/>/);
  }
});

test("ticket and staff pages share the WHISPERS rose atmosphere", () => {
  for (const source of [ticketPage, staffPage]) {
    assert.match(source, /\/assets\/whispers-rose\.png/);
    assert.match(source, /fractalNoise/);
    assert.match(source, /radial-gradient\(ellipse at 50% 45%/);
  }
});

test("successful RSVP moves the browser to the private ticket link", () => {
  assert.match(rsvpApi, /ticketUrl: attending && row\.ticket_token \? buildTicketUrl\(requestUrl, row\.ticket_token\) : null/);
  assert.match(html, /state\.ticketUrl=result\.data\?\.ticketUrl\|\|null/);
  assert.match(html, /history\.replaceState\(null,'',state\.ticketUrl\)/);
});

test("start over returns to the invitation entry point, not the replaced ticket URL", () => {
  assert.match(html, /const startUrl = urlToken \? '\/\?token=' \+ encodeURIComponent\(urlToken\) : '\/'/);
  assert.match(html, /function reset\(\)\{window\.location\.assign\(startUrl\)\}/);
  assert.doesNotMatch(html, /function reset\(\)\{location\.reload\(\)\}/);
});

test("sponsor footer stays hidden until real logos load", () => {
  assert.match(html, /\.sponsors\[hidden\]\{display:none\}/);
  assert.match(html, /img\.closest\('\.sponsors'\)\.hidden=true/);
  assert.match(html, /addEventListener\('load',\(\)=>\{img\.closest\('\.sponsors'\)\.hidden=false\}\)/);
});
