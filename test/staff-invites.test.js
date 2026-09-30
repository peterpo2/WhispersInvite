import test from "node:test";
import assert from "node:assert/strict";
import { mergeInviteRowsForStaff } from "../functions/api/staff/invites.js";

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
