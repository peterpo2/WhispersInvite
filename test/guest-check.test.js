import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const guestCheckApi = readFileSync("functions/api/guest-check.js", "utf8");
const inviteShell = readFileSync("index.html", "utf8");

test("guest-check returns personal invite contact details for the bearer invite link", () => {
  assert.match(guestCheckApi, /select=id,name,email,phone&limit=1/);
  assert.match(guestCheckApi, /select=guest_name,guest_email,guest_phone,status,confirmation_token&limit=1/);
  assert.match(guestCheckApi, /email: row\?\.guest_email \|\| personal\.row\.email \|\| null/);
  assert.match(guestCheckApi, /phone: row\?\.guest_phone \|\| personal\.row\.phone \|\| null/);
  assert.match(inviteShell, /state\.guestEmail = data\.email \|\| null/);
  assert.match(inviteShell, /state\.guestPhone = data\.phone \|\| null/);
  assert.match(inviteShell, /applyPersonalContactFields\(\)/);
});

test("personal invite always shows editable prefilled contact details", () => {
  assert.match(inviteShell, /<div class="field st" id="guestNameField"><label for="guestName">Full name<\/label>/);
  assert.match(inviteShell, /<div class="field st" id="guestEmailField"><label for="guestEmail">Email<\/label>/);
  assert.match(inviteShell, /<div class="field st" id="guestPhoneField"><label for="guestPhone">Phone<\/label>/);
  assert.doesNotMatch(inviteShell, /nameField&&state\.guestName\)nameField\.hidden=true/);
  assert.doesNotMatch(inviteShell, /emailField&&state\.guestEmail\)emailField\.hidden=true/);
  assert.match(inviteShell, /show\(urlToken\?'#s-identify':/);
  assert.match(inviteShell, /const n=nameInput\.value\.trim\(\),m=emailInput\.value/);
  assert.match(inviteShell, /const v=nameInput\.value\.trim\(\)\.replace/);
});
