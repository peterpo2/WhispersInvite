import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");

test("pre-release confirmation does not expose the private ticket action", () => {
  assert.match(html, /\[hidden\]\{display:none!important\}/);
  assert.match(html, /<button[^>]*hidden[^>]*id="saveTickets"/);
  assert.match(html, /\$\('#saveTickets'\)\.hidden=true/);
  assert.match(html, /Private ticket/);
});

test("cancel attendance asks for confirmation before submitting", () => {
  assert.match(html, /confirm\('Are you sure you want to cancel your attendance\?'\)/);
});
