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
    confirmation: { isOpen: true, scheduledChange: null, timezone: "Europe/Sofia" },
    updates: { isOpen: true, scheduledChange: null, timezone: "Europe/Sofia" },
  });
  assert.equal(RSVP_TIME_ZONE, "Europe/Sofia");
});
test("confirmation and update settings use independent stored states", () => {
  const policy = effectiveRsvpPolicy({ rsvp_open: false, rsvp_updates_open: true });
  assert.equal(policy.confirmation.isOpen, false);
  assert.equal(policy.updates.isOpen, true);
});

test("independent scheduled states change at their exact instants", () => {
  const row = {
    rsvp_open: true,
    rsvp_change_at: "2026-10-08T15:00:00.000Z",
    rsvp_change_to_open: false,
    rsvp_updates_open: false,
    rsvp_updates_change_at: "2026-10-08T16:00:00.000Z",
    rsvp_updates_change_to_open: true,
  };

  assert.deepEqual(effectiveRsvpPolicy(row, new Date("2026-10-08T15:00:00.000Z")), {
    confirmation: {
      isOpen: false,
      scheduledChange: null,
      timezone: "Europe/Sofia",
    },
    updates: {
      isOpen: false,
      scheduledChange: { at: "2026-10-08T16:00:00.000Z", open: true },
      timezone: "Europe/Sofia",
    },
  });
  assert.deepEqual(effectiveRsvpPolicy(row, new Date("2026-10-08T16:00:00.000Z")), {
    confirmation: {
      isOpen: false,
      scheduledChange: null,
      timezone: "Europe/Sofia",
    },
    updates: {
      isOpen: true,
      scheduledChange: null,
      timezone: "Europe/Sofia",
    },
  });
});

test("invalid or incomplete schedules do not change either base state", () => {
  const policy = effectiveRsvpPolicy({
    isOpen: true,
    rsvp_open: true,
    rsvp_change_at: "bad",
    rsvp_change_to_open: false,
    rsvp_updates_open: false,
    rsvp_updates_change_at: "2026-10-08T15:00:00.000Z",
  });
  assert.equal(policy.confirmation.isOpen, true);
  assert.equal(policy.updates.isOpen, false);
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

test("an immediate confirmation change only clears the confirmation schedule", () => {
  const result = buildRsvpSettingsPatch(
    { setting: "confirmation", targetOpen: false, changeAtLocal: null },
    {
      confirmation: { isOpen: true, scheduledChange: { at: "2026-10-09T15:00:00.000Z", open: false } },
      updates: { isOpen: true, scheduledChange: null },
    },
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
test("a future update change only writes update policy columns", () => {
  const result = buildRsvpSettingsPatch(
    { setting: "updates", targetOpen: false, changeAtLocal: "2026-10-08T18:00" },
    {
      confirmation: { isOpen: false, scheduledChange: null },
      updates: { isOpen: true, scheduledChange: null },
    },
    new Date("2026-10-08T12:00:00.000Z")
  );

  assert.deepEqual(result, {
    patch: {
      rsvp_updates_open: true,
      rsvp_updates_change_at: "2026-10-08T15:00:00.000Z",
      rsvp_updates_change_to_open: false,
    },
  });
});

test("settings reject invalid selectors, malformed times and same-state schedules", () => {
  const current = {
    confirmation: { isOpen: true, scheduledChange: null },
    updates: { isOpen: false, scheduledChange: null },
  };
  const now = new Date("2026-10-08T15:00:00.000Z");

  assert.deepEqual(buildRsvpSettingsPatch({}, current, now), { error: "Choose a valid RSVP setting." });
  assert.deepEqual(buildRsvpSettingsPatch({ setting: "confirmation" }, current, now), { error: "Choose whether RSVP should be open or locked." });
  assert.deepEqual(buildRsvpSettingsPatch({ setting: "confirmation", targetOpen: false, changeAtLocal: "bad" }, current, now), { error: "Choose a valid Sofia date and time." });
  assert.deepEqual(buildRsvpSettingsPatch({ setting: "confirmation", targetOpen: false, changeAtLocal: "2026-10-08T18:00" }, current, now), { error: "Choose a future Sofia date and time." });
  assert.deepEqual(buildRsvpSettingsPatch({ setting: "updates", targetOpen: false, changeAtLocal: "2026-10-09T18:00" }, current, now), { error: "The scheduled state must differ from the current state." });
});

test("cancelling an update schedule keeps its effective state indefinitely", () => {
  const result = buildRsvpSettingsPatch(
    { setting: "updates", cancelScheduledChange: true },
    {
      confirmation: { isOpen: true, scheduledChange: null },
      updates: { isOpen: false, scheduledChange: { at: "2026-10-09T15:00:00.000Z", open: true } },
    }
  );

  assert.deepEqual(result, {
    patch: {
      rsvp_updates_open: false,
      rsvp_updates_change_at: null,
      rsvp_updates_change_to_open: null,
    },
  });
});
