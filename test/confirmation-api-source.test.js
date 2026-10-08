import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const confirmationApi = readFileSync("functions/api/confirmation.js", "utf8");

test("confirmation API exposes saved companion details for update mode", () => {
  assert.match(confirmationApi, /plus_one_email/);
  assert.match(confirmationApi, /\/rest\/v1\/rsvp_companions\?select=id,guest_name,email&rsvp_id=eq/);
  assert.match(confirmationApi, /const companion = firstCompanion \? \{/);
  assert.match(confirmationApi, /email: firstCompanion\.email \|\| ""/);
  assert.match(confirmationApi, /companion,/);
});
