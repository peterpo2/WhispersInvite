import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const inviteShell = readFileSync(new URL("../invite-shell", import.meta.url), "utf8");
const rootPage = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
const menuPagePath = new URL("../functions/menu.js", import.meta.url);
const menuPage = existsSync(menuPagePath) ? readFileSync(menuPagePath, "utf8") : "";
const menuImage1Path = new URL("../assets/menu-page-1.png", import.meta.url);
const menuImage2Path = new URL("../assets/menu-page-2.png", import.meta.url);
const middleware = readFileSync(new URL("../functions/_middleware.js", import.meta.url), "utf8");
const ticketPage = readFileSync(new URL("../functions/ticket/[token].js", import.meta.url), "utf8");
const confirmationPage = readFileSync(new URL("../functions/confirmation/[token].js", import.meta.url), "utf8");
const staffPage = readFileSync(new URL("../functions/staff/rose-door-10.js", import.meta.url), "utf8");
const ticketCard = readFileSync(new URL("../assets/ticket-card.js", import.meta.url), "utf8");
const previewLogo = readFileSync(new URL("../assets/whispers-preview-logo.png", import.meta.url));

test("public invite preloads and loads the WHISPERS runtime assets", () => {
  assert.match(indexHtml, /href="\/assets\/aviano-contrast\.ttf"/);
  assert.match(indexHtml, /href="\/assets\/whispers-intro\.mov"/);
  assert.match(indexHtml, /href="\/assets\/whispers-lockup-transparent\.png"/);
  assert.doesNotMatch(indexHtml, /href="\/assets\/whispers-lockup-dark\.png" rel="preload"/);
  assert.match(indexHtml, /@font-face\{font-family:AvianoContrast/);
  assert.match(indexHtml, /--serif:'AvianoContrast'/);
  assert.match(indexHtml, /--sans:'AvianoContrast'/);
});

test("public links use the requested logo social preview image", () => {
  for (const source of [indexHtml, inviteShell, rootPage, menuPage, ticketPage, confirmationPage, staffPage]) {
    assert.match(source, /<meta property="og:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-preview-logo\.png\?v=20261001-logo1"\/>/);
    assert.match(source, /<meta property="og:image:width" content="1200"\/>/);
    assert.match(source, /<meta property="og:image:height" content="630"\/>/);
    assert.match(source, /<meta name="twitter:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-preview-logo\.png\?v=20261001-logo1"\/>/);
    assert.doesNotMatch(source, /whispers-preview\.png\?v=20261001-preview2/);
    assert.doesNotMatch(source, /<meta property="og:image" content="[^"]*whispers-seal\.png/);
    assert.doesNotMatch(source, /<meta property="og:image" content="[^"]*whispers-lockup-dark\.png/);
  }
  assert.equal(previewLogo.readUInt32BE(16), 1200);
  assert.equal(previewLogo.readUInt32BE(20), 630);
});

test("public menu shows the supplied A4 menu as one page without a divider", () => {
  assert.notEqual(menuPage, "");
  assert.match(menuPage, /<title>WHISPERS Menu<\/title>/);
  assert.match(menuPage, /<link rel="canonical" href="https:\/\/whisperssociety\.com\/menu"\/>/);
  assert.match(menuPage, /<main class="menu-pages">/);
  assert.match(menuPage, /src="\/assets\/menu-page-1\.png\?v=20261008-tall1"/);
  assert.doesNotMatch(menuPage, /src="\/assets\/menu-page-2\.png"/);
  assert.match(menuPage, /\.menu-pages img\{display:block;width:100%;height:auto/);
  assert.doesNotMatch(menuPage, /\.menu-pages img\+img/);
  assert.match(menuPage, /overflow-x:hidden/);
  assert.doesNotMatch(menuPage, /The menu will be revealed soon\./);
  assert.equal(existsSync(menuImage1Path), true);
  assert.equal(existsSync(menuImage2Path), false);
  if (existsSync(menuImage1Path)) {
    const image1 = readFileSync(menuImage1Path);
    assert.equal(image1.readUInt32BE(16), 1600);
    assert.equal(image1.readUInt32BE(20), 3200);
  }
});

test("root page is a logo-only calling card, not the invitation flow", () => {
  assert.match(rootPage, /WHISPERS/);
  assert.match(rootPage, /\/assets\/whispers-lockup-transparent\.png/);
  assert.doesNotMatch(rootPage, /Press and hold|Enter|Respond|guestName|film-video|api\/rsvp/);
});

test("invite route serves the existing invitation app shell", () => {
  assert.match(middleware, /pathname === "\/invite"/);
  assert.match(middleware, /env\.ASSETS\.fetch/);
  assert.match(middleware, /\/invite\?token=/);
  assert.match(middleware, /url\.pathname = "\/invite-shell"/);
  assert.match(middleware, /headers\.set\("Content-Type", "text\/html; charset=utf-8"\)/);
  assert.match(middleware, /headers\.delete\("Content-Disposition"\)/);
  assert.equal(inviteShell, indexHtml);
});

test("public invite wires the intro movie before the seal opens", () => {
  assert.match(indexHtml, /id="film-video"[^>]+preload="auto"[^>]+src="\/assets\/whispers-intro\.mov"/);
  assert.match(indexHtml, /filmVideo\.load\(\)/);
  assert.match(indexHtml, /fetch\(filmSrc,\{cache:'force-cache'\}\)/);
  assert.match(indexHtml, /function setFilmReady\(ready\)/);
  assert.match(indexHtml, /if\(filmVideo\)\{setFilmReady\(false\);preloadFilmBlob\(\);try\{filmVideo\.load\(\)\}/);
  assert.match(indexHtml, /if\(!filmBlobReady\)\{setFilmReady\(false\);preloadFilmBlob\(\);return;\}/);
  assert.match(indexHtml, /function playFilm\(\)/);
  assert.match(indexHtml, /canplay/);
  assert.match(indexHtml, /canplaythrough/);
  assert.match(indexHtml, /function stopFilmPlayback\(\)/);
  assert.doesNotMatch(indexHtml, /if\(reducedMotion\|\|!filmVideo\)\{show\('#s-letter'\);return;\}/);
});

test("public invite uses the new lockup as the primary brand treatment", () => {
  assert.match(indexHtml, /class="brand-lockup/);
  assert.match(indexHtml, /src="\/assets\/whispers-lockup-transparent\.png"/);
  assert.doesNotMatch(indexHtml, /<img[^>]+class="brand-lockup"[^>]+src="\/assets\/whispers-lockup-dark\.png"/);
});

test("user-entered Cyrillic text avoids the decorative Aviano font", () => {
  assert.match(indexHtml, /--text-serif:Georgia,Cambria,'Times New Roman',serif/);
  assert.match(indexHtml, /\.field input\{[\s\S]*var\(--text-serif\)/);
  assert.match(ticketPage, /--text-serif:Georgia,Cambria,'Times New Roman',serif/);
  assert.match(confirmationPage, /--text-serif:Georgia,Cambria,'Times New Roman',serif/);
  assert.match(indexHtml, /\.cyrillic-text\{font-family:var\(--text-serif\)!important/);
  assert.match(ticketPage, /\.cyrillic-text\{font-family:var\(--text-serif\)!important/);
  assert.match(confirmationPage, /\.cyrillic-text\{font-family:var\(--text-serif\)!important/);
  assert.match(indexHtml, /function hasCyrillic\(s\)\{return \/\[\\u0400-\\u04FF\]\//);
  assert.match(indexHtml, /markFont\(\$\(\'#passname\'\),state\.guestName\)/);
  assert.match(indexHtml, /class="nm'\+fontClass\(state\.plusOne\.name\)\+'/);
  assert.match(ticketCard, /const TEXT_SERIF = "Georgia, 'Times New Roman', serif"/);
  assert.match(ticketCard, /nameFont = hasCyrillic\(t\.name\) \? TEXT_SERIF : DISPLAY_SERIF/);
  assert.match(ticketCard, /fit\(ctx, t\.name, `400 \{s\}px \$\{nameFont\}`/);
});

test("latin guest-facing ticket and confirmation text uses Aviano", () => {
  assert.match(indexHtml, /\.pass \.nm\{font-family:var\(--serif\)/);
  assert.match(ticketPage, /h1\{font-family:var\(--serif\)/);
  assert.match(ticketPage, /\.role\{font-family:var\(--serif\)/);
  assert.match(ticketPage, /\.meta\{font-size:16px;line-height:1\.42;font-family:var\(--serif\)/);
  assert.match(confirmationPage, /h1\{font-family:var\(--serif\)/);
  assert.match(confirmationPage, /\.role\{font-family:var\(--serif\)/);
  assert.match(confirmationPage, /\.meta\{font-size:16px;line-height:1\.42;font-family:var\(--serif\)/);
});

test("public ticket and confirmation links use the transparent lockup without a black box", () => {
  for (const source of [ticketPage, confirmationPage, staffPage, ticketCard]) {
    assert.match(source, /\/assets\/whispers-lockup-transparent\.png/);
    assert.doesNotMatch(source, /<img[^>]+src="\/assets\/whispers-lockup-dark\.png"/);
  }
});

test("event details keep the approved two-line when copy", () => {
  assert.match(indexHtml, /Saturday 10 October/);
  assert.match(indexHtml, /<em class="time-line"><span>Doors open at 22:00<\/span><span>until 3 am<\/span><\/em>/);
});
