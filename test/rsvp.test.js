import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_KEY,
  SEAL_ALPHABET,
  isDuplicatePlusOneEmail,
  isDuplicateSealCode,
  buildCheckInUrl,
  checkInRedirectPath,
  buildRsvpRow,
  buildTicketUrl,
  makeSealCode,
  makeTicketToken,
  tokenFromValue,
  validateGuestQuery,
  validateRsvpPayload,
} from "../functions/_shared/rsvp.js";

const TOKEN = "123e4567e89b12d3a456426614174000";
const FIXED_NOW = () => new Date("2026-09-24T21:00:00.000Z");
const FIXED_SEAL = () => "WSP·10·TEST";

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
});

test("RSVP caps name and email lengths", () => {
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
});

test("declined RSVP ignores the plus-one entirely", () => {
  const body = {
    guestName: "Peter Popov",
    status: "declined",
    plusOne: { name: "Simona", email: "not-an-email" },
  };
  assert.equal(validateRsvpPayload(body).ok, true);

  const row = buildRsvpRow(body, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  assert.equal(row.status, "declined");
  assert.equal(row.plus_one_name, null);
  assert.equal(row.plus_one_email, null);
  assert.equal(row.seal_code, null);
});

test("builds normalized RSVP row for Supabase", () => {
  const row = buildRsvpRow(
    {
      guestName: "Peter Popov",
      status: "attending",
      plusOne: { name: " Simona Ivanova ", email: "  Simona@Example.COM " },
    },
    () => TOKEN,
    FIXED_NOW,
    FIXED_SEAL
  );

  assert.deepEqual(row, {
    event_key: "whispers-2026-10-10",
    guest_id: TOKEN,
    guest_name: "Peter Popov",
    status: "attending",
    plus_one_name: "Simona Ivanova",
    plus_one_email: "simona@example.com",
    seal_code: "WSP·10·TEST",
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

test("RSVP row ignores a client-supplied seal code and uses the generated one", () => {
  const body = { guestName: "Peter Popov", status: "attending", sealCode: "WSP·10·FAKE" };
  assert.equal(validateRsvpPayload(body).ok, true);
  const row = buildRsvpRow(body, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  assert.equal(row.seal_code, "WSP·10·TEST");
});

test("RSVP row generates a fresh seal code by default", () => {
  const row = buildRsvpRow({ guestName: "Peter Popov", status: "attending" }, () => TOKEN, FIXED_NOW);
  assert.match(row.seal_code, /^WSP·10·[ACDEFGHJKMNPQRTUVWXYZ234679]{4}$/);
});

test("seal codes use the brief's format and injected randomness", () => {
  const picks = [0, 1, 2, SEAL_ALPHABET.length - 1];
  const seen = [];
  const code = makeSealCode((max) => {
    seen.push(max);
    return picks.shift();
  });
  assert.equal(code, `WSP·10·${SEAL_ALPHABET[0]}${SEAL_ALPHABET[1]}${SEAL_ALPHABET[2]}${SEAL_ALPHABET[SEAL_ALPHABET.length - 1]}`);
  assert.deepEqual(seen, [SEAL_ALPHABET.length, SEAL_ALPHABET.length, SEAL_ALPHABET.length, SEAL_ALPHABET.length]);
});

test("seal alphabet has no ambiguous characters", () => {
  for (const ch of "0O1IL5S8B") assert.equal(SEAL_ALPHABET.includes(ch), false, ch);
  assert.equal(new Set(SEAL_ALPHABET).size, SEAL_ALPHABET.length);
});

test("default seal codes are random and well-formed", () => {
  const codes = new Set();
  for (let i = 0; i < 200; i++) {
    const code = makeSealCode();
    assert.match(code, /^WSP·10·[ACDEFGHJKMNPQRTUVWXYZ234679]{4}$/);
    codes.add(code);
  }
  assert.ok(codes.size > 150);
});

test("builds an RSVP row for a free-form guest name", () => {
  const row = buildRsvpRow(
    {
      guestName: "  Peter Popov  ",
      status: "attending",
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

test("the staff scanner accepts a ticket page URL, which is what the QR now encodes", () => {
  const ticketUrl = buildTicketUrl("https://whispers-invite.pages.dev/", TOKEN);
  assert.equal(tokenFromValue(ticketUrl), TOKEN);
  assert.equal(tokenFromValue(`${ticketUrl}/`), TOKEN);
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

test("only a plus-one email unique violation counts as a duplicate email", () => {
  assert.equal(isDuplicatePlusOneEmail({ code: "23505", message: "duplicate key value violates unique constraint \"rsvps_event_plus_one_email_unique\"" }), true);
  assert.equal(isDuplicatePlusOneEmail({ code: "23503", message: "insert or update on table \"rsvps\" violates foreign key constraint \"rsvps_guest_id_fkey\"" }), false);
  assert.equal(isDuplicatePlusOneEmail({ code: "23505", message: "duplicate key value violates unique constraint \"rsvps_ticket_token_unique\"" }), false);
  assert.equal(isDuplicatePlusOneEmail(null), false);
});

test("only a seal code unique violation counts as a duplicate seal code", () => {
  assert.equal(isDuplicateSealCode({ code: "23505", message: "duplicate key value violates unique constraint \"rsvps_event_seal_code_unique\"" }), true);
  assert.equal(isDuplicateSealCode({ code: "23505", message: "duplicate key value violates unique constraint \"rsvps_event_plus_one_email_unique\"" }), false);
  assert.equal(isDuplicateSealCode({ code: "23503", message: "seal_code" }), false);
  assert.equal(isDuplicateSealCode({ code: "23505" }), false);
  assert.equal(isDuplicateSealCode(null), false);
  assert.equal(isDuplicatePlusOneEmail({ code: "23505", message: "duplicate key value violates unique constraint \"rsvps_event_seal_code_unique\"" }), false);
});

test("the old check-in link redirects to the ticket page", () => {
  assert.equal(checkInRedirectPath(TOKEN), `/ticket/${TOKEN}`);
  assert.equal(checkInRedirectPath("zzzz-audit-fake"), "/ticket/zzzz-audit-fake");
  assert.equal(checkInRedirectPath(null), "/");
  assert.equal(checkInRedirectPath(""), "/");
  assert.equal(checkInRedirectPath("   "), "/");
  assert.equal(checkInRedirectPath("../staff/rose-door-10"), "/");
  assert.equal(checkInRedirectPath("//evil.example"), "/");
  assert.equal(checkInRedirectPath("a b"), "/");
  assert.equal(checkInRedirectPath("a".repeat(65)), "/");
});
