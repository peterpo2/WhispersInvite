import test from "node:test";
import assert from "node:assert/strict";

import { reservationStatePatch } from "../functions/_shared/reservation-state.js";

test("reservation state maps called and request fields independently", () => {
  assert.deepEqual(reservationStatePatch({ called: true }), { called: true });
  assert.deepEqual(reservationStatePatch({ wantsTableReservation: false }), { wants_table_reservation: false });
  assert.deepEqual(reservationStatePatch({ called: false, wantsTableReservation: true }), {
    wants_table_reservation: true,
    called: false,
  });
});

test("reservation state rejects the obsolete manual confirmation contract", () => {
  assert.equal(reservationStatePatch({ reservationConfirmed: true }), null);
  assert.equal(reservationStatePatch({ reservation_confirmed: true }), null);
  assert.equal(reservationStatePatch(null), null);
});
