const MAX_POSTGRES_INTEGER = 2147483647;
const TABLE_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

function emailKey(value) {
  return String(value || "").trim().toLowerCase();
}

function phoneKey(value) {
  return String(value || "").replace(/\D/g, "");
}

function searchPerson({ id, rsvp, name, email, phone, guestOf = "", type, group, aliases = [] }) {
  const status = rsvp?.status || "not_responded";
  return {
    id,
    rsvpId: rsvp?.id || null,
    name: name || "",
    email: email || "",
    phone: phone || "",
    guestOf,
    status,
    type,
    tableId: group?.tableId || null,
    assignable: status === "attending" && Boolean(rsvp?.id),
    aliases: aliases.filter(Boolean),
  };
}

export function buildTableSearchPeople({ invites = [], rsvps = [], companions = [], groups = [] } = {}) {
  const groupByRsvp = new Map(groups.map((group) => [String(group.rsvpId), group]));
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
      group: rsvp ? groupByRsvp.get(String(rsvp.id)) : null,
      aliases,
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
