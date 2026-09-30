import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const inviteShell = readFileSync(new URL("../invite-shell", import.meta.url), "utf8");
const rootPage = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
const middleware = readFileSync(new URL("../functions/_middleware.js", import.meta.url), "utf8");
const redirects = readFileSync(new URL("../_redirects", import.meta.url), "utf8");
const ticketPage = readFileSync(new URL("../functions/ticket/[token].js", import.meta.url), "utf8");
const confirmationPage = readFileSync(new URL("../functions/hi/[token].js", import.meta.url), "utf8");
const staffPage = readFileSync(new URL("../functions/staff/rose-door-10.js", import.meta.url), "utf8");
const ticketCard = readFileSync(new URL("../assets/ticket-card.js", import.meta.url), "utf8");

test("public invite preloads and loads the WHISPERS runtime assets", () => {
  assert.match(indexHtml, /href="\/assets\/aviano-contrast\.ttf"/);
  assert.match(indexHtml, /href="\/assets\/whispers-intro\.mov"/);
  assert.match(indexHtml, /href="\/assets\/whispers-lockup-transparent\.png"/);
  assert.doesNotMatch(indexHtml, /href="\/assets\/whispers-lockup-dark\.png" rel="preload"/);
  assert.match(indexHtml, /@font-face\{font-family:AvianoContrast/);
  assert.match(indexHtml, /--serif:'AvianoContrast'/);
  assert.match(indexHtml, /--sans:'AvianoContrast'/);
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
  assert.match(redirects, /^\/invite \/invite-shell 200/m);
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

test("public ticket and confirmation links use the transparent lockup without a black box", () => {
  for (const source of [ticketPage, confirmationPage, staffPage, ticketCard]) {
    assert.match(source, /\/assets\/whispers-lockup-transparent\.png/);
    assert.doesNotMatch(source, /\/assets\/whispers-lockup-dark\.png/);
  }
});

test("event details keep the approved two-line when copy", () => {
  assert.match(indexHtml, /Saturday 10 October/);
  assert.match(indexHtml, /Doors open at 22:00 <em class="same-line">until 03:00<\/em>/);
});
