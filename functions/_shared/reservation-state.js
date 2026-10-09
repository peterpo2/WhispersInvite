export function reservationStatePatch(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const patch = {};
  if (typeof body.wantsTableReservation === "boolean") patch.wants_table_reservation = body.wantsTableReservation;
  if (typeof body.called === "boolean") patch.called = body.called;
  return Object.keys(patch).length ? patch : null;
}
