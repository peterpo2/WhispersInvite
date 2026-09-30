import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const ticketPage = readFileSync("functions/ticket/[token].js", "utf8");
const confirmationPage = readFileSync("functions/hi/[token].js", "utf8");
const staffPage = readFileSync("functions/staff/rose-door-10.js", "utf8");
const rsvpApi = readFileSync("functions/api/rsvp.js", "utf8");
const sectionHtml = (id) => {
  const match = html.match(new RegExp(`<section[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/section>`));
  assert.ok(match, `Missing section ${id}`);
  return match[1];
};

test("pre-release confirmation uses the approved save ticket action", () => {
  assert.match(html, /\[hidden\]\{display:none!important\}/);
  assert.match(html, /<button[^>]*hidden[^>]*id="saveTickets"/);
  assert.match(html, /\$\('#saveTickets'\)\.hidden=true/);
  assert.match(html, />Save your ticket<\/button>/);
  assert.doesNotMatch(html, />Private ticket<\/button>/);
});

test("pre-release confirmation message is not styled as a white QR card", () => {
  assert.match(html, /\.qr\.release-note\{[^}]*background:rgba\(8,6,5,\.\d+\)/);
  assert.doesNotMatch(html, /\.qr\.release-note\{[^}]*background:#F1E9DC/);
  assert.match(html, /\$\('#doneCopy'\)\.textContent=''/);
});

test("confirmed RSVP offers only a clear cancellation action", () => {
  assert.match(html, /confirm\('This releases your place\. You can register again until 09\.10 at 18:00\.'\)/);
  assert.doesNotMatch(html, /id="reset"[^>]*>Start over<\/button>/);
  assert.match(html, /id="cancelAttendance"[^>]*>I can no longer come<\/button>/);
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
  assert.match(html, /<h2 class="lede st" hidden id="identifyTitle"><\/h2>/);
  assert.doesNotMatch(html, />Write your name\.<\/h2>/);
  assert.match(html, /Confirm your details\./);
  assert.match(html, /\$\('#identifyTitle'\)\.hidden = false/);
  assert.match(html, /Your name is already on the list\. Please leave your email and phone so we can send you your ticket\./);
});

test("phone input normalizes Bulgarian local numbers but preserves international numbers", () => {
  assert.match(html, /phoneNorm=v=>/);
  assert.match(html, /if\(p\[0\]===\'\+\'\)return p/);
  assert.match(html, /if\(\/\^0\[87\]\\d\{8\}\$\/\.test\(c\)\)return'\+359 '\+c\.slice\(1\)/);
  assert.match(html, /if\(\/\^\[87\]\\d\{8\}\$\/\.test\(c\)\)return'\+359 '\+c/);
  assert.match(html, /phoneInput\.addEventListener\('blur',\(\)=>\{phoneInput\.value=phoneNorm\(phoneInput\.value\)\}\)/);
});

test("public invitation uses the approved access and update copy", () => {
  assert.match(html, /This invitation grants free access\. Drinks are charged separately\. Tables upon request\./);
  assert.match(html, /You can confirm or update this before ticket release\./);
  assert.doesNotMatch(html, /This invitation only grants access to the event/);
  assert.doesNotMatch(html, /What happens beneath the rose stays beneath the rose/);
  assert.doesNotMatch(html, /This invitation grants you only entry\./);
  assert.doesNotMatch(html, /You can name them any time before your ticket is issued\./);
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
  assert.match(ticketPage, /id="pendingInvite"/);
  assert.match(ticketPage, /Not yet answered/);
  assert.match(ticketPage, /Use your invitation link to respond and reserve your spot/);
  assert.match(ticketPage, /Your ticket appears here once you've responded and tickets are released on 09\.10 at 18:00/);
  assert.doesNotMatch(ticketPage, /RSVP FIRST/);
  assert.match(ticketPage, /if\(data\.inviteUrl\)\{\$\('pendingInvite'\)\.href=data\.inviteUrl;\$\('pendingInvite'\)\.hidden=false;\}/);
  assert.match(ticketPage, />Save your ticket<\/button>/);
  assert.match(ticketPage, /<p class="meta" id="ticketMeta"><span class="ticket-date">Saturday <b>10 October<\/b> · Doors <b>22:00<\/b><\/span><span class="venue-line" id="venue"><\/span><span id="bringing"><\/span><\/p>/);
  assert.match(ticketPage, /\.venue-line\{[^}]*font-weight:500/);
  assert.match(ticketPage, /\.venue-line\{[^}]*color:var\(--gold-hi\)/);
  assert.match(ticketPage, /\.ticket-date\{[^}]*color:#F4DFC0/);
  assert.match(ticketPage, /\.save,\.pending-link\{[^}]*font:500 clamp\(18px,4\.8vw,22px\)\/1\.2 var\(--sans\)/);
  assert.doesNotMatch(ticketPage, />Private ticket<\/button>/);
  assert.doesNotMatch(ticketPage, /Use your confirmation link to RSVP/);
  assert.match(ticketPage, /\$\('ticketNote'\)\.textContent=''/);
  assert.match(ticketPage, /\$\('ticketNote'\)\.textContent='Show this seal at the door\. The QR code confirms your place in the WHISPERS list\.'/);
});

test("ticket and confirmation links define clean social previews", () => {
  for (const source of [ticketPage, confirmationPage]) {
    assert.match(source, /<meta property="og:title" content="WHISPERS"\/>/);
    assert.match(source, /<meta property="og:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-lockup-dark\.png"\/>/);
    assert.match(source, /<meta name="twitter:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-lockup-dark\.png"\/>/);
    assert.doesNotMatch(source, /<meta property="og:image" content="[^"]*whispers-seal\.png"/);
  }
});

test("ticket and confirmation typography stays compact on phone screens", () => {
  assert.match(ticketPage, /h1\{[^}]*font-size:clamp\(32px,8\.6vw,42px\)/);
  assert.match(ticketPage, /\.role\{[^}]*font-size:18px/);
  assert.match(ticketPage, /\.meta\{font-size:16px;line-height:1\.42/);
  assert.match(ticketPage, /\.small\{[^}]*font-size:15px;line-height:1\.42/);
  assert.match(confirmationPage, /h1\{[^}]*font-size:clamp\(32px,8\.6vw,42px\)/);
  assert.match(confirmationPage, /\.role\{[^}]*font-size:18px/);
  assert.match(confirmationPage, /\.meta\{font-size:16px;line-height:1\.42/);
  assert.match(confirmationPage, /\.note\{[^}]*font-size:15px;line-height:1\.42/);
});

test("old hi links that contain an invite token redirect to the invite", () => {
  assert.match(confirmationPage, /guest_list\?select=id&id=eq\./);
  assert.match(confirmationPage, /Response\.redirect\(`\$\{origin\}\/invite\/\$\{encodeURIComponent\(token\)\}`/);
  assert.doesNotMatch(confirmationPage, /!\/\^\[A-Za-z0-9\]\{32,40\}\$\/\.test\(token\)/);
});

test("ticket page forwards the local release preview flag to the ticket API", () => {
  assert.match(ticketPage, /isLocalTicketReleasePreview/);
  assert.match(ticketPage, /const preview = isLocalTicketReleasePreview\(request\.url\) \? "&preview=released" : ""/);
  assert.match(ticketPage, /\/api\/ticket\?token=\$\{encodeURIComponent\(token\)\}\$\{preview\}/);
});

test("released ticket fallback does not mention the old address release copy", () => {
  assert.doesNotMatch(ticketPage, /Address released on/);
  assert.doesNotMatch(ticketPage, /private location in central Sofia\./);
});

test("locked registered ticket avoids redundant ticket status labels", () => {
  assert.match(ticketPage, /<div class="code" id="code">[^<]+<\/div>\s*<div class="qr" id="qr"><\/div>\s*<p class="state" id="state"><\/p>\s*<p class="meta" id="ticketMeta">/);
  assert.match(ticketPage, /\.qr\[hidden\]\{display:none\}/);
  assert.match(ticketPage, /\$\('code'\)\.textContent='10\.10 · 22:00'/);
  assert.match(ticketPage, /\$\('qr'\)\.hidden=true/);
  assert.match(ticketPage, /\$\('state'\)\.textContent='';\s*\$\('ticketMeta'\)\.innerHTML='Location remains sealed until 09\.10 at 18:00\.';\s*\$\('ticketNote'\)\.textContent='Your ticket will be sent to you on 09\.10 at 18:00\.'/);
  assert.doesNotMatch(ticketPage, /id="ticketType"/);
  assert.doesNotMatch(ticketPage, /\.ticket-type/);
  assert.doesNotMatch(ticketPage, /\$\('state'\)\.textContent='Locked until release'/);
  assert.doesNotMatch(ticketPage, /\$\('code'\)\.textContent='09\.10 · 18:00'/);
  assert.doesNotMatch(ticketPage, /\$\('qr'\)\.textContent='Your ticket will be released on 09\.10 at 18:00\.'/);
});

test("public ticket surfaces do not show redundant ticket labels", () => {
  assert.doesNotMatch(html, /<p class="codelabel">Ticket<\/p>/);
  assert.doesNotMatch(ticketPage, />Ticket<\/p>/);
  assert.doesNotMatch(ticketPage, /Locked until release/);
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

test("successful RSVP moves the browser to the confirmation link", () => {
  assert.match(rsvpApi, /confirmationUrl: attending && row\.confirmation_token \? buildConfirmationUrl\(requestUrl, row\.confirmation_token\) : null/);
  assert.match(html, /state\.confirmationUrl=result\.data\?\.confirmationUrl\|\|null/);
  assert.match(html, /window\.location\.assign\(state\.confirmationUrl\);return/);
  assert.doesNotMatch(html, /history\.replaceState\(null,'',state\.ticketUrl\)/);
});

test("confirmation update mode skips primary contact and goes to plus and table details", () => {
  assert.match(html, /confirmationToken = new URLSearchParams\(window\.location\.search\)\.get\('confirmation'\)/);
  assert.match(html, /state\.updateMode=true/);
  assert.match(html, /fetch\('\/api\/confirmation\?token=' \+ encodeURIComponent\(confirmationToken\)/);
  assert.match(html, /if\(state\.updateMode\)\{show\('#s-plus'\);return;\}/);
  assert.match(html, /state\.alreadyRegistered&&state\.confirmationUrl/);
  assert.doesNotMatch(html, /state\.updateMode\)\{show\('#s-identify'\)/);
});

test("confirmation page shows update details only when the API allows it", () => {
  assert.match(confirmationPage, /id="updateDetails"/);
  assert.match(confirmationPage, /\.update-link\{[\s\S]*font:500 clamp\(18px,4\.8vw,22px\)\/1\.2 var\(--sans\)/);
  assert.match(confirmationPage, /if\(data\.canUpdate&&data\.updateUrl\)/);
  assert.match(confirmationPage, /\$\('updateDetails'\)\.href=data\.updateUrl/);
  assert.match(confirmationPage, /\$\('updateDetails'\)\.hidden=false/);
});

test("confirmation page avoids redundant ticket status labels", () => {
  assert.match(confirmationPage, /<div class="code">10\.10 [^<]+ 22:00<\/div>\s*<p class="meta" id="meta">/);
  assert.doesNotMatch(confirmationPage, /<p class="type">Ticket<\/p>/);
  assert.doesNotMatch(confirmationPage, /<p class="state">Locked until release<\/p>/);
  assert.doesNotMatch(confirmationPage, /\.type,.state/);
});

test("start over returns to the invitation entry point, not the replaced ticket URL", () => {
  assert.match(html, /const startUrl = urlToken \? '\/invite\?token=' \+ encodeURIComponent\(urlToken\) : '\/invite'/);
  assert.match(html, /function reset\(\)\{window\.location\.assign\(startUrl\)\}/);
  assert.match(html, /id="reset2">Register again<\/button>/);
  assert.doesNotMatch(html, /\$\('#reset'\)\.addEventListener/);
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
  assert.doesNotMatch(sectionHtml("s-seal"), /class="partner-bar"/);
  assert.doesNotMatch(sectionHtml("s-film"), /class="partner-bar"/);
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

test("public floating actions sit lower on seal and film screens", () => {
  assert.match(html, /--partner-clearance:104px/);
  assert.match(html, /--skip-action-clearance:34px/);
  assert.match(html, /\.screen\{[\s\S]*padding:[^}]*calc\(24px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /\.skip\{[\s\S]*bottom:calc\(var\(--skip-action-clearance\) \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(html, /\.skip\{[\s\S]*z-index:70/);
});

test("letter respond CTA stays in flow without covering the closing copy", () => {
  assert.match(html, /#s-letter\{padding-bottom:calc\(10px \+ env\(safe-area-inset-bottom\)\);scroll-padding-bottom:calc\(110px \+ env\(safe-area-inset-bottom\)\)\}/);
  assert.match(html, /#s-letter \.inner\{margin-top:auto;margin-bottom:0;padding-bottom:0\}/);
  assert.match(html, /#toRsvp\{position:relative;z-index:20;width:100%;margin:24px auto 0/);
  assert.doesNotMatch(html, /#toRsvp\{position:sticky/);
  assert.match(html, /#toRsvp\{[\s\S]*animation:respondGlow 3\.6s ease-in-out infinite/);
  assert.match(html, /#toRsvp\{[\s\S]*font-size:clamp\(18px,4\.8vw,22px\);font-weight:500;letter-spacing:\.32em/);
  assert.match(html, /#continueGuest,#confirm\{font-size:clamp\(18px,4\.8vw,22px\);font-weight:500;letter-spacing:\.32em/);
  assert.match(html, /#toRsvp::before\{[\s\S]*animation:respondSweep 4\.8s ease-in-out infinite/);
  assert.match(html, /#toRsvp::after\{[\s\S]*animation:respondHalo 3\.6s ease-in-out infinite/);
  assert.match(html, /#s-letter\.on #toRsvp\.st\{animation:respondGlow 3\.6s ease-in-out infinite;transform:none\}/);
  assert.match(html, /#s-letter \.row dd\{font-size:13px;line-height:1\.48\}/);
});

test("letter event time keeps the date and door time on separate stable lines", () => {
  assert.match(html, /<dd>Saturday 10 October<span class="time-line">Doors open at 22:00 <em class="same-line">until 03:00<\/em><\/span><\/dd>/);
  assert.match(html, /\.row dd \.time-line\{display:block;font-size:1em;white-space:normal\}/);
  assert.match(html, /#s-letter \.row\{grid-template-columns:5\.4em 1fr;gap:6px;padding:15px 0\}/);
  assert.match(html, /#s-letter \.row dt\{font-size:15px;letter-spacing:\.11em;padding-top:1px\}/);
  assert.match(html, /#s-letter \.row dd \.time-line\{font-size:13px\}/);
  assert.match(html, /#s-letter \.brand-lockup\{width:min\(240px,70vw\)\}/);
});

test("seal intro keeps heavy glow effects off the logo image", () => {
  assert.match(html, /<link as="image" fetchpriority="high" href="\/assets\/whispers-seal\.png" rel="preload"\/>/);
  assert.match(html, /class="sealimg" decoding="async" draggable="false" fetchpriority="high"/);
  assert.match(html, /\.sealwrap\{[^}]*isolation:isolate;contain:layout paint;transform:translateZ\(0\)/);
  assert.match(html, /\.sealwrap::before,\.sealwrap::after\{[^}]*z-index:0/);
  assert.match(html, /\.sealimg\{[^}]*z-index:1/);
  assert.match(html, /\.ring\.seal-progress\{[^}]*inset:0/);
  assert.match(html, /\.progress-track\{[^}]*display:none/);
  assert.match(html, /\.progress-orbit\{stroke:var\(--gold-hi\);stroke-width:1\.35/);
  assert.match(html, /<svg aria-hidden="true" class="ring seal-progress" viewBox="0 0 100 100"><circle class="progress-orbit" cx="50" cy="50" id="prog" r="45\.2"><\/circle><\/svg>/);
  assert.match(html, /const C=2\*Math\.PI\*45\.2/);
  assert.match(html, /prog\.style\.strokeDasharray=C/);
  assert.match(html, /prog\.style\.strokeDashoffset=C\*\(1-p\)/);
  assert.match(html, /#s-seal\.cracking \.sealwrap::before,#s-seal\.cracking \.sealwrap::after\{opacity:0;animation:none/);
  assert.match(html, /@keyframes sealBreathe\{0%,100%\{transform:translateZ\(0\) scale\(\.992\)\}50%\{transform:translateZ\(0\) scale\(1\.012\)\}\}/);
  assert.match(html, /@keyframes crack\{0%\{transform:translateZ\(0\) scale\(\.975\);opacity:1\}30%\{transform:translateZ\(0\) scale\(1\.045\);opacity:1\}100%\{transform:translateZ\(0\) scale\(1\.16\);opacity:0\}\}/);
  assert.doesNotMatch(html, /@keyframes sealBreathe\{[^}]*filter:/);
  assert.doesNotMatch(html, /#s-seal\.pressing \.sealimg\{[^}]*filter:/);
  assert.doesNotMatch(html, /@keyframes crack\{[^\n\r]*blur\(/);
});
