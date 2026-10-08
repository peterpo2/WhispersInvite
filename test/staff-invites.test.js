import test from "node:test";
import assert from "node:assert/strict";
import { mergeInviteRowsForStaff, validateInviteUpdatePayload } from "../functions/api/staff/invites.js";

test("staff invite registry includes direct RSVPs and companions without duplicating existing invites", () => {
  const rows = mergeInviteRowsForStaff("https://whisperssociety.com/staff/rose-door-10", {
    invites: [
      {
        id: "invite-a",
        name: "Invited Guest",
        email: "invited@example.com",
        phone: "+359111",
        ticket_token: "ticketinvite",
        created_at: "2026-09-30T10:00:00Z",
      },
    ],
    rsvps: [
      {
        id: 10,
        guest_id: "invite-a",
        status: "attending",
        submitted_at: "2026-09-30T11:00:00Z",
        guest_name: "Invited Guest RSVP",
        guest_email: "updated@example.com",
        guest_phone: "+359222",
        confirmation_token: "confirminvite",
        ticket_token: "ticketrsvp",
      },
      {
        id: 11,
        guest_id: "direct-rsvp",
        status: "attending",
        submitted_at: "2026-09-30T12:00:00Z",
        guest_name: "Direct Guest",
        guest_email: "direct@example.com",
        guest_phone: "+359333",
        confirmation_token: "confirmdirect",
        ticket_token: "ticketdirect",
      },
    ],
    companions: [
      {
        id: 20,
        rsvp_id: 11,
        guest_name: "Added Guest",
        email: "added@example.com",
        phone: "+359444",
        confirmation_token: "confirmadded",
        ticket_token: "ticketadded",
        created_at: "2026-09-30T12:05:00Z",
        rsvps: { guest_name: "Direct Guest", event_key: "whispers-2026-10-10" },
      },
    ],
  });

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.name), ["Added Guest", "Direct Guest", "Invited Guest"]);

  const invited = rows.find((row) => row.id === "invite-a");
  assert.equal(invited.inviteLink, "https://whisperssociety.com/invite/invite-a");
  assert.equal(invited.confirmationLink, "https://whisperssociety.com/confirmation/confirminvite");
  assert.equal(invited.ticketLink, "https://whisperssociety.com/ticket/ticketrsvp");
  assert.equal(invited.status, "attending");

  const direct = rows.find((row) => row.id === "rsvp:11");
  assert.equal(direct.inviteLink, "");
  assert.equal(direct.confirmationLink, "https://whisperssociety.com/confirmation/confirmdirect");
  assert.equal(direct.ticketLink, "https://whisperssociety.com/ticket/ticketdirect");
  assert.equal(direct.guestOf, "");

  const added = rows.find((row) => row.id === "companion:20");
  assert.equal(added.inviteLink, "");
  assert.equal(added.confirmationLink, "https://whisperssociety.com/confirmation/confirmadded");
  assert.equal(added.ticketLink, "https://whisperssociety.com/ticket/ticketadded");
  assert.equal(added.guestOf, "Direct Guest");
  assert.equal(added.source, "companion");
});

test("staff invite registry merges shared-link RSVPs into matching admin invites by contact", () => {
  const rows = mergeInviteRowsForStaff("https://whisperssociety.com/staff/rose-door-10", {
    invites: [
      {
        id: "admin-invite",
        name: "Peter Popov",
        email: "PeterPopov250@gmail.com",
        phone: "",
        ticket_token: "ticketinvite",
        created_at: "2026-10-01T01:23:33+03:00",
      },
    ],
    rsvps: [
      {
        id: 31,
        guest_id: "direct-shared-flow-token",
        status: "attending",
        submitted_at: "2026-10-01T01:26:27+03:00",
        guest_name: "Peter Popov",
        guest_email: "peterpopov250@gmail.com",
        guest_phone: "+359887925250",
        confirmation_token: "confirmdirect",
        ticket_token: "ticketdirect",
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "admin-invite");
  assert.equal(rows[0].source, "invite");
  assert.equal(rows[0].status, "attending");
  assert.equal(rows[0].inviteLink, "https://whisperssociety.com/invite/admin-invite");
  assert.equal(rows[0].confirmationLink, "https://whisperssociety.com/confirmation/confirmdirect");
  assert.equal(rows[0].ticketLink, "https://whisperssociety.com/ticket/ticketdirect");
  assert.equal(rows[0].rsvpEmail, "peterpopov250@gmail.com");
  assert.equal(rows[0].rsvpPhone, "+359887925250");
});

test("staff invite edit payload only accepts editable invite contact fields", () => {
  assert.deepEqual(validateInviteUpdatePayload({
    id: "invite-a",
    name: "Jordan",
    email: " Jordan@Example.com ",
    phone: "0882926438",
    ticketToken: "should-not-be-saved",
  }), {
    ok: true,
    id: "invite-a",
    patch: {
      name: "Jordan",
      email: "jordan@example.com",
      phone: "+359 882926438",
    },
  });

  assert.equal(validateInviteUpdatePayload({ id: "rsvp:10", name: "Jordan" }).error, "Invalid invite");
  assert.equal(validateInviteUpdatePayload({ id: "companion:10", name: "Jordan" }).error, "Invalid invite");
  assert.equal(validateInviteUpdatePayload({ id: "invite-a", name: "J" }).error, "Please give their name.");
  assert.equal(validateInviteUpdatePayload({ id: "invite-a", email: "not-an-email" }).error, "Please give a valid email.");
  assert.equal(validateInviteUpdatePayload({ id: "invite-a" }).error, "Nothing to update");
});
