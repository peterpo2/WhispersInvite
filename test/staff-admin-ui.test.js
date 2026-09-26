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
