import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCheckInUrl,
  buildRsvpRow,
  buildTicketUrl,
  makeTicketToken,
  validateGuestQuery,
  validateRsvpPayload,
} from "../functions/_shared/rsvp.js";

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

test("builds normalized RSVP row for Supabase", () => {
  const row = buildRsvpRow({
    event: "whispers-2026-10-10",
    guestId: "g1",
    guestName: "Peter Popov",
    status: "attending",
    plusOne: { name: "Simona Ivanova", email: "  Simona@Example.COM " },
    sealCode: "WSP.10.TEST",
    submittedAt: "2026-09-24T20:00:00.000Z",
  });

  assert.equal(row.plus_one_email, "simona@example.com");
  assert.equal(row.guest_id, "g1");
  assert.equal(row.status, "attending");
});

test("builds an RSVP row for a free-form guest name", () => {
  const row = buildRsvpRow(
    {
      event: "whispers-2026-10-10",
      guestName: "  Peter Popov  ",
      status: "attending",
      sealCode: "WSP.10.TEST",
      submittedAt: "2026-09-24T20:00:00.000Z",
    },
    () => "ticket-token-1"
  );

  assert.equal(row.guest_id, "ticket-token-1");
  assert.equal(row.guest_name, "Peter Popov");
  assert.equal(row.ticket_token, "ticket-token-1");
});

test("builds private ticket and check-in URLs from a URL-safe token", () => {
  const token = makeTicketToken(() => "123e4567-e89b-12d3-a456-426614174000");

  assert.equal(token, "123e4567e89b12d3a456426614174000");
  assert.equal(buildTicketUrl("https://whispers-invite.pages.dev/path", token), "https://whispers-invite.pages.dev/ticket/123e4567e89b12d3a456426614174000");
  assert.equal(buildCheckInUrl("https://whispers-invite.pages.dev/path", token), "https://whispers-invite.pages.dev/api/checkin?token=123e4567e89b12d3a456426614174000");
});
