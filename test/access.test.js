import test from "node:test";
import assert from "node:assert/strict";
import { isPublicHost, isPublicPath, isSiteLocked } from "../functions/_shared/access.js";

test("allows the invitation, API routes, ticket pages and the staff scanner", () => {
  for (const path of [
    "/",
    "/invite",
    "/api/rsvp",
    "/api/ticket",
    "/api/checkin",
    "/api/door",
    "/api/guest-check",
    "/api/confirmation",
    "/api/staff/members",
    "/api/staff/checkin-state",
    "/api/staff/tables",
    "/api/staff/table-assignment",
    "/api/staff/reservation-state",
    "/api/staff/invites",
    "/api/staff/invite-send",
    "/ticket/123e4567e89b12d3a456426614174000",
    "/confirmation/123e4567e89b12d3a456426614174000",
    "/hi/123e4567e89b12d3a456426614174000",
    "/invite/invite00000000000000000000000000",
    "/staff/rose-door-10",
    "/assets/whispers-favicon.png",
    "/assets/whispers-mark.png",
    "/assets/whispers-seal.png",
    "/assets/partner-beluga.png",
    "/assets/partner-rothschild.png",
    "/assets/ticket-card.js",
    "/assets/aviano-contrast.ttf",
    "/assets/whispers-intro.mov",
    "/assets/whispers-lockup-dark.png",
    "/assets/whispers-lockup-light.png",
    "/assets/whispers-logo.svg",
  ]) {
    assert.equal(isPublicPath(path), true, path);
  }
});

test("blocks repository files and anything not on the allowlist", () => {
  for (const path of [
    "/sql/schema.sql",
    "/sql/2026-09-24-door-scanner.sql",
    "/sql/2026-09-24-rsvp-columns.sql",
    "/sql/",
    "/test/rsvp.test.js",
    "/test/access.test.js",
    "/api/guests.js",
    "/api/guests",
    "/api/rsvp.js",
    "/api/",
    "/api/unknown",
    "/functions/api/rsvp.js",
    "/package.json",
    "/package-lock.json",
    "/README.txt",
    "/README.md",
    "/index.html",
    "/AGENTS.md",
    "/VECTOR_TYPE.eps",
    "/video/Timeline2.mov",
    "/video/Aviano%20Contrast.ttf",
    "/docs/project-spec.md",
    "/docs/",
    "/whispers-invitation-dev-brief.md",
    "/whispers-invitation.html",
    "/whispers-invitation",
    "/.gitignore",
    "/.assetsignore",
    "/.vibeyardignore",
    "/.dev.vars",
    "/ticket/",
    "/ticket/abc/def",
    "/staff/",
    "/staff/rose-door-10/extra",
    "/index.htm",
    "/assets/",
    "/assets/whispers-mark.PNG",
    "/assets/aviano-contrast.TTF",
    "/assets/whispers-intro.MOV",
    "/assets/whispers-logo.SVG",
    "/assets/sub/whispers-mark.png",
    "/assets/../sql/schema.sql",
    "/assets/notes.md",
    "/assets/ticket-card.JS",
    "/assets/x.json",
    "//",
    "",
  ]) {
    assert.equal(isPublicPath(path), false, path);
  }
});

test("rejects non-string paths", () => {
  assert.equal(isPublicPath(undefined), false);
  assert.equal(isPublicPath(null), false);
  assert.equal(isPublicPath({}), false);
});

test("site lock is enabled only by an explicit production flag", () => {
  assert.equal(isSiteLocked({ SITE_LOCKED: "1" }), true);
  assert.equal(isSiteLocked({ SITE_LOCKED: "true" }), true);
  assert.equal(isSiteLocked({ SITE_LOCKED: "0" }), false);
  assert.equal(isSiteLocked({}), false);
  assert.equal(isSiteLocked(null), false);
});

test("only custom domains and local development hosts can serve public pages", () => {
  for (const host of [
    "whisperssociety.com",
    "www.whisperssociety.com",
    "localhost",
    "localhost:8788",
    "127.0.0.1",
    "127.0.0.1:8788",
    "[::1]:8788",
    "192.168.0.103:8788",
    "10.0.0.25:8788",
    "172.16.0.4:8788",
    "172.31.255.254:8788",
  ]) {
    assert.equal(isPublicHost(host), true, host);
  }

  for (const host of [
    "whispers-invite.pages.dev",
    "23058b1c.whispers-invite.pages.dev",
    "evil-whisperssociety.com",
    "whisperssociety.com.evil.example",
    "172.32.0.1:8788",
    "8.8.8.8:8788",
    "",
    undefined,
    null,
  ]) {
    assert.equal(isPublicHost(host), false, String(host));
  }
});
