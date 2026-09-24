import test from "node:test";
import assert from "node:assert/strict";
import { isPublicPath } from "../functions/_shared/access.js";

test("allows the invitation, API routes, ticket pages and the staff scanner", () => {
  for (const path of [
    "/",
    "/index.html",
    "/api/rsvp",
    "/api/ticket",
    "/api/checkin",
    "/api/door",
    "/api/guests",
    "/ticket/123e4567e89b12d3a456426614174000",
    "/staff/rose-door-10",
    "/assets/whispers-mark.png",
    "/assets/whispers-seal.png",
    "/assets/ticket-card.js",
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
    "/api/rsvp.js",
    "/api/",
    "/api/unknown",
    "/functions/api/rsvp.js",
    "/package.json",
    "/package-lock.json",
    "/README.txt",
    "/README.md",
    "/AGENTS.md",
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
