const MAX_POSTGRES_INTEGER = 2147483647;
const TABLE_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const INVITE_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

function emailKey(value) {
  return String(value || "").trim().toLowerCase();
}

function phoneKey(value) {
  return String(value || "").replace(/\D/g, "");
}

function searchPerson({ id, rsvp, name, email, phone, guestOf = "", type, group, aliases = [], inviteId = "" }) {
  const status = rsvp?.status || "invited";
  const subjectType = group?.subjectType || (rsvp ? "rsvp" : "invite");
  const subjectId = group?.subjectId ?? (rsvp?.id || inviteId);
  return {
    id,
    rsvpId: rsvp?.id || null,
    subjectType,
    subjectId,
    name: name || "",
    email: email || "",
    phone: phone || "",
    guestOf,
    status,
    type,
    tableId: group?.tableId || null,
    assignable: status === "attending" || status === "invited",
    aliases: aliases.filter(Boolean),
  };
}

export function buildTableSearchPeople({ invites = [], rsvps = [], companions = [], groups = [] } = {}) {
  const groupByRsvp = new Map(groups.map((group) => [String(group.rsvpId), group]));
  const groupByInvite = new Map(groups.filter((group) => group.subjectType === "invite").map((group) => [String(group.subjectId), group]));
  const rsvpByGuestId = new Map(rsvps.map((rsvp) => [String(rsvp.guest_id || ""), rsvp]));
  const rsvpByEmail = new Map();
  const rsvpByPhone = new Map();
  for (const rsvp of rsvps) {
    const email = emailKey(rsvp.guest_email);
    const phone = phoneKey(rsvp.guest_phone);
    if (email && !rsvpByEmail.has(email)) rsvpByEmail.set(email, rsvp);
    if (phone && !rsvpByPhone.has(phone)) rsvpByPhone.set(phone, rsvp);
  }

  const primary = [];
  const secondary = [];
  const matchedRsvps = new Set();
  for (const invite of invites) {
    const rsvp = rsvpByGuestId.get(String(invite.id || ""))
      || rsvpByEmail.get(emailKey(invite.email))
      || rsvpByPhone.get(phoneKey(invite.phone))
      || null;
    if (rsvp && matchedRsvps.has(rsvp.id)) continue;
    if (rsvp) matchedRsvps.add(rsvp.id);
    const aliases = rsvp ? [rsvp.guest_name, invite.email, invite.phone] : [];
    primary.push(searchPerson({
      id: rsvp ? `guest:${rsvp.id}` : `invite:${invite.id}`,
      rsvp,
      name: invite.name || rsvp?.guest_name,
      email: rsvp?.guest_email || invite.email,
      phone: rsvp?.guest_phone || invite.phone,
      type: rsvp ? "Member" : "Invite",
      group: rsvp ? groupByRsvp.get(String(rsvp.id)) : groupByInvite.get(String(invite.id)),
      aliases,
      inviteId: invite.id,
    }));
  }

  for (const rsvp of rsvps) {
    if (!matchedRsvps.has(rsvp.id)) {
      primary.push(searchPerson({
        id: `guest:${rsvp.id}`,
        rsvp,
        name: rsvp.guest_name,
        email: rsvp.guest_email,
        phone: rsvp.guest_phone,
        type: "Member",
        group: groupByRsvp.get(String(rsvp.id)),
      }));
    }
    const group = groupByRsvp.get(String(rsvp.id));
    if (rsvp.plus_one_name) {
      secondary.push(searchPerson({
        id: `plus_one:${rsvp.id}`,
        rsvp,
        name: rsvp.plus_one_name,
        email: rsvp.plus_one_email,
        phone: rsvp.plus_one_phone,
        guestOf: rsvp.guest_name || "",
        type: "Plus-one",
        group,
      }));
    }
  }

  for (const companion of companions) {
    const rsvp = rsvps.find((row) => String(row.id) === String(companion.rsvp_id)) || {
      id: companion.rsvp_id,
      status: companion.status,
    };
    const duplicate = secondary.some((person) => String(person.rsvpId) === String(companion.rsvp_id)
      && emailKey(person.email) === emailKey(companion.email)
      && emailKey(person.name) === emailKey(companion.guest_name));
    if (duplicate) continue;
    secondary.push(searchPerson({
      id: `companion:${companion.id}`,
      rsvp,
      name: companion.guest_name,
      email: companion.email,
      phone: companion.phone,
      guestOf: companion.guest_of || rsvp.guest_name || "",
      type: "Added guest",
      group: groupByRsvp.get(String(companion.rsvp_id)),
    }));
  }

  return primary.concat(secondary);
}

function rsvpIndexes(rsvps) {
  const byGuestId = new Map();
  const byEmail = new Map();
  const byPhone = new Map();
  for (const rsvp of rsvps) {
    const guestId = String(rsvp.guest_id || "");
    const email = emailKey(rsvp.guest_email);
    const phone = phoneKey(rsvp.guest_phone);
    if (guestId && !byGuestId.has(guestId)) byGuestId.set(guestId, rsvp);
    if (email && !byEmail.has(email)) byEmail.set(email, rsvp);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, rsvp);
  }
  return { byGuestId, byEmail, byPhone };
}

function matchingRsvp(invite, indexes) {
  return indexes.byGuestId.get(String(invite.id || ""))
    || indexes.byEmail.get(emailKey(invite.email))
    || indexes.byPhone.get(phoneKey(invite.phone))
    || null;
}

function assignmentFor(assignments, type, id) {
  return assignments.find((assignment) => String(assignment[`${type}_id`] || "") === String(id)) || null;
}

function peopleForRsvp(rsvp, displayName, companions) {
  const peopleDetails = [{ name: displayName || rsvp.guest_name, email: rsvp.guest_email || "", phone: rsvp.guest_phone || "" }];
  if (rsvp.plus_one_name) {
    peopleDetails.push({ name: rsvp.plus_one_name, email: rsvp.plus_one_email || "", phone: rsvp.plus_one_phone || "" });
  }
  for (const companion of companions) {
    if (String(companion.rsvp_id) !== String(rsvp.id) || companion.status !== "attending") continue;
    if (companion.guest_name && !peopleDetails.some((person) => person.name === companion.guest_name)) {
      peopleDetails.push({ name: companion.guest_name, email: companion.email || "", phone: companion.phone || "" });
    }
  }
  return peopleDetails;
}

function rsvpGroup(rsvp, displayName, companions, assignment) {
  const peopleDetails = peopleForRsvp(rsvp, displayName, companions);
  const subjectType = assignment?.invite_id ? "invite" : "rsvp";
  const subjectId = assignment?.invite_id || rsvp.id;
  return {
    subjectType,
    subjectId,
    rsvpId: rsvp.id,
    name: displayName || rsvp.guest_name,
    size: peopleDetails.length,
    people: peopleDetails.map((person) => person.name),
    peopleDetails,
    wantsTableReservation: rsvp.wants_table_reservation === true,
    status: "attending",
    confirmed: true,
    called: rsvp.called === true,
    tableId: assignment?.table_id || null,
  };
}

export function buildTableRegistry({ invites = [], rsvps = [], companions = [], assignments = [] } = {}) {
  const groups = [];
  const matchedRsvps = new Set();
  const indexes = rsvpIndexes(rsvps);

  for (const invite of invites) {
    const rsvp = matchingRsvp(invite, indexes);
    const inviteAssignment = assignmentFor(assignments, "invite", invite.id);
    if (rsvp) matchedRsvps.add(rsvp.id);
    if (rsvp?.status === "attending") {
      const assignment = assignmentFor(assignments, "rsvp", rsvp.id) || inviteAssignment;
      groups.push(rsvpGroup(rsvp, invite.name || rsvp.guest_name, companions, assignment));
    } else if (!rsvp && inviteAssignment) {
      const peopleDetails = [{ name: invite.name || "", email: invite.email || "", phone: invite.phone || "" }];
      groups.push({
        subjectType: "invite",
        subjectId: invite.id,
        rsvpId: null,
        name: invite.name || "",
        size: 1,
        people: [invite.name || ""],
        peopleDetails,
        wantsTableReservation: false,
        status: "invited",
        confirmed: false,
        called: false,
        tableId: inviteAssignment.table_id,
      });
    }
  }

  for (const rsvp of rsvps) {
    if (matchedRsvps.has(rsvp.id) || rsvp.status !== "attending") continue;
    groups.push(rsvpGroup(rsvp, rsvp.guest_name, companions, assignmentFor(assignments, "rsvp", rsvp.id)));
  }

  return {
    groups,
    searchPeople: buildTableSearchPeople({ invites, rsvps, companions, groups }),
  };
}

export function validateTableAssignmentPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (body.subjectType !== "rsvp" && body.subjectType !== "invite") return null;
  let subjectId;
  if (body.subjectType === "rsvp") {
    if (!Number.isInteger(body.subjectId) || body.subjectId <= 0) return null;
    subjectId = body.subjectId;
  } else {
    if (typeof body.subjectId !== "string") return null;
    subjectId = body.subjectId.trim();
    if (!INVITE_ID_PATTERN.test(subjectId)) return null;
  }
  if (body.tableId != null && typeof body.tableId !== "string") return null;
  const tableId = typeof body.tableId === "string" ? body.tableId.trim() : null;
  if (tableId && !TABLE_ID_PATTERN.test(tableId)) return null;
  return { subjectType: body.subjectType, subjectId, tableId: tableId || null };
}

export function validateTableReadyPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.tableId !== "string" || typeof body.isReady !== "boolean") return null;
  const tableId = body.tableId.trim();
  if (!TABLE_ID_PATTERN.test(tableId)) return null;
  return { tableId, isReady: body.isReady };
}

export function validateMinimumSpendPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.tableId !== "string") return null;
  const tableId = body.tableId.trim();
  if (!TABLE_ID_PATTERN.test(tableId)) return null;

  const rawValue = body.minimumSpendEur;
  const normalized = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  const minimumSpendEur = normalized === "" ? 0 : Number(normalized);
  if (!Number.isSafeInteger(minimumSpendEur) || minimumSpendEur < 0 || minimumSpendEur > MAX_POSTGRES_INTEGER) {
    return null;
  }

  return { tableId, minimumSpendEur };
}

export function validateTableEditedPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.tableId !== "string" || body.markEdited !== true) return null;
  const tableId = body.tableId.trim();
  if (!TABLE_ID_PATTERN.test(tableId)) return null;
  if (body.editSurface !== "tables" && body.editSurface !== "hall") return null;
  return { tableId, editSurface: body.editSurface };
}

export function validateTablePositionPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.tableId !== "string") return null;
  const tableId = body.tableId.trim();
  if (!TABLE_ID_PATTERN.test(tableId)) return null;
  if (body.mapX === "" || body.mapY === "") return null;

  const mapX = Number(body.mapX);
  const mapY = Number(body.mapY);
  if (!Number.isFinite(mapX) || !Number.isFinite(mapY) || mapX < 0 || mapX > 100 || mapY < 0 || mapY > 100) {
    return null;
  }

  return {
    tableId,
    mapX: Math.round(mapX * 100) / 100,
    mapY: Math.round(mapY * 100) / 100,
  };
}

export function validateHallPositionPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (body.hallX === null || body.hallY === null) return null;
  const position = validateTablePositionPayload({ tableId: body.tableId, mapX: body.hallX, mapY: body.hallY });
  if (!position) return null;
  return { tableId: position.tableId, hallX: position.mapX, hallY: position.mapY };
}
