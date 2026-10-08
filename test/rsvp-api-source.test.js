import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const rsvpApi = readFileSync("functions/api/rsvp.js", "utf8");

test("existing RSVP updates are not tied to ticket release", () => {
  assert.doesNotMatch(rsvpApi, /if \(isTicketReleased\(\)\)/);
  assert.doesNotMatch(rsvpApi, /Guest-list changes are closed\./);
});

test("RSVP submissions use the owner setting instead of a fixed deadline", () => {
  assert.doesNotMatch(rsvpApi, /isRsvpClosed/);
  assert.match(rsvpApi, /loadRsvpPolicy\(env\)/);
  assert.match(rsvpApi, /if \(!availability\.policy\.isOpen\) return json\(\{ error: "RSVP is closed\." \}, 403\)/);
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
