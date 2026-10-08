import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const analytics = readFileSync(new URL("../assets/analytics.js", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const inviteShell = readFileSync(new URL("../invite-shell", import.meta.url), "utf8");
const rootPage = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");
const menuPagePath = new URL("../functions/menu.js", import.meta.url);
const menuPage = existsSync(menuPagePath) ? readFileSync(menuPagePath, "utf8") : "";
const ticketPage = readFileSync(new URL("../functions/ticket/[token].js", import.meta.url), "utf8");
const confirmationPage = readFileSync(new URL("../functions/confirmation/[token].js", import.meta.url), "utf8");
const staffPage = readFileSync(new URL("../functions/staff/rose-door-10.js", import.meta.url), "utf8");

test("public pages load the privacy-safe Google Analytics helper", () => {
  for (const source of [indexHtml, inviteShell, rootPage, menuPage, ticketPage, confirmationPage]) {
    assert.match(source, /<script src="\/assets\/analytics\.js" defer><\/script>/);
  }
});

test("staff pages do not load Google Analytics", () => {
  assert.doesNotMatch(staffPage, /analytics\.js|googletagmanager|google-analytics|G-409SH8CXBH/);
});

test("analytics helper masks bearer-token routes before sending page views", () => {
  assert.match(analytics, /G-409SH8CXBH/);
  assert.match(analytics, /\/ticket\/\[token\]/);
  assert.match(analytics, /\/confirmation\/\[token\]/);
  assert.match(analytics, /location\.search\s*=\s*=/);
  assert.doesNotMatch(analytics, /gtag\("config",\s*MEASUREMENT_ID\)/);
  assert.match(analytics, /page_path:\s*safePagePath\(\)/);
});

test("analytics tracks without a visible consent banner", () => {
  assert.doesNotMatch(analytics, /whispersAnalyticsConsent|data-ga-accept|data-ga-decline|showConsent/);
  assert.match(analytics, /sendPageView\(\);/);
  assert.match(analytics, /allow_google_signals:\s*false/);
  assert.match(analytics, /allow_ad_personalization_signals:\s*false/);
});
