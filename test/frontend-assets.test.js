import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("public invite preloads and loads the WHISPERS runtime assets", () => {
  assert.match(indexHtml, /href="\/assets\/aviano-contrast\.ttf"/);
  assert.match(indexHtml, /href="\/assets\/whispers-intro\.mov"/);
  assert.match(indexHtml, /href="\/assets\/whispers-lockup-dark\.png"/);
  assert.match(indexHtml, /@font-face\{font-family:AvianoContrast/);
  assert.match(indexHtml, /--serif:'AvianoContrast'/);
  assert.match(indexHtml, /--sans:'AvianoContrast'/);
});

test("public invite wires the intro movie before the seal opens", () => {
  assert.match(indexHtml, /id="film-video"[^>]+preload="auto"[^>]+src="\/assets\/whispers-intro\.mov"/);
  assert.match(indexHtml, /filmVideo\.load\(\)/);
  assert.match(indexHtml, /function playFilm\(\)/);
  assert.match(indexHtml, /canplay/);
  assert.match(indexHtml, /canplaythrough/);
  assert.match(indexHtml, /function stopFilmPlayback\(\)/);
});

test("public invite uses the new lockup as the primary brand treatment", () => {
  assert.match(indexHtml, /class="brand-lockup/);
  assert.match(indexHtml, /src="\/assets\/whispers-lockup-dark\.png"/);
});

test("event details keep the approved two-line when copy", () => {
  assert.match(indexHtml, /Saturday 10 October/);
  assert.match(indexHtml, /Doors open at 22:00 <em class="same-line">until 03:00<\/em>/);
});
