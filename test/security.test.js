import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "../functions/_shared/security.js";

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
  assert.ok(d["style-src"].includes("https://fonts.googleapis.com"));
  assert.deepEqual(d["font-src"], ["https://fonts.gstatic.com"]);
  assert.deepEqual(d["connect-src"], ["'self'"]);
  assert.deepEqual(d["frame-ancestors"], ["'none'"]);
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'none'"]);
});
