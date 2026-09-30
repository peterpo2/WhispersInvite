import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const guestCheckApi = readFileSync("functions/api/guest-check.js", "utf8");
const inviteShell = readFileSync("index.html", "utf8");

test("guest-check does not expose stored guest contact details", () => {
  assert.match(guestCheckApi, /select=id,name&limit=1/);
  assert.match(guestCheckApi, /select=guest_name,status,confirmation_token&limit=1/);
  assert.doesNotMatch(guestCheckApi, /email: row\?\.guest_email/);
  assert.doesNotMatch(guestCheckApi, /phone: row\?\.guest_phone/);
  assert.doesNotMatch(guestCheckApi, /personal\.row\.email/);
  assert.doesNotMatch(guestCheckApi, /personal\.row\.phone/);
  assert.doesNotMatch(inviteShell, /data\.email/);
  assert.doesNotMatch(inviteShell, /data\.phone/);
});
