import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const rsvpApi = readFileSync("functions/api/rsvp.js", "utf8");

test("existing RSVP updates are guarded after ticket release", () => {
  assert.match(rsvpApi, /isTicketReleased\(\)/);
  assert.match(rsvpApi, /Guest-list changes are closed\./);
});
