import { EVENT_KEY } from "./rsvp.js";
import { json } from "./responses.js";
import { supabaseFetch } from "./supabase.js";

export const RSVP_TIME_ZONE = "Europe/Sofia";

const LOCAL_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const SOFIA_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: RSVP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const POLICY_FIELDS = {
  confirmation: {
    open: "rsvp_open",
    changeAt: "rsvp_change_at",
    changeToOpen: "rsvp_change_to_open",
  },
  updates: {
    open: "rsvp_updates_open",
    changeAt: "rsvp_updates_change_at",
    changeToOpen: "rsvp_updates_change_to_open",
  },
};

function dateParts(date) {
  const values = {};
  for (const part of SOFIA_FORMATTER.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return values;
}
function sameLocalTime(parts, expected) {
  return parts.year === expected.year &&
    parts.month === expected.month &&
    parts.day === expected.day &&
    parts.hour === expected.hour &&
    parts.minute === expected.minute;
}

export function sofiaLocalToIso(value) {
  const match = LOCAL_DATE_TIME_RE.exec(String(value || ""));
  if (!match) return "";
  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const localAsUtc = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);
  const calendarCheck = new Date(localAsUtc);
  if (calendarCheck.getUTCFullYear() !== expected.year ||
      calendarCheck.getUTCMonth() !== expected.month - 1 ||
      calendarCheck.getUTCDate() !== expected.day ||
      calendarCheck.getUTCHours() !== expected.hour ||
      calendarCheck.getUTCMinutes() !== expected.minute) return "";

  let candidate = localAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const shown = dateParts(new Date(candidate));
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second || 0);
    const adjustment = localAsUtc - shownAsUtc;
    candidate += adjustment;
    if (adjustment === 0) break;
  }

  const result = new Date(candidate);
  if (!Number.isFinite(result.getTime()) || !sameLocalTime(dateParts(result), expected)) return "";
  return result.toISOString();
}

function effectivePolicy(row, fields, now) {
  const baseOpen = row?.[fields.open] !== false;
  const changeAt = row?.[fields.changeAt] ? new Date(row[fields.changeAt]) : null;
  const changeToOpen = row?.[fields.changeToOpen];
  const hasSchedule = changeAt && Number.isFinite(changeAt.getTime()) && typeof changeToOpen === "boolean";
  if (!hasSchedule) {
    return { isOpen: baseOpen, scheduledChange: null, timezone: RSVP_TIME_ZONE };
  }
  if (changeAt.getTime() <= now.getTime()) {
    return { isOpen: changeToOpen, scheduledChange: null, timezone: RSVP_TIME_ZONE };
  }
  return {
    isOpen: baseOpen,
    scheduledChange: { at: changeAt.toISOString(), open: changeToOpen },
    timezone: RSVP_TIME_ZONE,
  };
}

export function effectiveRsvpPolicy(row, now = new Date()) {
  return {
    confirmation: effectivePolicy(row, POLICY_FIELDS.confirmation, now),
    updates: effectivePolicy(row, POLICY_FIELDS.updates, now),
  };
}

export function buildRsvpSettingsPatch(body, currentPolicy, now = new Date()) {
  const fields = POLICY_FIELDS[body?.setting];
  if (!fields) return { error: "Choose a valid RSVP setting." };
  const selectedPolicy = currentPolicy?.[body.setting];
  if (!selectedPolicy) return { error: "Could not load RSVP settings." };

  if (body?.cancelScheduledChange === true) {
    return {
      patch: {
        [fields.open]: selectedPolicy.isOpen,
        [fields.changeAt]: null,
        [fields.changeToOpen]: null,
      },
    };
  }
  if (typeof body?.targetOpen !== "boolean") {
    return { error: "Choose whether RSVP should be open or locked." };
  }

  const localValue = body.changeAtLocal == null ? "" : String(body.changeAtLocal).trim();
  if (!localValue) {
    return {
      patch: {
        [fields.open]: body.targetOpen,
        [fields.changeAt]: null,
        [fields.changeToOpen]: null,
      },
    };
  }

  const changeAt = sofiaLocalToIso(localValue);
  if (!changeAt) return { error: "Choose a valid Sofia date and time." };
  if (new Date(changeAt).getTime() <= now.getTime()) return { error: "Choose a future Sofia date and time." };
  if (body.targetOpen === selectedPolicy.isOpen) return { error: "The scheduled state must differ from the current state." };

  return {
    patch: {
      [fields.open]: selectedPolicy.isOpen,
      [fields.changeAt]: changeAt,
      [fields.changeToOpen]: body.targetOpen,
    },
  };
}

export async function loadRsvpPolicy(env, now = new Date()) {
  const result = await supabaseFetch(
    env,
    `/rest/v1/event_details?select=rsvp_open,rsvp_change_at,rsvp_change_to_open,rsvp_updates_open,rsvp_updates_change_at,rsvp_updates_change_to_open&event_key=eq.${encodeURIComponent(EVENT_KEY)}&limit=1`
  );
  if (result.error) return result;
  if (!result.response.ok) return { error: json({ error: "Could not load RSVP settings" }, 502) };
  const rows = await result.response.json();
  return { policy: effectiveRsvpPolicy(rows[0] || null, now) };
}
