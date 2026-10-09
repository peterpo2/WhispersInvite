import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadApi() {
  const window = {};
  vm.runInNewContext(readFileSync("assets/map-draft.js", "utf8"), { window });
  return window.WhispersMapDraft;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("draft controller tracks moves, undo and confirmed positions", () => {
  const draft = loadApi().create({ historyLimit: 5 });
  draft.load([{ id: "1", position: { x: 10, y: 20 } }]);
  assert.equal(draft.hasChanges(), false);
  assert.equal(draft.move("1", { x: 10, y: 20 }), false);
  assert.equal(draft.move("1", { x: 12, y: 22 }), true);
  assert.equal(draft.hasChanges(), true);
  assert.deepEqual(plain(draft.pending()), [{ id: "1", position: { x: 12, y: 22 } }]);
  assert.deepEqual(plain(draft.undo()), { id: "1", position: { x: 10, y: 20 } });
  assert.equal(draft.hasChanges(), false);
});

test("draft controller keeps only the latest five completed moves", () => {
  const draft = loadApi().create({ historyLimit: 5 });
  draft.load([{ id: "1", position: { x: 0, y: 0 } }]);
  for (let x = 1; x <= 6; x += 1) draft.move("1", { x, y: 0 });
  for (let count = 0; count < 5; count += 1) assert.ok(draft.undo());
  assert.equal(draft.undo(), null);
  assert.deepEqual(plain(draft.position("1")), { x: 1, y: 0 });
});

test("confirm and discard support partial saves and off-plan positions", () => {
  const draft = loadApi().create();
  draft.load([
    { id: "1", position: { x: null, y: null } },
    { id: "2", position: { x: 20, y: 30 } },
  ]);
  draft.move("1", { x: 11, y: 12 });
  draft.move("2", { x: 21, y: 31 });
  draft.confirm("1", { x: 11, y: 12 });
  assert.deepEqual(plain(draft.pending()), [{ id: "2", position: { x: 21, y: 31 } }]);
  assert.deepEqual(plain(draft.discard()), [{ id: "2", position: { x: 20, y: 30 } }]);
  assert.equal(draft.hasChanges(), false);
});

test("registry aggregates saves and discards from dirty sources", async () => {
  const registry = loadApi().registry;
  const events = [];
  let dirty = true;
  registry.register("one", {
    isDirty: () => dirty,
    save: async () => { events.push("save"); dirty = false; return true; },
    discard: () => events.push("discard"),
  });
  assert.equal(registry.hasChanges(), true);
  assert.equal(await registry.saveAll(), true);
  assert.deepEqual(events, ["save"]);
  dirty = true;
  registry.discardAll();
  assert.deepEqual(events, ["save", "discard"]);
});
