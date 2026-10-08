import test from "node:test";
import assert from "node:assert/strict";
import { validateHallPositionPayload, validateMinimumSpendPayload, validateTablePositionPayload } from "../functions/_shared/staff-tables.js";

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
