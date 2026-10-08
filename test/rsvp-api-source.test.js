import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const rsvpApi = readFileSync("functions/api/rsvp.js", "utf8");

test("existing RSVP updates are not tied to ticket release", () => {
  assert.doesNotMatch(rsvpApi, /if \(isTicketReleased\(\)\)/);
  assert.doesNotMatch(rsvpApi, /Guest-list changes are closed\./);
});

test("new confirmations and existing updates use independent owner settings", () => {
  assert.doesNotMatch(rsvpApi, /isRsvpClosed/);
  assert.match(rsvpApi, /loadRsvpPolicy\(env\)/);
  assert.match(rsvpApi, /if \(!availability\.policy\.updates\.isOpen\) return json\(\{ error: "Updates are closed\." \}, 403\)/);
  assert.match(rsvpApi, /if \(!availability\.policy\.confirmation\.isOpen\)[\s\S]*?return json\(\{ error: "RSVP confirmations are closed\." \}, 403\)/);

  const lookupAt = rsvpApi.indexOf("const existing = await findExistingRsvp");
  const updateGateAt = rsvpApi.indexOf("availability.policy.updates.isOpen");
  const updateAt = rsvpApi.indexOf("return updateExistingRsvp");
  const confirmationGateAt = rsvpApi.indexOf("availability.policy.confirmation.isOpen");
  const insertAt = rsvpApi.indexOf("for (let attempt = 1;");
  assert.ok(lookupAt >= 0 && lookupAt < updateGateAt);
  assert.ok(updateGateAt < updateAt);
  assert.ok(updateAt < confirmationGateAt);
  assert.ok(confirmationGateAt < insertAt);
});

test("a saved RSVP succeeds even when its confirmation email fails", () => {
  assert.doesNotMatch(rsvpApi, /if \(emailDelivery\.error\) return json\(\{ error: emailDelivery\.error \}, 502\)/);
  assert.match(rsvpApi, /onRequestPost\(\{ request, env, waitUntil \}\)/);
  assert.match(rsvpApi, /queueRsvpConfirmation\(waitUntil, env, request\.url, row\)/);
  assert.match(rsvpApi, /queueRsvpConfirmation\(waitUntil, env, requestUrl, responseRow\)/);
  assert.doesNotMatch(rsvpApi, /await sendRsvpConfirmation/);
  assert.match(rsvpApi, /confirmationResponse\(request\.url, row, emailDelivery\)/);
  assert.match(rsvpApi, /confirmationResponse\(requestUrl, responseRow, emailDelivery\)/);
});
