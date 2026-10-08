import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_KEY,
  MAX_ADDED_GUESTS,
  SEAL_ALPHABET,
  TICKET_RELEASE_AT,
  addedGuestLimitReached,
  applyInviteToRsvpRow,
  buildConfirmationUrl,
  buildConfirmationUpdateUrl,
  isDuplicatePlusOneEmail,
  isDuplicateSealCode,
  buildCheckInUrl,
  buildInviteUrl,
  buildInviteRow,
  buildCompanionRow,
  checkInRedirectPath,
  buildRsvpRow,
  buildRsvpUpdate,
  confirmationCanUpdate,
  isLocalTicketReleasePreview,
  isTicketReleased,
  isTicketReleasedForRequest,
  normalizePhone,
  doorScans,
  pendingInviteTicket,
  publicVenue,
  sameAddedGuest,
  companionMatchesRsvp,
  tableReservationForUpdate,
  ticketForToken,
  buildTicketUrl,
  makeSealCode,
  makeTicketToken,
  tokenFromValue,
  validateInvitePayload,
  validateRsvpPayload,
} from "../functions/_shared/rsvp.js";

const TOKEN = "123e4567e89b12d3a456426614174000";
const FIXED_NOW = () => new Date("2026-09-24T21:00:00.000Z");
const FIXED_SEAL = () => "WSP·10·TEST";
const PLUS_TOKEN = "987f6543e21b12d3a456426614174999";
const ids = (...values) => () => values.shift();
const seals = (...values) => () => values.shift();
const CONTACT = { guestEmail: "peter@example.com", guestPhone: "+359 88 123 4567" };

test("attending RSVP requires full name, email and phone", () => {
  assert.equal(validateRsvpPayload({ guestName: "Peter", status: "attending", guestEmail: "peter@example.com", guestPhone: "+359 88 123 4567" }).error, "Please give your full name.");
  assert.equal(validateRsvpPayload({ guestName: "Peter Popov", status: "attending", guestPhone: "+359 88 123 4567" }).error, "Please give a valid email.");
  assert.equal(validateRsvpPayload({ guestName: "Peter Popov", status: "attending", guestEmail: "peter@example.com" }).error, "Please give your phone.");
  assert.equal(validateRsvpPayload({ guestName: "Peter Popov", status: "attending", guestEmail: "peter@example.com", guestPhone: "+359 88 123 4567" }).ok, true);
  assert.equal(validateRsvpPayload({ guestName: "Иван Петров", status: "attending", guestEmail: "ivan@example.com", guestPhone: "+359 88 123 4567" }).ok, true);
});

test("normalizes Bulgarian local phone numbers while preserving international numbers", () => {
  assert.equal(normalizePhone("887925250"), "+359 887925250");
  assert.equal(normalizePhone("0887925250"), "+359 887925250");
  assert.equal(normalizePhone(" 887 925 250 "), "+359 887925250");
  assert.equal(normalizePhone("+44 7700 900123"), "+44 7700 900123");
  assert.equal(normalizePhone("00359 887 925 250"), "+359 887 925 250");
});

test("RSVP and invite rows store normalized Bulgarian phone numbers", () => {
  const rsvp = buildRsvpRow(
    { guestName: "Peter Popov", guestEmail: "peter@example.com", guestPhone: "887925250", status: "attending" },
    ids("confirm0000000000000000000000000", TOKEN),
    FIXED_NOW,
    seals("WSP-10-TEST")
  );
  assert.equal(rsvp.guest_phone, "+359 887925250");
  const invite = buildInviteRow({ name: "Peter Popov", email: "peter@example.com", phone: "0887925250" }, ids("invite00000000000000000000000000"), FIXED_NOW);
  assert.equal(invite.phone, "+359 887925250");
});

test("added guest requires full name and email but phone is optional", () => {
  const base = { guestName: "Peter Popov", guestEmail: "peter@example.com", guestPhone: "+359 88 123 4567", status: "attending" };
  assert.equal(validateRsvpPayload({ ...base, plusOne: { name: "Simona Ivanova", phone: "+359 88 765 4321" } }).error, "Please give their email.");
  assert.equal(validateRsvpPayload({ ...base, plusOne: { name: "Simona Ivanova", email: "simona@example.com" } }).ok, true);
  assert.equal(validateRsvpPayload({ ...base, plusOne: { name: "Simona Ivanova", email: "bad", phone: "+359 88 765 4321" } }).error, "Please give a valid email.");
});

test("builds contact and reservation fields for the primary RSVP", () => {
  const row = buildRsvpRow(
    {
      guestName: "Peter Popov",
      guestEmail: " Peter@Example.COM ",
      guestPhone: " +359   88 123 4567 ",
      status: "attending",
      wantsTableReservation: true,
      plusOne: { name: "Simona Ivanova", email: "simona@example.com", phone: "+359 88 765 4321" },
    },
    ids("confirm0000000000000000000000000", TOKEN, "plusconfirm00000000000000000000", PLUS_TOKEN),
    FIXED_NOW,
    seals("WSP·10·TEST", "WSP·10·PLUS")
  );
  assert.equal(row.guest_email, "peter@example.com");
  assert.equal(row.guest_phone, "+359 88 123 4567");
  assert.equal(row.plus_one_email, "simona@example.com");
  assert.equal(row.plus_one_email_is_fallback, false);
  assert.equal(row.plus_one_phone, "+359 88 765 4321");
  assert.equal(row.wants_table_reservation, true);
});

test("invite payload allows a short admin name, with optional valid contact details", () => {
  assert.equal(validateInvitePayload({ name: "Peter", email: "peter@example.com", phone: "+359 88 123 4567" }).ok, true);
  assert.equal(validateInvitePayload({ name: " P ", email: "peter@example.com" }).error, "Please give their name.");
  assert.equal(validateInvitePayload({ name: "Peter Popov", email: "bad", phone: "+359 88 123 4567" }).error, "Please give a valid email.");
  assert.equal(validateInvitePayload({ name: "Peter Popov", email: "peter@example.com", phone: "" }).ok, true);
  assert.equal(validateInvitePayload({ name: "Peter Popov" }).ok, true);
  assert.equal(validateInvitePayload({ name: "Петър Попов", email: "peter@example.com", phone: "+359 88 123 4567" }).ok, true);
});

test("builds an invite row with separate confirmation and ticket tokens", () => {
  const row = buildInviteRow(
    { name: "  Peter   Popov ", email: " Peter@Example.COM ", phone: " +359   88 123 4567 " },
    ids("invite00000000000000000000000000", TOKEN),
    FIXED_NOW
  );
  assert.deepEqual(row, {
    id: "invite00000000000000000000000000",
    name: "Peter Popov",
    email: "peter@example.com",
    phone: "+359 88 123 4567",
    ticket_token: TOKEN,
    created_at: "2026-09-24T21:00:00.000Z",
    updated_at: "2026-09-24T21:00:00.000Z",
  });
});

test("RSVP rows get separate confirmation and ticket tokens", () => {
  const row = buildRsvpRow(
    { name: "ignore me", guestName: "Peter Popov", guestEmail: "peter@example.com", guestPhone: "+359 88 123 4567", status: "attending" },
    ids("confirm0000000000000000000000000", TOKEN),
    FIXED_NOW,
    FIXED_SEAL
  );
  assert.equal(row.confirmation_token, "confirm0000000000000000000000000");
  assert.equal(row.ticket_token, TOKEN);
  assert.notEqual(row.confirmation_token, row.ticket_token);
});

test("RSVP rows get separate companion confirmation and ticket tokens", () => {
  const row = buildRsvpRow(
    {
      guestName: "Peter Popov",
      guestEmail: "peter@example.com",
      guestPhone: "+359 88 123 4567",
      status: "attending",
      plusOne: { name: "Simona Ivanova", email: "simona@example.com" },
    },
    ids("confirm0000000000000000000000000", TOKEN, "plusconfirm00000000000000000000", PLUS_TOKEN),
    FIXED_NOW,
    seals("WSP·10·TEST", "WSP·10·PLUS")
  );
  assert.equal(row.plus_one_confirmation_token, "plusconfirm00000000000000000000");
  assert.equal(row.plus_one_ticket_token, PLUS_TOKEN);
  assert.notEqual(row.plus_one_confirmation_token, row.plus_one_ticket_token);
});

test("builds a name-only invite row without contact details", () => {
  const row = buildInviteRow(
    { name: "  Ivan   Ivanov " },
    ids("invite11111111111111111111111111", TOKEN),
    FIXED_NOW
  );
  assert.equal(row.name, "Ivan Ivanov");
  assert.equal(row.email, null);
  assert.equal(row.phone, null);
  assert.equal(row.ticket_token, TOKEN);
});

test("a personal invite can provide the primary RSVP ticket token", () => {
  const row = buildRsvpRow({ guestId: "invite-token", guestName: "Peter Popov", ...CONTACT, status: "attending" }, () => "generated0000000000000000000000", FIXED_NOW, FIXED_SEAL);
  const applied = applyInviteToRsvpRow(row, { id: "invite-token", ticket_token: TOKEN });
  assert.equal(applied.guest_id, "invite-token");
  assert.equal(applied.ticket_token, TOKEN);
  assert.equal(row.ticket_token, "generated0000000000000000000000");
});

test("pending invite tickets are locked until the guest RSVPs", () => {
  assert.deepEqual(pendingInviteTicket({ id: "invite00000000000000000000000000", name: "Peter Popov", ticket_token: TOKEN }, TOKEN), {
    holder: "invite",
    invite_id: "invite00000000000000000000000000",
    guest_name: "Peter Popov",
    seal_code: null,
    checked_in_at: null,
    bringing: null,
    brought_by: null,
    table_label: null,
    table_reserved: false,
    locked: true,
    pending: true,
  });
  assert.equal(pendingInviteTicket({ name: "Peter Popov", ticket_token: TOKEN }, PLUS_TOKEN), null);
});

test("builds companion row with optional phone", () => {
  const row = buildRsvpRow(
    {
      guestName: "Peter Popov",
      guestEmail: "peter@example.com",
      guestPhone: "+359 88 123 4567",
      status: "attending",
      plusOne: { name: "Simona Ivanova", email: "simona@example.com" },
    },
    ids("confirm0000000000000000000000000", TOKEN, "plusconfirm00000000000000000000", PLUS_TOKEN),
    FIXED_NOW,
    seals("WSP·10·TEST", "WSP·10·PLUS")
  );
  assert.deepEqual(buildCompanionRow(row, 42), {
    rsvp_id: 42,
    guest_name: "Simona Ivanova",
    email: "simona@example.com",
    email_is_fallback: false,
    phone: "",
    confirmation_token: "plusconfirm00000000000000000000",
    ticket_token: PLUS_TOKEN,
    seal_code: "WSP·10·PLUS",
  });
});

test("ticket release gate opens exactly at 09.10 18:00 Sofia time", () => {
  assert.equal(TICKET_RELEASE_AT, "2026-10-09T18:00:00+03:00");
  assert.equal(isTicketReleased(new Date("2026-10-09T14:59:59.000Z")), false);
  assert.equal(isTicketReleased(new Date("2026-10-09T15:00:00.000Z")), true);
});

test("confirmation update stays available after ticket release even with an added guest", () => {
  assert.equal(confirmationCanUpdate({ holder: "guest", status: "attending", guest_id: "invite1", bringing: null }, new Date("2026-10-09T14:59:59.000Z")), true);
  assert.equal(confirmationCanUpdate({ holder: "guest", status: "attending", guest_id: "invite1", bringing: "Michelle G" }, new Date("2026-10-09T14:59:59.000Z")), true);
  assert.equal(confirmationCanUpdate({ holder: "companion", status: "attending", guest_id: "invite1", bringing: null }, new Date("2026-10-09T14:59:59.000Z")), false);
  assert.equal(confirmationCanUpdate({ holder: "guest", status: "attending", guest_id: "invite1", bringing: null }, new Date("2026-10-09T15:00:00.000Z")), true);
});

test("builds a confirmation update URL without exposing ticket links", () => {
  assert.equal(
    buildConfirmationUpdateUrl("https://whisperssociety.com/confirmation/abc", "confirm000000000000000000000000"),
    "https://whisperssociety.com/invite?confirmation=confirm000000000000000000000000&update=1"
  );
});

test("ticket release preview works only on local development hosts", () => {
  assert.equal(isLocalTicketReleasePreview("http://127.0.0.1:8788/ticket/abc?preview=released"), true);
  assert.equal(isLocalTicketReleasePreview("http://localhost:8788/ticket/abc?preview=released"), true);
  assert.equal(isLocalTicketReleasePreview("http://[::1]:8788/ticket/abc?preview=released"), true);
  assert.equal(isLocalTicketReleasePreview("https://whisperssociety.com/ticket/abc?preview=released"), false);
  assert.equal(isLocalTicketReleasePreview("http://127.0.0.1:8788/ticket/abc?preview=locked"), false);
  assert.equal(isLocalTicketReleasePreview("not a url"), false);
});

test("ticket request release helper keeps production locked before release", () => {
  const before = new Date("2026-10-09T14:59:59.000Z");
  assert.equal(isTicketReleasedForRequest("https://whisperssociety.com/ticket/abc?preview=released", before), false);
  assert.equal(isTicketReleasedForRequest("http://127.0.0.1:8788/ticket/abc?preview=released", before), true);
  assert.equal(isTicketReleasedForRequest("https://whisperssociety.com/ticket/abc", new Date("2026-10-09T15:00:00.000Z")), true);
});

test("only one added guest is allowed per primary RSVP", () => {
  assert.equal(MAX_ADDED_GUESTS, 1);
  assert.equal(addedGuestLimitReached({ plus_one_name: null }, 0), false);
  assert.equal(addedGuestLimitReached({ plus_one_name: "Legacy Guest" }, 0), true);
  assert.equal(addedGuestLimitReached({ plus_one_name: null }, 1), true);
});

test("RSVP requires a selected guest and valid status", () => {
  assert.equal(validateRsvpPayload({ status: "attending" }).error, "Invalid RSVP");
  assert.equal(
    validateRsvpPayload({ guestId: "g1", guestName: "Peter Popov", ...CONTACT, status: "maybe" }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending" }).ok,
    true
  );
  assert.equal(validateRsvpPayload({ guestName: "Peter", ...CONTACT, status: "attending" }).error, "Please give your full name.");
});

test("RSVP rejects a guest id that is not a short string", () => {
  const base = { guestName: "Peter Popov", ...CONTACT, status: "attending" };
  assert.equal(validateRsvpPayload({ ...base, guestId: "petarp" }).ok, true);
  assert.equal(validateRsvpPayload({ ...base, guestId: 42 }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ ...base, guestId: "x".repeat(121) }).error, "Invalid RSVP");
});

test("plus-one requires a name and valid email", () => {
  assert.equal(
    validateRsvpPayload({
      guestId: "g1",
      guestName: "Peter Popov",
      ...CONTACT,
      status: "attending",
      plusOne: { name: "Simona Ivanova", email: "simona@example.com", phone: "+359 88 765 4321" },
    }).ok,
    true
  );

  assert.equal(
    validateRsvpPayload({
      guestId: "g1",
      guestName: "Peter Popov",
      ...CONTACT,
      status: "attending",
      plusOne: { name: "Simona Ivanova", email: "simona", phone: "+359 88 765 4321" },
    }).error,
    "Please give a valid email."
  );
});

test("RSVP rejects non-string guest and plus-one fields", () => {
  assert.equal(validateRsvpPayload({ guestName: {}, status: "attending" }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ guestName: ["Peter", "Popov"], status: "attending" }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ guestName: "Peter Popov", status: ["attending"] }).error, "Invalid RSVP");
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: {}, email: "a@example.com", phone: "+359 88 765 4321" } }).error,
    "Invalid RSVP"
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: "Simona Ivanova", email: {}, phone: "+359 88 765 4321" } }).error,
    "Please give a valid email."
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: "Simona Ivanova" }).error,
    "Invalid RSVP"
  );
});

test("RSVP caps name and email lengths", () => {
  const longName = `Peter ${"a".repeat(115)}`;
  assert.equal(longName.length, 121);
  assert.equal(validateRsvpPayload({ guestName: longName, ...CONTACT, status: "attending" }).error, "Please give a shorter name.");
  assert.equal(validateRsvpPayload({ guestName: longName.slice(0, 120), ...CONTACT, status: "attending" }).ok, true);

  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: longName, email: "a@example.com", phone: "+359 88 765 4321" } }).error,
    "Please give a shorter name."
  );

  const longEmail = `${"a".repeat(243)}@example.com`;
  assert.equal(longEmail.length, 255);
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: "Simona Ivanova", email: longEmail, phone: "+359 88 765 4321" } }).error,
    "Please give a valid email."
  );
  assert.equal(
    validateRsvpPayload({ guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: "Simona Ivanova", email: longEmail.slice(1), phone: "+359 88 765 4321" } }).ok,
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
      ...CONTACT,
      status: "attending",
      plusOne: { name: " Simona Ivanova ", email: "  Simona@Example.COM ", phone: "+359 88 765 4321" },
    },
    ids("confirm0000000000000000000000000", TOKEN, "plusconfirm00000000000000000000", PLUS_TOKEN),
    FIXED_NOW,
    seals("WSP·10·TEST", "WSP·10·PLUS")
  );

  assert.deepEqual(row, {
    event_key: "whispers-2026-10-10",
    guest_id: TOKEN,
    guest_name: "Peter Popov",
    guest_email: "peter@example.com",
    guest_phone: "+359 88 123 4567",
    status: "attending",
    plus_one_name: "Simona Ivanova",
    plus_one_email: "simona@example.com",
    plus_one_email_is_fallback: false,
    plus_one_phone: "+359 88 765 4321",
    wants_table_reservation: false,
    seal_code: "WSP·10·TEST",
    confirmation_token: "confirm0000000000000000000000000",
    ticket_token: TOKEN,
    plus_one_confirmation_token: "plusconfirm00000000000000000000",
    plus_one_ticket_token: PLUS_TOKEN,
    plus_one_seal_code: "WSP·10·PLUS",
    submitted_at: "2026-09-24T21:00:00.000Z",
  });
});

test("RSVP row ignores client-supplied token, event and timestamp", () => {
  const row = buildRsvpRow(
    {
      event: "some-other-event",
      guestId: "g1",
      ticketToken: "attacker-chosen-token",
      submittedAt: "1999-01-01T00:00:00.000Z",
      guestName: "Peter Popov",
      ...CONTACT,
      status: "attending",
    },
    () => TOKEN,
    FIXED_NOW
  );

  assert.equal(EVENT_KEY, "whispers-2026-10-10");
  assert.equal(row.event_key, EVENT_KEY);
  assert.equal(row.ticket_token, TOKEN);
  assert.equal(row.guest_id, "g1");
  assert.equal(row.submitted_at, "2026-09-24T21:00:00.000Z");
});

test("RSVP row falls back to the ticket token when there is no invitation guest id", () => {
  const row = buildRsvpRow({ guestName: "Peter Popov", ...CONTACT, status: "attending" }, () => TOKEN, FIXED_NOW);
  assert.equal(row.guest_id, TOKEN);
});

test("RSVP row ignores a client-supplied seal code and uses the generated one", () => {
  const body = { guestName: "Peter Popov", ...CONTACT, status: "attending", sealCode: "WSP·10·FAKE" };
  assert.equal(validateRsvpPayload(body).ok, true);
  const row = buildRsvpRow(body, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  assert.equal(row.seal_code, "WSP·10·TEST");
});

test("RSVP row generates a fresh seal code by default", () => {
  const row = buildRsvpRow({ guestName: "Peter Popov", ...CONTACT, status: "attending" }, () => TOKEN, FIXED_NOW);
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
      ...CONTACT,
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
  assert.equal(buildInviteUrl("https://whispers-invite.pages.dev/path", token), `https://whispers-invite.pages.dev/invite/${TOKEN}`);
  assert.equal(buildConfirmationUrl("https://whispers-invite.pages.dev/path", token), `https://whispers-invite.pages.dev/confirmation/${TOKEN}`);
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

test("repeat RSVP update keeps the existing ticket and seal code", () => {
  const row = buildRsvpRow(
    { guestId: "michelleg", guestName: "Michelle Georgieva", status: "attending", plusOne: { name: "Simona Ivanova", email: "Simona@Example.com" } },
    () => "newtoken000000000000000000000000",
    FIXED_NOW,
    FIXED_SEAL
  );
  const patch = buildRsvpUpdate(row, {
    ticket_token: TOKEN,
    seal_code: "WSP·10·KEEP",
    plus_one_name: "Simona Ivanova",
    plus_one_email: "simona@example.com",
    plus_one_ticket_token: PLUS_TOKEN,
    plus_one_seal_code: "WSP·10·PKEP",
  });

  assert.deepEqual(patch, {
    guest_name: "Michelle Georgieva",
    guest_email: "",
    guest_phone: "",
    status: "attending",
    plus_one_name: "Simona Ivanova",
    plus_one_email: "simona@example.com",
    plus_one_phone: "",
    plus_one_email_is_fallback: false,
    wants_table_reservation: false,
    seal_code: "WSP·10·KEEP",
    plus_one_ticket_token: PLUS_TOKEN,
    plus_one_seal_code: "WSP·10·PKEP",
    submitted_at: "2026-09-24T21:00:00.000Z",
  });
  assert.equal("ticket_token" in patch, false);
  assert.equal("guest_id" in patch, false);
  assert.equal("event_key" in patch, false);
});

test("repeat RSVP update gives a seal code to a guest who first declined", () => {
  const row = buildRsvpRow({ guestId: "g1", guestName: "Peter Popov", status: "attending" }, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  assert.equal(buildRsvpUpdate(row, { ticket_token: TOKEN, seal_code: null }).seal_code, "WSP·10·TEST");
});

test("repeat RSVP decline clears the plus-one and keeps the seal code", () => {
  const row = buildRsvpRow(
    { guestId: "g1", guestName: "Peter Popov", status: "declined", plusOne: { name: "Simona Ivanova", email: "simona@example.com" } },
    () => TOKEN,
    FIXED_NOW,
    FIXED_SEAL
  );
  const patch = buildRsvpUpdate(row, { ticket_token: TOKEN, seal_code: "WSP·10·KEEP" });
  assert.equal(patch.status, "declined");
  assert.equal(patch.plus_one_name, null);
  assert.equal(patch.plus_one_email, null);
  assert.equal(patch.seal_code, "WSP·10·KEEP");
});

test("a plus-one gets their own ticket token and seal code", () => {
  const row = buildRsvpRow(
    { guestName: "Peter Popov", status: "attending", plusOne: { name: "Simona Ivanova", email: "simona@example.com" } },
    ids("confirm0000000000000000000000000", TOKEN, "plusconfirm00000000000000000000", PLUS_TOKEN),
    FIXED_NOW,
    seals("WSP·10·AAAA", "WSP·10·BBBB")
  );
  assert.notEqual(row.plus_one_ticket_token, row.ticket_token);
  assert.equal(row.plus_one_ticket_token, PLUS_TOKEN);
  assert.equal(row.plus_one_seal_code, "WSP·10·BBBB");
});

test("a guest on their own has no plus-one ticket", () => {
  const row = buildRsvpRow({ guestName: "Peter Popov", status: "attending" }, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  assert.equal(row.plus_one_ticket_token, null);
  assert.equal(row.plus_one_seal_code, null);
});

test("repeat RSVP with a different plus-one issues them a new ticket", () => {
  const row = buildRsvpRow(
    { guestId: "g1", guestName: "Peter Popov", status: "attending", plusOne: { name: "Maria Nikolova", email: "maria@example.com" } },
    ids("newconfirm0000000000000000000000", "newguest0000000000000000000000000", "newplusconfirm000000000000000000", "newplus00000000000000000000000000"),
    FIXED_NOW,
    seals("WSP·10·NEWG", "WSP·10·NEWP")
  );
  const patch = buildRsvpUpdate(row, {
    ticket_token: TOKEN,
    seal_code: "WSP·10·KEEP",
    plus_one_email: "simona@example.com",
    plus_one_ticket_token: PLUS_TOKEN,
    plus_one_seal_code: "WSP·10·OLDP",
  });
  assert.equal(patch.plus_one_ticket_token, "newplus00000000000000000000000000");
  assert.equal(patch.plus_one_seal_code, "WSP·10·NEWP");
  assert.equal(patch.plus_one_checked_in_at, null);
});

const EXISTING_WITH_PLUS = {
  ticket_token: TOKEN,
  seal_code: "WSP·10·KEEP",
  plus_one_name: "Simona Ivanova",
  plus_one_email: "simona@example.com",
  plus_one_ticket_token: PLUS_TOKEN,
  plus_one_seal_code: "WSP·10·OLDP",
};

test("confirming again without a plus-one keeps the existing plus-one and their ticket", () => {
  const row = buildRsvpRow({ guestId: "g1", guestName: "Peter Popov", status: "attending" }, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  const patch = buildRsvpUpdate(row, EXISTING_WITH_PLUS);
  assert.equal(patch.plus_one_name, "Simona Ivanova");
  assert.equal(patch.plus_one_email, "simona@example.com");
  assert.equal(patch.plus_one_ticket_token, PLUS_TOKEN);
  assert.equal(patch.plus_one_seal_code, "WSP·10·OLDP");
  assert.equal("plus_one_checked_in_at" in patch, false);
});

test("a plus-one with the same email but a different name gets a new ticket", () => {
  const row = buildRsvpRow(
    { guestId: "g1", guestName: "Peter Popov", status: "attending", plusOne: { name: "Maria Nikolova", email: "simona@example.com" } },
    ids("confirm0000000000000000000000000", TOKEN, "newplusconfirm000000000000000000", "newplus00000000000000000000000000"),
    FIXED_NOW,
    seals("WSP·10·NEWG", "WSP·10·NEWP")
  );
  const patch = buildRsvpUpdate(row, EXISTING_WITH_PLUS);
  assert.equal(patch.plus_one_name, "Maria Nikolova");
  assert.equal(patch.plus_one_ticket_token, "newplus00000000000000000000000000");
  assert.equal(patch.plus_one_checked_in_at, null);
});

test("the same plus-one typed with different spacing or case keeps their ticket", () => {
  const row = buildRsvpRow(
    { guestId: "g1", guestName: "Peter Popov", status: "attending", plusOne: { name: "  simona   IVANOVA ", email: "Simona@Example.com" } },
    ids(TOKEN, "newplus00000000000000000000000000"),
    FIXED_NOW,
    seals("WSP·10·NEWG", "WSP·10·NEWP")
  );
  assert.equal(buildRsvpUpdate(row, EXISTING_WITH_PLUS).plus_one_ticket_token, PLUS_TOKEN);
});

test("legacy added guest matching detects the same +1 before enforcing the limit", () => {
  const row = buildRsvpRow(
    { guestId: "g1", guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: "  simona   IVANOVA ", email: "Simona@Example.com", phone: "+359 88 765 4321" } },
    ids(TOKEN, "newplus00000000000000000000000000"),
    FIXED_NOW,
    seals("WSP·10·NEWG", "WSP·10·NEWP")
  );
  assert.equal(sameAddedGuest(EXISTING_WITH_PLUS, row), true);
  assert.equal(sameAddedGuest({ ...EXISTING_WITH_PLUS, plus_one_name: "Maria Nikolova" }, row), false);
});

test("companion matching detects the same stored +1 before replacing it", () => {
  const row = buildRsvpRow(
    { guestId: "g1", guestName: "Peter Popov", ...CONTACT, status: "attending", plusOne: { name: "  simona   IVANOVA ", email: "Simona@Example.com", phone: "+359 88 765 4321" } },
    ids(TOKEN, "newplus00000000000000000000000000"),
    FIXED_NOW,
    seals("WSP·10·NEWG", "WSP·10·NEWP")
  );
  assert.equal(companionMatchesRsvp({ guest_name: "Simona Ivanova", email: "simona@example.com", email_is_fallback: false }, row), true);
  assert.equal(companionMatchesRsvp({ guest_name: "Maria Nikolova", email: "simona@example.com", email_is_fallback: false }, row), false);
});

test("confirmed table reservations stay requested during update details", () => {
  const row = buildRsvpRow({ guestId: "g1", guestName: "Peter Popov", ...CONTACT, status: "attending", wantsTableReservation: false }, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  assert.equal(tableReservationForUpdate(row, { wants_table_reservation: true, reservation_confirmed: true }), true);
  assert.equal(tableReservationForUpdate(row, { wants_table_reservation: true, reservation_confirmed: false }), false);
});

test("declining clears the plus-one and their ticket", () => {
  const row = buildRsvpRow({ guestId: "g1", guestName: "Peter Popov", status: "declined" }, () => TOKEN, FIXED_NOW, FIXED_SEAL);
  const patch = buildRsvpUpdate(row, EXISTING_WITH_PLUS);
  assert.equal(patch.plus_one_name, null);
  assert.equal(patch.plus_one_ticket_token, null);
  assert.equal(patch.plus_one_checked_in_at, null);
});

test("an RSVP may not carry a referral token for now", () => {
  const base = { guestName: "Maria Nikolova", ...CONTACT, status: "attending" };
  assert.equal(validateRsvpPayload({ ...base, referral: "michellegreferral" }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ ...base, referral: 5 }).error, "Invalid RSVP");
  assert.equal(validateRsvpPayload({ ...base, referral: "x".repeat(200) }).error, "Invalid RSVP");
});

const ROW = {
  guest_name: "Michelle Georgieva",
  status: "attending",
  seal_code: "WSP·10·GGGG",
  ticket_token: TOKEN,
  checked_in_at: "2026-10-10T20:00:00.000Z",
  plus_one_name: "Simona Ivanova",
  plus_one_seal_code: "WSP·10·PPPP",
  plus_one_ticket_token: PLUS_TOKEN,
  plus_one_checked_in_at: null,
};

test("the guest's token opens the guest's ticket", () => {
  assert.deepEqual(ticketForToken(ROW, TOKEN), {
    holder: "guest",
    guest_name: "Michelle Georgieva",
    seal_code: "WSP·10·GGGG",
    checked_in_at: "2026-10-10T20:00:00.000Z",
    bringing: "Simona Ivanova",
    brought_by: null,
    table_label: null,
    table_reserved: false,
    locked: false,
  });
});

test("the plus-one's token opens their own ticket", () => {
  assert.deepEqual(ticketForToken(ROW, PLUS_TOKEN), {
    holder: "plus_one",
    guest_name: "Simona Ivanova",
    seal_code: "WSP·10·PPPP",
    checked_in_at: null,
    bringing: null,
    brought_by: "Michelle Georgieva",
    table_label: null,
    table_reserved: false,
    locked: false,
  });
});

test("assigned tables are only guest-visible after reservation confirmation", () => {
  const assigned = { ...ROW, table_label: "Table 1", reservation_confirmed: false };
  const confirmed = { ...ROW, table_label: "Table 1", reservation_confirmed: true };
  assert.equal(ticketForToken(assigned, TOKEN).table_label, null);
  assert.equal(ticketForToken(assigned, TOKEN).table_reserved, false);
  assert.equal(ticketForToken(confirmed, TOKEN).table_label, null);
  assert.equal(ticketForToken(confirmed, TOKEN).table_reserved, true);
});

test("unknown tokens and declined replies have no ticket", () => {
  assert.equal(ticketForToken(ROW, "0".repeat(32)), null);
  assert.equal(ticketForToken({ ...ROW, status: "declined" }, TOKEN), null);
  assert.equal(ticketForToken(null, TOKEN), null);
});

test("door list shows the guest and the plus-one as separate check-ins, newest first", () => {
  const scans = doorScans([
    { ...ROW, plus_one_checked_in_at: "2026-10-10T20:05:00.000Z" },
    { guest_name: "Petar Popov", seal_code: "WSP·10·QQQQ", checked_in_at: "2026-10-10T20:02:00.000Z", plus_one_name: null, plus_one_checked_in_at: null },
  ]);
  assert.deepEqual(scans, [
    { guest_name: "Simona Ivanova", seal_code: "WSP·10·PPPP", checked_in_at: "2026-10-10T20:05:00.000Z", brought_by: "Michelle Georgieva" },
    { guest_name: "Petar Popov", seal_code: "WSP·10·QQQQ", checked_in_at: "2026-10-10T20:02:00.000Z", brought_by: null },
    { guest_name: "Michelle Georgieva", seal_code: "WSP·10·GGGG", checked_in_at: "2026-10-10T20:00:00.000Z", brought_by: null },
  ]);
});

test("the venue stays hidden until it is set and its reveal time has passed", () => {
  const now = new Date("2026-10-09T14:00:00.000Z");
  const details = { venue_name: "Hotel Juno", venue_address: "Sofia, Main St 1", map_url: "https://maps.google.com/?q=Hotel+Juno", reveal_at: "2026-10-09T15:00:00.000Z" };
  assert.equal(publicVenue(null, now), null);
  assert.equal(publicVenue({ venue_name: null, venue_address: null, reveal_at: null }, now), null);
  assert.equal(publicVenue(details, now), null);
  assert.deepEqual(publicVenue(details, new Date("2026-10-09T15:00:00.000Z")), {
    name: "Hotel Juno",
    address: "Sofia, Main St 1",
    mapUrl: "https://maps.google.com/?q=Hotel+Juno",
  });
  assert.equal(publicVenue({ ...details, reveal_at: null }, now).name, "Hotel Juno");
});

test("the venue map link must be https", () => {
  const details = { venue_name: "Hotel Juno", venue_address: null, map_url: "javascript:alert(1)", reveal_at: null };
  assert.equal(publicVenue(details, new Date()).mapUrl, null);
});
