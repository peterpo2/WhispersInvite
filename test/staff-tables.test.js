import test from "node:test";
import assert from "node:assert/strict";
import * as staffTables from "../functions/_shared/staff-tables.js";

const { validateHallPositionPayload, validateMinimumSpendPayload, validateTableAssignmentPayload, validateTableEditedPayload, validateTablePositionPayload, validateTableReadyPayload } = staffTables;

test("table ready status accepts only a table ID and boolean", () => {
  assert.deepEqual(validateTableReadyPayload({ tableId: "t4", isReady: true }), { tableId: "t4", isReady: true });
  assert.deepEqual(validateTableReadyPayload({ tableId: "t4", isReady: false }), { tableId: "t4", isReady: false });
  for (const body of [null, [], { tableId: "t4", isReady: "true" }, { tableId: "bad table", isReady: true }]) {
    assert.equal(validateTableReadyPayload(body), null);
  }
});

test("table assignment accepts typed RSVP and invite subjects", () => {
  assert.deepEqual(validateTableAssignmentPayload({ subjectType: "invite", subjectId: "invite-1", tableId: "t4" }), {
    subjectType: "invite",
    subjectId: "invite-1",
    tableId: "t4",
  });
  assert.deepEqual(validateTableAssignmentPayload({ subjectType: "rsvp", subjectId: 12, tableId: null }), {
    subjectType: "rsvp",
    subjectId: 12,
    tableId: null,
  });
});

test("table assignment rejects ambiguous and malformed subjects", () => {
  for (const body of [
    null,
    [],
    { rsvpId: 12, tableId: "t4" },
    { subjectType: "other", subjectId: 12, tableId: "t4" },
    { subjectType: "rsvp", subjectId: 0, tableId: "t4" },
    { subjectType: "rsvp", subjectId: "12", tableId: "t4" },
    { subjectType: "invite", subjectId: "bad invite", tableId: "t4" },
    { subjectType: "invite", subjectId: "x".repeat(121), tableId: "t4" },
    { subjectType: "invite", subjectId: "invite-1", tableId: "bad table" },
  ]) {
    assert.equal(validateTableAssignmentPayload(body), null);
  }
});

test("table registry makes invited guests assignable without duplicating confirmed groups", () => {
  const registry = staffTables.buildTableRegistry({
    invites: [
      { id: "invite-1", name: "Confirmed Invite", email: "confirmed@example.com", phone: "+359 88 100" },
      { id: "invite-2", name: "Waiting Invite", email: "waiting@example.com", phone: "+359 88 200" },
      { id: "invite-3", name: "Declined Invite", email: "declined@example.com", phone: "+359 88 300" },
      { id: "invite-4", name: "Searchable Invite", email: "search@example.com", phone: "+359 88 400" },
    ],
    rsvps: [
      { id: 11, guest_id: "invite-1", guest_name: "Confirmed Name", guest_email: "confirmed@example.com", guest_phone: "+359 88 100", status: "attending", plus_one_name: "Plus Person", plus_one_email: "plus@example.com" },
      { id: 12, guest_id: "invite-3", guest_name: "Declined Name", guest_email: "declined@example.com", guest_phone: "+359 88 300", status: "declined" },
    ],
    companions: [
      { id: 21, rsvp_id: 11, guest_name: "Added Person", email: "added@example.com", phone: "+359 88 500", status: "attending", guest_of: "Confirmed Name" },
    ],
    assignments: [
      { rsvp_id: 11, invite_id: null, table_id: "t3" },
      { rsvp_id: null, invite_id: "invite-2", table_id: "t4" },
    ],
  });

  assert.equal(registry.groups.length, 2);
  assert.deepEqual(registry.groups.map((group) => [group.name, group.status, group.tableId]), [
    ["Confirmed Invite", "attending", "t3"],
    ["Waiting Invite", "invited", "t4"],
  ]);
  assert.deepEqual(registry.groups[0].people, ["Confirmed Invite", "Plus Person", "Added Person"]);
  assert.equal(registry.groups[0].subjectType, "rsvp");
  assert.equal(registry.groups[0].subjectId, 11);
  assert.equal(registry.groups[0].confirmed, true);
  assert.equal(registry.groups[1].subjectType, "invite");
  assert.equal(registry.groups[1].subjectId, "invite-2");
  assert.equal(registry.groups[1].confirmed, false);
  assert.equal(registry.groups[1].size, 1);

  const waiting = registry.searchPeople.find((person) => person.id === "invite:invite-2");
  const searchable = registry.searchPeople.find((person) => person.id === "invite:invite-4");
  const declined = registry.searchPeople.find((person) => person.name === "Declined Invite");
  assert.deepEqual([waiting.assignable, waiting.subjectType, waiting.subjectId, waiting.tableId], [true, "invite", "invite-2", "t4"]);
  assert.deepEqual([searchable.assignable, searchable.subjectType, searchable.subjectId, searchable.tableId], [true, "invite", "invite-4", null]);
  assert.equal(declined.assignable, false);
  assert.equal(registry.groups.some((group) => group.name === "Declined Invite"), false);
});

test("table search combines invites and members without duplicating linked guests", () => {
  assert.equal(typeof staffTables.buildTableSearchPeople, "function");
  const searchPeople = staffTables.buildTableSearchPeople({
    invites: [
      { id: "invite-1", name: "Old Invite Name", email: "old@example.com", phone: "+359 88 100" },
      { id: "invite-2", name: "Waiting Guest", email: "waiting@example.com", phone: "+359 88 200" },
    ],
    rsvps: [
      { id: 11, guest_id: "invite-1", guest_name: "Confirmed Name", guest_email: "new@example.com", guest_phone: "+359 88 300", status: "attending", plus_one_name: "Plus Person", plus_one_email: "plus@example.com", plus_one_phone: "" },
      { id: 12, guest_id: "direct", guest_name: "Declined Person", guest_email: "declined@example.com", guest_phone: "", status: "declined" },
    ],
    companions: [
      { id: 21, rsvp_id: 11, guest_name: "Added Person", email: "added@example.com", phone: "+359 88 400", status: "attending", guest_of: "Confirmed Name" },
    ],
    groups: [{ rsvpId: 11, tableId: "table-3" }],
  });

  assert.equal(searchPeople.length, 5);
  assert.deepEqual(searchPeople.map((person) => person.name), ["Old Invite Name", "Waiting Guest", "Declined Person", "Plus Person", "Added Person"]);
  assert.deepEqual(searchPeople[0], {
    id: "guest:11",
    rsvpId: 11,
    subjectType: "rsvp",
    subjectId: 11,
    name: "Old Invite Name",
    email: "new@example.com",
    phone: "+359 88 300",
    guestOf: "",
    status: "attending",
    type: "Member",
    tableId: "table-3",
    assignable: true,
    aliases: ["Confirmed Name", "old@example.com", "+359 88 100"],
  });
  assert.equal(searchPeople[1].status, "invited");
  assert.equal(searchPeople[1].assignable, true);
  assert.equal(searchPeople[2].status, "declined");
  assert.equal(searchPeople[2].assignable, false);
  assert.equal(searchPeople[3].guestOf, "Confirmed Name");
  assert.equal(searchPeople[4].guestOf, "Confirmed Name");
});

test("linked admin invites keep their invite name while the RSVP name remains searchable", () => {
  const [person] = staffTables.buildTableSearchPeople({
    invites: [{ id: "admin-invite", name: "тест", email: "peterpopov250@gmail.com", phone: "" }],
    rsvps: [{ id: 31, guest_id: "other-id", guest_name: "Peter Popov", guest_email: "peterpopov250@gmail.com", guest_phone: "+359895787117", status: "attending" }],
    groups: [{ rsvpId: 31, tableId: null, people: ["Peter Popov"] }],
  });

  assert.equal(person.name, "тест");
  assert.equal(person.rsvpId, 31);
  assert.equal(person.assignable, true);
  assert.ok(person.aliases.includes("Peter Popov"));
});

test("minimum spend accepts whole non-negative euro amounts", () => {
  assert.deepEqual(validateMinimumSpendPayload({ tableId: "table-1", minimumSpendEur: 2500 }), {
    tableId: "table-1",
    minimumSpendEur: 2500,
  });
  assert.deepEqual(validateMinimumSpendPayload({ tableId: "table-20", minimumSpendEur: "0" }), {
    tableId: "table-20",
    minimumSpendEur: 0,
  });
  assert.deepEqual(validateMinimumSpendPayload({ tableId: "table-2", minimumSpendEur: "" }), {
    tableId: "table-2",
    minimumSpendEur: 0,
  });
});

test("minimum spend rejects malformed table IDs and invalid amounts", () => {
  for (const body of [
    null,
    {},
    { tableId: "", minimumSpendEur: 10 },
    { tableId: "x".repeat(41), minimumSpendEur: 10 },
    { tableId: "table-1", minimumSpendEur: -1 },
    { tableId: "table-1", minimumSpendEur: 12.5 },
    { tableId: "table-1", minimumSpendEur: "12.5" },
    { tableId: "table-1", minimumSpendEur: "abc" },
    { tableId: "table-1", minimumSpendEur: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    assert.equal(validateMinimumSpendPayload(body), null);
  }
});

test("table edited status requires an explicit map surface", () => {
  assert.deepEqual(validateTableEditedPayload({ tableId: "table-3", markEdited: true, editSurface: "hall" }), {
    tableId: "table-3",
    editSurface: "hall",
  });
  assert.deepEqual(validateTableEditedPayload({ tableId: "table-4", markEdited: true, editSurface: "tables" }), {
    tableId: "table-4",
    editSurface: "tables",
  });
  for (const body of [
    null,
    { tableId: "table-1", markEdited: false, editSurface: "hall" },
    { tableId: "table-1", markEdited: true, editSurface: "other" },
    { tableId: "bad id", markEdited: true, editSurface: "tables" },
  ]) {
    assert.equal(validateTableEditedPayload(body), null);
  }
});

test("table positions accept finite normalized coordinates", () => {
  assert.deepEqual(validateTablePositionPayload({ tableId: "t35", mapX: 12.345, mapY: "87.65" }), {
    tableId: "t35",
    mapX: 12.35,
    mapY: 87.65,
  });
  assert.deepEqual(validateTablePositionPayload({ tableId: "t1", mapX: 0, mapY: 100 }), {
    tableId: "t1",
    mapX: 0,
    mapY: 100,
  });
});

test("table positions reject invalid IDs and out-of-bounds coordinates", () => {
  for (const body of [
    null,
    {},
    { tableId: "", mapX: 10, mapY: 10 },
    { tableId: "bad id", mapX: 10, mapY: 10 },
    { tableId: "t1", mapX: -0.01, mapY: 10 },
    { tableId: "t1", mapX: 10, mapY: 100.01 },
    { tableId: "t1", mapX: Number.NaN, mapY: 10 },
    { tableId: "t1", mapX: Number.POSITIVE_INFINITY, mapY: 10 },
    { tableId: "t1", mapX: "", mapY: 10 },
  ]) {
    assert.equal(validateTablePositionPayload(body), null);
  }
});

test("hall position accepts percentages and rounds to two decimals", () => {
  assert.deepEqual(validateHallPositionPayload({ tableId: "t1", hallX: 10.314, hallY: "14.49" }), {
    tableId: "t1",
    hallX: 10.31,
    hallY: 14.49,
  });
  assert.deepEqual(validateHallPositionPayload({ tableId: "t35", hallX: 0, hallY: 100 }), {
    tableId: "t35",
    hallX: 0,
    hallY: 100,
  });
});

test("hall position rejects missing, null and out-of-range values", () => {
  for (const body of [
    null,
    [],
    {},
    { tableId: "t1" },
    { tableId: "t1", hallX: null, hallY: 10 },
    { tableId: "t1", hallX: 10, hallY: null },
    { tableId: "t1", hallX: "", hallY: 10 },
    { tableId: "t1", hallX: -1, hallY: 10 },
    { tableId: "t1", hallX: 10, hallY: 100.01 },
    { tableId: "t1", hallX: "abc", hallY: 10 },
    { tableId: "t1", hallX: Infinity, hallY: 10 },
    { tableId: "bad id", hallX: 10, hallY: 10 },
    { tableId: "t1", mapX: 10, mapY: 10 },
  ]) {
    assert.equal(validateHallPositionPayload(body), null, JSON.stringify(body));
  }
});
