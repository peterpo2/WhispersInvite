import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "../functions/_shared/security.js";

const schema = readFileSync("sql/schema.sql", "utf8");
const rlsMigration = readFileSync("sql/2026-09-29-enable-rls-staff-companions.sql", "utf8");

function directives(policy) {
  return Object.fromEntries(policy.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/);
    return [name, values];
  }));
}

test("every response carries the security headers, including the CSP", () => {
  for (const name of ["Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security", "Referrer-Policy", "X-Content-Type-Options", "Permissions-Policy", "X-Robots-Tag", "Cross-Origin-Opener-Policy"]) {
    assert.ok(SECURITY_HEADERS[name], name);
  }
  assert.equal(SECURITY_HEADERS["Content-Security-Policy"], CONTENT_SECURITY_POLICY);
});

test("scripts load only from the site and jsDelivr (QR libraries), never eval", () => {
  const d = directives(CONTENT_SECURITY_POLICY);
  assert.deepEqual(d["default-src"], ["'self'"]);
  assert.ok(d["script-src"].includes("'self'"));
  assert.ok(d["script-src"].includes("https://cdn.jsdelivr.net"));
  assert.ok(!d["script-src"].includes("'unsafe-eval'"));
  assert.ok(!d["script-src"].includes("*"));
});

test("fonts, API calls and framing are locked down", () => {
  const d = directives(CONTENT_SECURITY_POLICY);
  assert.deepEqual(d["style-src"], ["'self'", "'unsafe-inline'"]);
  assert.deepEqual(d["font-src"], ["'self'"]);
  assert.deepEqual(d["connect-src"], ["'self'"]);
  assert.deepEqual(d["frame-ancestors"], ["'none'"]);
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'none'"]);
});

test("staff and companion tables have RLS enabled in schema and migration", () => {
  for (const table of ["rsvp_companions", "staff_tables", "staff_table_assignments"]) {
    assert.match(schema, new RegExp(`alter table ${table} enable row level security;`));
    assert.match(rlsMigration, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
});
