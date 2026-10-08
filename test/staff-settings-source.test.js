import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("owner RSVP settings migration is idempotent and defaults to open", () => {
  const sql = read("sql/2026-10-08-owner-rsvp-settings.sql");
  assert.match(sql, /add column if not exists rsvp_open boolean not null default true/i);
  assert.match(sql, /add column if not exists rsvp_change_at timestamptz/i);
  assert.match(sql, /add column if not exists rsvp_change_to_open boolean/i);
  assert.match(sql, /event_details_rsvp_schedule_paired/i);
  assert.match(sql, /rsvp_change_at is null and rsvp_change_to_open is null/i);
  assert.match(sql, /rsvp_change_at is not null and rsvp_change_to_open is not null/i);
  assert.match(sql, /values \('whispers-2026-10-10', true\)/i);
  assert.match(sql, /on conflict \(event_key\) do nothing/i);
  assert.match(sql, /notify pgrst, 'reload schema'/i);
});

test("fresh schema contains the owner RSVP setting columns and constraint", () => {
  const sql = read("sql/schema.sql");
  assert.match(sql, /rsvp_open boolean not null default true/i);
  assert.match(sql, /rsvp_change_at timestamptz/i);
  assert.match(sql, /rsvp_change_to_open boolean/i);
  assert.match(sql, /constraint event_details_rsvp_schedule_paired check/i);
  assert.match(sql, /insert into event_details \(event_key, reveal_at, rsvp_open\)/i);
});

test("staff settings API is owner-only and validates updates before an upsert", () => {
  const source = read("functions/api/staff/settings.js");
  assert.match(source, /requireStaff\(request, env, "owner"\)/);
  assert.match(source, /export async function onRequestGet/);
  assert.match(source, /export async function onRequestPatch/);
  assert.match(source, /await request\.json\(\)/);
  assert.match(source, /buildRsvpSettingsPatch\(body, current\.policy/);
  assert.match(source, /resolution=merge-duplicates,return=representation/);
  assert.match(source, /event_key:\s*EVENT_KEY/);
  assert.match(source, /updated_at:/);
  assert.match(source, /export async function onRequest\(\)[\s\S]*methodNotAllowed\(\)/);
});

test("staff settings API route is explicitly allowlisted", () => {
  const source = read("functions/_shared/access.js");
  assert.match(source, /"\/api\/staff\/settings"/);
});

test("RSVP writes are blocked server-side while the owner setting is locked", () => {
  const source = read("functions/api/rsvp.js");
  assert.match(source, /import \{ loadRsvpPolicy \} from "\.\.\/_shared\/rsvp-settings\.js"/);
  assert.match(source, /const availability = await loadRsvpPolicy\(env\)/);
  assert.match(source, /if \(availability\.error\) return availability\.error/);
  assert.match(source, /if \(!availability\.policy\.isOpen\) return json\(\{ error: "RSVP is closed\." \}, 403\)/);
});

test("confirmation stays readable while the owner setting gates update details", () => {
  const source = read("functions/api/confirmation.js");
  assert.match(source, /import \{ loadRsvpPolicy \} from "\.\.\/_shared\/rsvp-settings\.js"/);
  assert.match(source, /const availability = await loadRsvpPolicy\(env\)/);
  assert.match(source, /const canUpdate = availability\.policy\.isOpen && confirmationCanUpdate\(ticket\)/);
  assert.match(source, /updateUrl: canUpdate \? buildConfirmationUpdateUrl/);
  assert.doesNotMatch(source, /if \(!availability\.policy\.isOpen\) return json\(/);
});

test("staff page renders RSVP settings only for the owner", () => {
  const source = read("functions/staff/rose-door-10.js");
  assert.match(source, /const settingsTab = staff\.user\.role === "owner" \?/);
  assert.match(source, /const settingsView = staff\.user\.role === "owner" \?/);
  assert.match(source, /data-view="settings">Settings<\/a>/);
  assert.match(source, /id="view-settings"/);
  assert.match(source, /id="rsvpSettingsStatus"/);
  assert.match(source, /id="rsvpChangeAt" type="datetime-local"/);
  assert.match(source, /Europe\/Sofia/);
  assert.match(source, /id="applyRsvpSetting"/);
  assert.match(source, /id="cancelRsvpSchedule"/);
  assert.match(source, /owner:\['scanner','members','tables','invite','menu','staff','settings','hallmap'\]/);
  assert.doesNotMatch(source, /admin:\[[^\]]*settings/);
  assert.doesNotMatch(source, /door:\[[^\]]*settings/);
  assert.doesNotMatch(source, /service:\[[^\]]*settings/);
});

test("owner settings UI loads, saves and cancels the RSVP schedule", () => {
  const source = read("functions/staff/rose-door-10.js");
  assert.match(source, /async function loadSettings\(\)/);
  assert.match(source, /async function saveRsvpSetting\(targetOpen\)/);
  assert.match(source, /async function cancelRsvpSchedule\(\)/);
  assert.match(source, /function renderRsvpSetting\(policy\)/);
  assert.match(source, /fetch\('\/api\/staff\/settings'/);
  assert.match(source, /changeAtLocal:/);
  assert.match(source, /cancelScheduledChange:true/);
  assert.match(source, /timeZone:'Europe\/Sofia'/);
  assert.match(source, /if\(name==='settings'\)loadSettings\(\)/);
  assert.match(source, /else if\(currentView==='settings'\)loadSettings\(\)/);
});

test("staff fallback preserves the owner RSVP settings controls", () => {
  const source = read("assets/staff-admin-fallback.js");
  assert.match(source, /owner:\["scanner","members","tables","invite","menu","staff","settings","hallmap"\]/);
  assert.match(source, /async function loadSettings\(\)/);
  assert.match(source, /async function saveRsvpSetting\(targetOpen\)/);
  assert.match(source, /async function cancelRsvpSchedule\(\)/);
  assert.match(source, /\/api\/staff\/settings/);
});
