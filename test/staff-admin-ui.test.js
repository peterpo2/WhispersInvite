import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const staffPage = readFileSync("functions/staff/rose-door-10.js", "utf8");

test("tables add-to-table panel has a broad guest search", () => {
  assert.match(staffPage, /id="tableSearch"/);
  assert.match(staffPage, /placeholder="Search all guests"/);
  assert.match(staffPage, /function groupMatchesTableSearch\(g\)/);
  assert.match(staffPage, /concat\(g\.people\|\|\[\]\)/);
  assert.match(staffPage, /No matching reservation groups\./);
});

test("staff admin includes an invite registry tab", () => {
  assert.match(staffPage, /data-view="invite"/);
  assert.match(staffPage, /id="inviteForm"/);
  assert.match(staffPage, /id="inviteSearch"/);
  assert.match(staffPage, /\/api\/staff\/invites/);
  assert.match(staffPage, /confirmationLink/);
  assert.match(staffPage, /ticketLink/);
  assert.match(staffPage, /confirmationEmailSentAt/);
  assert.match(staffPage, /function sendInviteCell\(i\)/);
  assert.match(staffPage, /\/api\/staff\/invite-send/);
  assert.match(staffPage, /Send again/);
  assert.match(staffPage, /function inviteStatusLabel\(status\)/);
  assert.match(staffPage, /Not responded/);
  assert.match(staffPage, /function filteredInvites\(\)/);
});
