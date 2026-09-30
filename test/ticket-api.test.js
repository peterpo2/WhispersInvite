import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const ticketApi = readFileSync("functions/api/ticket.js", "utf8");

test("ticket API includes companion rows on the primary guest ticket", () => {
  assert.match(ticketApi, /async function findCompanions\(env, rsvpId\)/);
  assert.match(ticketApi, /ticket\?\.holder === "guest" && !ticket\.bringing/);
  assert.match(ticketApi, /ticket = \{ \.\.\.ticket, bringing: firstCompanion\.guest_name \|\| null \}/);
  assert.match(ticketApi, /\/rest\/v1\/rsvp_companions\?select=id,guest_name&rsvp_id=eq/);
});

test("ticket API shows ticket links immediately, without the date release gate", () => {
  assert.match(ticketApi, /const released = true;/);
  assert.doesNotMatch(ticketApi, /isTicketReleasedForRequest\(request\.url\)/);
});
