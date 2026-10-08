import test from "node:test";
import assert from "node:assert/strict";

import {
  RSVP_TIME_ZONE,
  buildRsvpSettingsPatch,
  effectiveRsvpPolicy,
  sofiaLocalToIso,
} from "../functions/_shared/rsvp-settings.js";

test("RSVP settings default to open without a database row", () => {
  assert.deepEqual(effectiveRsvpPolicy(null), {
    isOpen: true,
    scheduledChange: null,
    timezone: "Europe/Sofia",
  });
  assert.equal(RSVP_TIME_ZONE, "Europe/Sofia");
});
test("RSVP settings use the stored base state without a schedule", () => {
  assert.equal(effectiveRsvpPolicy({ rsvp_open: false }).isOpen, false);
  assert.equal(effectiveRsvpPolicy({ rsvp_open: true }).isOpen, true);
});

test("a scheduled RSVP state changes at the exact instant", () => {
  const row = {
    rsvp_open: true,
    rsvp_change_at: "2026-10-08T15:00:00.000Z",
    rsvp_change_to_open: false,
  };

  assert.deepEqual(effectiveRsvpPolicy(row, new Date("2026-10-08T14:59:59.999Z")), {
    isOpen: true,
    scheduledChange: { at: "2026-10-08T15:00:00.000Z", open: false },
    timezone: "Europe/Sofia",
  });
  assert.deepEqual(effectiveRsvpPolicy(row, new Date("2026-10-08T15:00:00.000Z")), {
    isOpen: false,
    scheduledChange: null,
    timezone: "Europe/Sofia",
  });
});

test("invalid or incomplete schedules do not change the base state", () => {
  assert.equal(effectiveRsvpPolicy({ rsvp_open: true, rsvp_change_at: "bad", rsvp_change_to_open: false }).isOpen, true);
  assert.equal(effectiveRsvpPolicy({ rsvp_open: false, rsvp_change_at: "2026-10-08T15:00:00.000Z" }).isOpen, false);
});

test("Sofia local values convert independently of the device timezone", () => {
  assert.equal(sofiaLocalToIso("2026-10-08T18:00"), "2026-10-08T15:00:00.000Z");
  assert.equal(sofiaLocalToIso("2026-12-08T18:00"), "2026-12-08T16:00:00.000Z");
});

test("Sofia local conversion rejects malformed and nonexistent local times", () => {
  assert.equal(sofiaLocalToIso(""), "");
  assert.equal(sofiaLocalToIso("2026-10-08 18:00"), "");
  assert.equal(sofiaLocalToIso("2026-02-30T18:00"), "");
  assert.equal(sofiaLocalToIso("2026-03-29T03:30"), "");
});

test("an immediate settings change clears any schedule", () => {
  const result = buildRsvpSettingsPatch(
    { targetOpen: false, changeAtLocal: null },
    { isOpen: true, scheduledChange: { at: "2026-10-09T15:00:00.000Z", open: false } },
    new Date("2026-10-08T12:00:00.000Z")
  );

  assert.deepEqual(result, {
    patch: {
      rsvp_open: false,
      rsvp_change_at: null,
      rsvp_change_to_open: null,
    },
  });
});
test("a future settings change preserves the current state until its schedule", () => {
  const result = buildRsvpSettingsPatch(
    { targetOpen: false, changeAtLocal: "2026-10-08T18:00" },
    { isOpen: true, scheduledChange: null },
    new Date("2026-10-08T12:00:00.000Z")
  );

  assert.deepEqual(result, {
    patch: {
      rsvp_open: true,
      rsvp_change_at: "2026-10-08T15:00:00.000Z",
      rsvp_change_to_open: false,
    },
  });
});

test("settings reject malformed, elapsed and same-state schedules", () => {
  const current = { isOpen: true, scheduledChange: null };
  const now = new Date("2026-10-08T15:00:00.000Z");

  assert.deepEqual(buildRsvpSettingsPatch({}, current, now), { error: "Choose whether RSVP should be open or locked." });
  assert.deepEqual(buildRsvpSettingsPatch({ targetOpen: false, changeAtLocal: "bad" }, current, now), { error: "Choose a valid Sofia date and time." });
  assert.deepEqual(buildRsvpSettingsPatch({ targetOpen: false, changeAtLocal: "2026-10-08T18:00" }, current, now), { error: "Choose a future Sofia date and time." });
  assert.deepEqual(buildRsvpSettingsPatch({ targetOpen: true, changeAtLocal: "2026-10-09T18:00" }, current, now), { error: "The scheduled state must differ from the current state." });
});

test("cancelling a schedule keeps the effective state indefinitely", () => {
  const result = buildRsvpSettingsPatch(
    { cancelScheduledChange: true },
    { isOpen: false, scheduledChange: { at: "2026-10-09T15:00:00.000Z", open: true } }
  );

  assert.deepEqual(result, {
    patch: {
      rsvp_open: false,
      rsvp_change_at: null,
      rsvp_change_to_open: null,
    },
  });
});
