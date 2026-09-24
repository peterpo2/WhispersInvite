import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_KEY,
  buildCheckInUrl,
  buildRsvpRow,
  buildTicketUrl,
  makeTicketToken,
  tokenFromValue,
  validateGuestQuery,
  validateRsvpPayload,
} from "../functions/_shared/rsvp.js";

const TOKEN = "123e4567e89b12d3a456426614174000";
const FIXED_NOW = () => new Date("2026-09-24T21:00:00.000Z");

test("guest search returns empty results before two characters", () => {
  assert.deepEqual(validateGuestQuery("p"), { query: "p", guests: [] });
});

test("RSVP requires a selected guest and valid status", () => {
  assert.equal(validateRsvpPayload({ status: "attending" }).error, "Invalid RSVP");
  assert.equal(
    validateRsvpPayload({ guestId: "g1", guestName: "Peter Popov", status: "maybe" }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending" }).ok,
    true
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter", status: "attending" }).error,
    "Please give your full name."
  );
});

test("plus-one requires full name and valid email", () => {
  assert.equal(
    validateRsvpPayload({
      guestId: "g1",
      guestName: "Peter Popov",
      status: "attending",
      plusOne: { name: "Simona", email: "simona@example.com" },
    }).error,
    "Please give their full name."
  );

  assert.equal(
    validateRsvpPayload({
      guestId: "g1",
      guestName: "Peter Popov",
      status: "attending",
      plusOne: { name: "Simona Ivanova", email: "simona" },
    }).error,
    "Please give a valid email."
  );
});

test("RSVP rejects non-string guest and plus-one fields", () => {
  assert.equal(validateRsvpPayload({ guestName: {}, status: "attending" }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ guestName: ["Peter", "Popov"], status: "attending" }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ guestName: "Peter Popov", status: ["attending"] }).error, "Invalid RSVP");
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", plusOne: { name: {}, email: "a@example.com" } }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", plusOne: { name: "Simona Ivanova", email: {} } }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", plusOne: "Simona Ivanova" }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", sealCode: {} }).error,
    "Invalid RSVP"
  );
});

test("RSVP caps name, email and seal code lengths", () => {
  const longName = `Peter ${"a".repeat(115)}`;
  assert.equal(longName.length, 121);
  assert.equal(validateRsvpPayload({ guestName: longName, status: "attending" }).error, "Please give a shorter name.");
  assert.equal(validateRsvpPayload({ guestName: longName.slice(0, 120), status: "attending" }).ok, true);

  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", plusOne: { name: longName, email: "a@example.com" } }).error,
    "Please give a shorter name."
  );

  const longEmail = `${"a".repeat(243)}@example.com`;
  assert.equal(longEmail.length, 255);
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", plusOne: { name: "Simona Ivanova", email: longEmail } }).error,
    "Please give a valid email."
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", plusOne: { name: "Simona Ivanova", email: longEmail.slice(1) } }).ok,
    true
  );

  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", sealCode: "W".repeat(33) }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", status: "attending", sealCode: "W".repeat(32) }).ok,
    true
  );
});

test("declined RSVP ignores the plus-one entirely", () => {
  const body = {
    guestName: "Peter Popov",
    status: "declined",
    plusOne: { name: "Simona", email: "not-an-email" },
  };
  assert.equal(validateRsvpPayload(body).ok, true);

  const row = buildRsvpRow(body, () => TOKEN, FIXED_NOW);
  assert.equal(row.status, "declined");
  assert.equal(row.plus_one_name, null);
  assert.equal(row.plus_one_email, null);
});

test("builds normalized RSVP row for Supabase", () => {
  const row = buildRsvpRow(
    {
      guestName: "Peter Popov",
      status: "attending",
      plusOne: { name: " Simona Ivanova ", email: "  Simona@Example.COM " },
      sealCode: "WSP.10.TEST",
    },
    () => TOKEN,
    FIXED_NOW
  );

  assert.deepEqual(row, {
    event_key: "whispers-2026-10-10",
    guest_id: TOKEN,
    guest_name: "Peter Popov",
    status: "attending",
    plus_one_name: "Simona Ivanova",
    plus_one_email: "simona@example.com",
    seal_code: "WSP.10.TEST",
    ticket_token: TOKEN,
    submitted_at: "2026-09-24T21:00:00.000Z",
  });
});

test("RSVP row ignores client-supplied token, guest id, event and timestamp", () => {
  const row = buildRsvpRow(
    {
      event: "some-other-event",
      guestId: "g1",
      ticketToken: "attacker-chosen-token",
      submittedAt: "1999-01-01T00:00:00.000Z",
      guestName: "Peter Popov",
      status: "attending",
    },
    () => TOKEN,
    FIXED_NOW
  );

  assert.equal(EVENT_KEY, "whispers-2026-10-10");
  assert.equal(row.event_key, EVENT_KEY);
  assert.equal(row.ticket_token, TOKEN);
  assert.equal(row.guest_id, TOKEN);
  assert.equal(row.submitted_at, "2026-09-24T21:00:00.000Z");
});

test("RSVP row caps the seal code at 32 characters", () => {
  const row = buildRsvpRow(
    { guestName: "Peter Popov", status: "attending", sealCode: "W".repeat(40) },
    () => TOKEN,
    FIXED_NOW
  );
  assert.equal(row.seal_code, "W".repeat(32));
});

test("builds an RSVP row for a free-form guest name", () => {
  const row = buildRsvpRow(
    {
      guestName: "  Peter Popov  ",
      status: "attending",
      sealCode: "WSP.10.TEST",
    },
    () => "ticket-token-1"
  );

  assert.equal(row.guest_id, "ticket-token-1");
  assert.equal(row.guest_name, "Peter Popov");
  assert.equal(row.ticket_token, "ticket-token-1");
  assert.equal(Number.isNaN(Date.parse(row.submitted_at)), false);
});

test("builds private ticket and check-in URLs from a URL-safe token", () => {
  const token = makeTicketToken(() => "123e4567-e89b-12d3-a456-426614174000");

  assert.equal(token, TOKEN);
  assert.equal(buildTicketUrl("https://whispers-invite.pages.dev/path", token), `https://whispers-invite.pages.dev/ticket/${TOKEN}`);
  assert.equal(buildCheckInUrl("https://whispers-invite.pages.dev/path", token), `https://whispers-invite.pages.dev/api/checkin?token=${TOKEN}`);
});

test("extracts a ticket token from a scanned value", () => {
  assert.equal(tokenFromValue(`https://whispers-invite.pages.dev/api/checkin?token=${TOKEN}`), TOKEN);
  assert.equal(tokenFromValue(`https://whispers-invite.pages.dev/ticket/${TOKEN}`), TOKEN);
  assert.equal(tokenFromValue(`  ${TOKEN}  `), TOKEN);
  assert.equal(tokenFromValue("A".repeat(40)), "A".repeat(40));
});

test("rejects scanned values that are not ticket tokens", () => {
  assert.equal(tokenFromValue(""), "");
  assert.equal(tokenFromValue(undefined), "");
  assert.equal(tokenFromValue({}), "");
  assert.equal(tokenFromValue(12345), "");
  assert.equal(tokenFromValue("hello world"), "");
  assert.equal(tokenFromValue("a".repeat(31)), "");
  assert.equal(tokenFromValue("a".repeat(41)), "");
  assert.equal(tokenFromValue(`${TOKEN.slice(0, 31)}-`), "");
  assert.equal(tokenFromValue("https://whispers-invite.pages.dev/api/checkin?token=abc"), "");
  assert.equal(tokenFromValue("https://example.com/"), "");
  assert.equal(tokenFromValue("*"), "");
});
