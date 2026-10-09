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
  assert.match(sql, /insert into event_details \(event_key, reveal_at, rsvp_open, rsvp_updates_open\)/i);
});

test("independent update-details migration is idempotent and defaults open", () => {
  const sql = read("sql/2026-10-08-independent-rsvp-controls.sql");
  assert.match(sql, /add column if not exists rsvp_updates_open boolean not null default true/i);
  assert.match(sql, /add column if not exists rsvp_updates_change_at timestamptz/i);
  assert.match(sql, /add column if not exists rsvp_updates_change_to_open boolean/i);
  assert.match(sql, /event_details_rsvp_updates_schedule_paired/i);
  assert.match(sql, /rsvp_updates_change_at is null and rsvp_updates_change_to_open is null/i);
  assert.match(sql, /rsvp_updates_change_at is not null and rsvp_updates_change_to_open is not null/i);
  assert.match(sql, /notify pgrst, 'reload schema'/i);
  assert.doesNotMatch(sql, /update\s+public\.event_details\s+set\s+rsvp_open/i);
});

test("fresh schema contains independent update-details policy columns", () => {
  const sql = read("sql/schema.sql");
  assert.match(sql, /rsvp_updates_open boolean not null default true/i);
  assert.match(sql, /rsvp_updates_change_at timestamptz/i);
  assert.match(sql, /rsvp_updates_change_to_open boolean/i);
  assert.match(sql, /constraint event_details_rsvp_updates_schedule_paired check/i);
  assert.match(sql, /insert into event_details \(event_key, reveal_at, rsvp_open, rsvp_updates_open\)/i);
});

test("staff settings API is owner-only and validates updates before an upsert", () => {
  const source = read("functions/api/staff/settings.js");
  assert.match(source, /requireStaff\(request, env, "owner"\)/);
  assert.match(source, /export async function onRequestGet/);
  assert.match(source, /export async function onRequestPatch/);
  assert.match(source, /await request\.json\(\)/);
  assert.match(source, /buildRsvpSettingsPatch\(body, current\.policy/);
  assert.match(source, /select=rsvp_open,rsvp_change_at,rsvp_change_to_open,rsvp_updates_open,rsvp_updates_change_at,rsvp_updates_change_to_open/);
  assert.match(source, /resolution=merge-duplicates,return=representation/);
  assert.match(source, /event_key:\s*EVENT_KEY/);
  assert.match(source, /updated_at:/);
  assert.match(source, /rsvp: effectiveRsvpPolicy\(rows\[0\], now\)/);
  assert.match(source, /export async function onRequest\(\)[\s\S]*methodNotAllowed\(\)/);
});

test("staff settings API route is explicitly allowlisted", () => {
  const source = read("functions/_shared/access.js");
  assert.match(source, /"\/api\/staff\/settings"/);
  assert.match(source, /"\/api\/staff\/ticket-bulk-send"/);
});

test("RSVP writes use independent confirmation and update policies", () => {
  const source = read("functions/api/rsvp.js");
  assert.match(source, /import \{ loadRsvpPolicy \} from "\.\.\/_shared\/rsvp-settings\.js"/);
  assert.match(source, /const availability = await loadRsvpPolicy\(env\)/);
  assert.match(source, /if \(availability\.error\) return availability\.error/);
  assert.match(source, /if \(!availability\.policy\.updates\.isOpen\) return json\(\{ error: "Updates are closed\." \}, 403\)/);
  assert.match(source, /if \(!availability\.policy\.confirmation\.isOpen\)[\s\S]*?return json\(\{ error: "RSVP confirmations are closed\." \}, 403\)/);
});

test("confirmation stays readable while the owner setting gates update details", () => {
  const source = read("functions/api/confirmation.js");
  assert.match(source, /import \{ loadRsvpPolicy \} from "\.\.\/_shared\/rsvp-settings\.js"/);
  assert.match(source, /const availability = await loadRsvpPolicy\(env\)/);
  assert.match(source, /const canUpdate = availability\.policy\.updates\.isOpen && confirmationCanUpdate\(ticket\)/);
  assert.match(source, /updateUrl: canUpdate \? buildConfirmationUpdateUrl/);
  assert.doesNotMatch(source, /if \(!availability\.policy\.updates\.isOpen\) return json\(/);
});

test("staff page renders RSVP settings only for the owner", () => {
  const source = read("functions/staff/rose-door-10.js");
  assert.match(source, /const settingsTab = staff\.user\.role === "owner" \?/);
  assert.match(source, /const settingsView = staff\.user\.role === "owner" \?/);
  assert.match(source, /data-view="settings">Settings<\/a>/);
  assert.match(source, /id="view-settings"/);
  assert.match(source, />New confirmations</);
  assert.match(source, /id="confirmationSettingsStatus"/);
  assert.match(source, /id="confirmationChangeAt" type="datetime-local"/);
  assert.match(source, />Update details</);
  assert.match(source, /id="updatesSettingsStatus"/);
  assert.match(source, /id="updatesChangeAt" type="datetime-local"/);
  assert.match(source, /Europe\/Sofia/);
  assert.match(source, /id="applyConfirmationSetting"/);
  assert.match(source, /id="cancelConfirmationSchedule"/);
  assert.match(source, /id="applyUpdatesSetting"/);
  assert.match(source, /id="cancelUpdatesSchedule"/);
  assert.match(source, />Ticket emails</);
  assert.match(source, /id="ticketBulkSendAt" type="datetime-local"/);
  assert.match(source, /id="previewTicketBulkSend"/);
  assert.match(source, /id="sendTicketBulkSend"/);
  assert.match(source, /id="ticketBulkSendState"/);
  assert.match(source, /owner:\['scanner','members','tables','invite','menu','staff','settings','hallmap'\]/);
  assert.doesNotMatch(source, /admin:\[[^\]]*settings/);
  assert.doesNotMatch(source, /door:\[[^\]]*settings/);
  assert.doesNotMatch(source, /service:\[[^\]]*settings/);
});

test("owner settings UI loads, saves and cancels the RSVP schedule", () => {
  const source = read("functions/staff/rose-door-10.js");
  assert.match(source, /async function loadSettings\(\)/);
  assert.match(source, /async function saveRsvpSetting\(setting,targetOpen\)/);
  assert.match(source, /async function cancelRsvpSchedule\(setting\)/);
  assert.match(source, /function renderRsvpSetting\(setting,policy\)/);
  assert.match(source, /fetch\('\/api\/staff\/settings'/);
  assert.match(source, /JSON\.stringify\(\{setting,targetOpen,changeAtLocal:/);
  assert.match(source, /JSON\.stringify\(\{setting,cancelScheduledChange:true\}\)/);
  assert.match(source, /changeAtLocal:/);
  assert.match(source, /cancelScheduledChange:true/);
  assert.match(source, /timeZone:'Europe\/Sofia'/);
  assert.match(source, /if\(name==='settings'\)loadSettings\(\)/);
  assert.match(source, /else if\(currentView==='settings'\)loadSettings\(\)/);
  assert.match(source, /async function previewTicketBulkSend\(\)/);
  assert.match(source, /async function sendTicketBulkSend\(\)/);
  assert.match(source, /function updateTicketBulkActionLabel\(\)/);
  assert.match(source, /Schedule tickets/);
  assert.match(source, /\/api\/staff\/ticket-bulk-send/);
  assert.match(source, /ticketBulkSendAt/);
  assert.match(source, /dryRun:true/);
  assert.match(source, /dryRun:false/);
});

test("staff fallback preserves the owner RSVP settings controls", () => {
  const source = read("assets/staff-admin-fallback.js");
  assert.match(source, /owner:\["scanner","members","tables","invite","menu","staff","settings","hallmap"\]/);
  assert.match(source, /async function loadSettings\(\)/);
  assert.match(source, /async function saveRsvpSetting\(setting,targetOpen\)/);
  assert.match(source, /async function cancelRsvpSchedule\(setting\)/);
  assert.match(source, /function renderRsvpSetting\(setting,policy\)/);
  assert.match(source, /setting,targetOpen,changeAtLocal:/);
  assert.match(source, /setting,cancelScheduledChange:true/);
  assert.match(source, /\/api\/staff\/settings/);
  assert.match(source, /previewTicketBulkSend/);
  assert.match(source, /sendTicketBulkSend/);
  assert.match(source, /\/api\/staff\/ticket-bulk-send/);
});

test("ticket bulk send API sends only pending registered ticket emails and records successes", () => {
  const source = read("functions/api/staff/ticket-bulk-send.js");
  assert.match(source, /requireStaff\(request, env, "owner"\)/);
  assert.match(source, /dryRun/);
  assert.match(source, /status=eq\.attending/);
  assert.match(source, /ticket_email_sent_at=is\.null/);
  assert.match(source, /guest_email=not\.is\.null/);
  assert.match(source, /ticket_token=not\.is\.null/);
  assert.match(source, /rsvp_companions/);
  assert.match(source, /buildTicketEmail/);
  assert.match(source, /postmarkBatchSend/);
  assert.match(source, /markPrimarySent/);
  assert.match(source, /markCompanionSent/);
  assert.match(source, /sentAt/);
  assert.match(source, /skipped/);
  assert.match(source, /failed/);
});
