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
  assert.match(html, /id="reset"[\s\S]*id="cancelAttendance"/);
  assert.match(html, /class="btn caps small st"[^>]*id="cancelAttendance"/);
  assert.match(html, /\.btn\.small\{[^}]*min-height:44px/);
});

test("pre-release confirmation avoids repeated location release copy", () => {
  assert.match(html, /<p class="passfoot">Saturday <b>10 October<\/b> · Doors <b>22:00<\/b><span class="bringing" id="bringingLine">/);
  assert.doesNotMatch(html, /<p class="passfoot">Saturday <b>10 October<\/b> · Doors <b>22:00<\/b><br\/><span class="venue-line">Sofia · private location/);
});

test("personal invite contact step does not keep the shared name prompt", () => {
  assert.match(html, /id="identifyTitle"/);
  assert.match(html, /id="identifySub"/);
  assert.match(html, /Confirm your details\./);
  assert.match(html, /Your name is already on the list\. Please leave your email and phone so we can reach you\./);
});

test("ticket fallback and pending states are dark, not paper-white QR cards", () => {
  assert.match(ticketPage, /<main class="ticket loading">/);
  assert.match(ticketPage, /\.ticket\.loading\{opacity:0\}/);
  assert.match(ticketPage, /reveal=\(\)=>shell\.classList\.remove\('loading'\)/);
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

test("locked registered ticket shows event time before the release note", () => {
  assert.match(ticketPage, /<p class="state" id="state"><\/p>\s*<p class="small" id="ticketNote"><\/p>/);
  assert.match(ticketPage, /\$\('code'\)\.textContent='10\.10 · 22:00'/);
  assert.match(ticketPage, /\$\('qr'\)\.hidden=true/);
  assert.match(ticketPage, /\$\('state'\)\.textContent='Locked until release';\s*\$\('ticketNote'\)\.textContent='Your ticket will be released on 09\.10 at 18:00\.'/);
  assert.doesNotMatch(ticketPage, /\$\('code'\)\.textContent='09\.10 · 18:00'/);
  assert.doesNotMatch(ticketPage, /\$\('qr'\)\.textContent='Your ticket will be released on 09\.10 at 18:00\.'/);
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

test("public invitation shells use in-flow partner bars with real logo assets", () => {
  assert.match(html, /class="partner-bar"/);
  assert.match(html, /\/assets\/partner-beluga\.png/);
  assert.match(html, /\/assets\/partner-rothschild\.png/);
  assert.match(html, /partner-logo rothschild[\s\S]*partner-logo beluga/);
  assert.match(ticketPage, /partner-logo rothschild[\s\S]*partner-logo beluga/);
  assert.match(html, /\.screen > \.partner-bar\{position:relative/);
  assert.match(html, /<section class="screen" id="s-letter">[\s\S]*<aside aria-label="Event partners" class="partner-bar">/);
  assert.doesNotMatch(html, /<body data-scene="seal">[\s\S]*<aside aria-label="Event partners" class="partner-bar">[\s\S]*<section class="screen on" id="s-seal">/);
  assert.match(html, /\.partner-logos\{display:flex;align-items:center;justify-content:center;gap:12px;min-width:0\}/);
  assert.match(html, /\.partner-logo\.rothschild\{width:118px;height:45px\}/);
  assert.match(ticketPage, /\.partner-logo\.rothschild\{width:118px;height:45px\}/);
  assert.doesNotMatch(html, /\/assets\/partner-beluga-bv\.png/);
  assert.doesNotMatch(html, /\/assets\/partner-beluga\.jpg/);
  assert.doesNotMatch(html, /\/assets\/partner-rothschild\.jpg/);
  assert.doesNotMatch(html, /\/assets\/sponsor-1\.png/);
  assert.doesNotMatch(html, /\/assets\/sponsor-2\.png/);
  assert.match(ticketPage, /class="partner-bar"/);
  assert.match(ticketPage, /\/assets\/partner-beluga\.png/);
  assert.match(ticketPage, /\/assets\/partner-rothschild\.png/);
  assert.match(ticketPage, /\.ticket \+ \.partner-bar\{position:relative/);
  assert.doesNotMatch(ticketPage, /\/assets\/partner-beluga-bv\.png/);
  assert.doesNotMatch(ticketPage, /\/assets\/partner-beluga\.jpg/);
  assert.doesNotMatch(ticketPage, /\/assets\/partner-rothschild\.jpg/);
});

test("public floating actions sit above the partner bar", () => {
  assert.match(html, /--partner-clearance:104px/);
  assert.match(html, /--partner-action-clearance:78px/);
  assert.match(html, /\.screen\{[\s\S]*padding:[^}]*calc\(24px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /\.skip\{[\s\S]*bottom:calc\(var\(--partner-action-clearance\) \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /\.skip\{[\s\S]*z-index:70/);
});
