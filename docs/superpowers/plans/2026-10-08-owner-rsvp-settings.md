# Owner RSVP Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an owner-only staff setting that immediately or automatically opens and locks both new RSVP confirmations and existing confirmation detail updates.

**Architecture:** Store the base state and one optional scheduled transition on the existing `event_details` row. A focused shared module evaluates the effective state and validates Sofia-local schedules; the public RSVP and confirmation handlers consume that policy, while a new owner-only staff API and tab manage it.

**Tech Stack:** Cloudflare Pages Functions ES modules, Supabase PostgREST/Postgres, static server-rendered HTML with inline JavaScript, Node `node:test`, Playwright for browser QA.

---

## File Structure

- Create `functions/_shared/rsvp-settings.js`: pure policy/date validation plus the single Supabase policy loader.
- Create `functions/api/staff/settings.js`: owner-only GET/PATCH endpoint.
- Create `sql/2026-10-08-owner-rsvp-settings.sql`: idempotent production migration.
- Create `test/rsvp-settings.test.js`: pure policy and Sofia-time behavior.
- Create `test/staff-settings-source.test.js`: endpoint, guest enforcement, UI, and schema contracts.
- Modify `functions/api/rsvp.js`: reject both inserts and updates while locked.
- Modify `functions/api/confirmation.js`: keep confirmation readable but gate `canUpdate`.
- Modify `functions/_shared/access.js`: allowlist the exact owner settings API route.
- Modify `functions/staff/rose-door-10.js`: owner-only tab, panel, API integration, and responsive styling.
- Modify `assets/staff-admin-fallback.js`: preserve settings controls if the main staff script fails.
- Modify `sql/schema.sql`: keep fresh database schema aligned with production migration.
- Modify `README.md` and `TASKS.md`: document the setting and completed rollout.

### Task 1: Policy And Sofia-Time Logic

**Files:**
- Create: `test/rsvp-settings.test.js`
- Create: `functions/_shared/rsvp-settings.js`

- [ ] **Step 1: Write failing policy tests**

Cover open defaults, immediate base state, a future scheduled transition, the exact transition boundary, elapsed schedule normalization, valid summer/winter Sofia offsets, invalid/nonexistent local times, immediate updates, scheduled updates, same-state schedules, and cancellation.

```js
test("scheduled RSVP state changes at the exact instant", () => {
  const row = {
    rsvp_open: true,
    rsvp_change_at: "2026-10-08T15:00:00.000Z",
    rsvp_change_to_open: false,
  };
  assert.equal(effectiveRsvpPolicy(row, new Date("2026-10-08T14:59:59.999Z")).isOpen, true);
  assert.equal(effectiveRsvpPolicy(row, new Date("2026-10-08T15:00:00.000Z")).isOpen, false);
});

test("Sofia local values are converted independently of device timezone", () => {
  assert.equal(sofiaLocalToIso("2026-10-08T18:00"), "2026-10-08T15:00:00.000Z");
  assert.equal(sofiaLocalToIso("2026-12-08T18:00"), "2026-12-08T16:00:00.000Z");
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test test/rsvp-settings.test.js`

Expected: FAIL because `functions/_shared/rsvp-settings.js` does not exist.

- [ ] **Step 3: Implement the minimal shared module**

Export these stable interfaces:

```js
export const RSVP_TIME_ZONE = "Europe/Sofia";
export function effectiveRsvpPolicy(row, now = new Date()) {}
export function sofiaLocalToIso(value) {}
export function buildRsvpSettingsPatch(body, currentPolicy, now = new Date()) {}
export async function loadRsvpPolicy(env, now = new Date()) {}
```

`loadRsvpPolicy` must query only `rsvp_open,rsvp_change_at,rsvp_change_to_open` for `EVENT_KEY`, return open for an absent row, and return a generic `502` response wrapper on upstream failure.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test test/rsvp-settings.test.js`

Expected: all policy tests pass.

### Task 2: Database Migration And Schema Contract

**Files:**
- Create: `sql/2026-10-08-owner-rsvp-settings.sql`
- Modify: `sql/schema.sql`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Write failing schema source tests**

Assert that both schema files contain the three columns, the open default, the paired-null check constraint, the event-row insert, and `notify pgrst, 'reload schema'`.

- [ ] **Step 2: Run the schema test and verify RED**

Run: `node --test test/staff-settings-source.test.js`

Expected: FAIL because the migration and columns do not exist.

- [ ] **Step 3: Add the idempotent migration**

Use this database shape:

```sql
alter table public.event_details
  add column if not exists rsvp_open boolean not null default true,
  add column if not exists rsvp_change_at timestamptz,
  add column if not exists rsvp_change_to_open boolean;

alter table public.event_details
  drop constraint if exists event_details_rsvp_schedule_paired;
alter table public.event_details
  add constraint event_details_rsvp_schedule_paired check (
    (rsvp_change_at is null and rsvp_change_to_open is null)
    or (rsvp_change_at is not null and rsvp_change_to_open is not null)
  );

insert into public.event_details (event_key, rsvp_open)
values ('whispers-2026-10-10', true)
on conflict (event_key) do nothing;
```

Mirror the columns and constraint in `sql/schema.sql` without changing ticket-release fields.

- [ ] **Step 4: Re-run the schema source tests**

Run: `node --test test/staff-settings-source.test.js`

Expected: schema assertions pass; later endpoint assertions may still fail.

### Task 3: Owner Settings API And Route Security

**Files:**
- Create: `functions/api/staff/settings.js`
- Modify: `functions/_shared/access.js`
- Modify: `test/access.test.js`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Write failing route and handler tests**

Assert that `/api/staff/settings` is allowlisted while near-match routes remain blocked, and that the handler:

```js
await requireStaff(request, env, "owner")
```

implements GET/PATCH, parses JSON in `try/catch`, calls `buildRsvpSettingsPatch`, performs a PostgREST merge upsert for `EVENT_KEY`, and returns `methodNotAllowed()` for other methods.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/access.test.js test/staff-settings-source.test.js`

Expected: FAIL because the route and handler are missing.

- [ ] **Step 3: Implement the owner API**

GET loads and returns the effective policy. PATCH validates the body against the current policy and upserts:

```js
{
  event_key: EVENT_KEY,
  ...validated.patch,
  updated_at: new Date().toISOString(),
}
```

Use `Prefer: "resolution=merge-duplicates,return=representation"`. Return short `400`, `401`, `403`, and `502` errors without upstream details.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/access.test.js test/staff-settings-source.test.js`

Expected: route and API source tests pass.

### Task 4: Enforce The Policy For Guests

**Files:**
- Modify: `functions/api/rsvp.js`
- Modify: `functions/api/confirmation.js`
- Modify: `test/rsvp-api-source.test.js`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Write failing guest-enforcement tests**

Assert that `POST /api/rsvp` loads the policy before insert/update work and returns `json({ error: "RSVP is closed." }, 403)` when closed. Assert that confirmation lookup remains available but computes:

```js
const canUpdate = policy.isOpen && confirmationCanUpdate(ticket);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/rsvp-api-source.test.js test/staff-settings-source.test.js`

Expected: FAIL because neither handler consumes the policy.

- [ ] **Step 3: Add server-side enforcement**

Load the shared policy through `loadRsvpPolicy`. In RSVP, return the policy loader error or the closed response before writing. In confirmation, return a generic load error when the policy lookup fails, preserve the confirmation payload, and suppress only `canUpdate`/`updateUrl` while closed.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/rsvp-api-source.test.js test/staff-settings-source.test.js test/frontend-copy.test.js`

Expected: enforcement and existing confirmation behavior tests pass.

### Task 5: Owner-Only Settings Tab

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-admin-ui.test.js`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Write failing staff UI tests**

Assert owner-only server rendering for the tab/view, `ROLE_VIEWS.owner` inclusion only, a datetime-local control with `Europe/Sofia`, the status and schedule regions, load/save/cancel calls to `/api/staff/settings`, and fallback bindings.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/staff-admin-ui.test.js test/staff-settings-source.test.js`

Expected: FAIL because the settings UI is absent.

- [ ] **Step 3: Add markup, styles, and behavior**

Render the tab and view only when `staff.user.role === "owner"`. Add `settings` to the owner view list and load it from `showView`/refresh. Implement:

```js
async function loadSettings() {}
async function saveRsvpSetting(targetOpen) {}
async function cancelRsvpSchedule() {}
function renderRsvpSetting(policy) {}
```

Keep controls stable while saving, show `OPEN`/`LOCKED`, format future schedules in `Europe/Sofia`, and send the raw `datetime-local` string for server-side timezone conversion.

- [ ] **Step 4: Add fallback behavior**

The fallback script must support view switching and the same settings GET/PATCH actions without duplicating policy decisions in the browser.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/staff-admin-ui.test.js test/staff-settings-source.test.js`

Expected: owner UI and role-isolation tests pass.

### Task 6: Documentation, Full Verification, Migration, And Release

**Files:**
- Modify: `README.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Document operation and rollout**

Document that SETTINGS is owner-only, controls RSVP plus update details, uses Sofia time, defaults open, and is independent of ticket release.

- [ ] **Step 2: Run static and full automated verification**

Run:

```powershell
node --check functions/_shared/rsvp-settings.js
node --check functions/api/staff/settings.js
node --check functions/api/rsvp.js
node --check functions/api/confirmation.js
npm test
git diff --check
```

Expected: syntax checks pass, all tests pass, and diff check reports no whitespace errors.

- [ ] **Step 3: Run local browser QA before production**

Start `npx wrangler pages dev .`, create a temporary owner session in the local linked Supabase environment, and verify desktop plus 390x844 mobile layouts. Exercise immediate state changes, future scheduling, cancellation, refresh persistence, non-owner hiding, and unchanged Scanner/Members/Tables/MAP/Invite/Menu/Staff navigation. Restore `OPEN` with no schedule.

- [ ] **Step 4: Review the complete diff**

Inspect `git diff`, secret-scan changed files, and verify no `.dev.vars`, credentials, ticket tokens, generated screenshots, or browser sessions are staged.

- [ ] **Step 5: Commit and push the complete repository work**

Stage only reviewed project files, then run:

```powershell
git commit -m "feat: add owner RSVP settings"
git push origin main
```

- [ ] **Step 6: Apply the production migration before code deployment**

Run:

```powershell
npx supabase db query --linked --file sql/2026-10-08-owner-rsvp-settings.sql
```

Verify the columns, paired-null constraint, and event row. Confirm effective production state is `OPEN` with no schedule.

- [ ] **Step 7: Deploy and run production smoke tests**

Run:

```powershell
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

Using temporary owner/admin sessions, verify owner GET/PATCH, non-owner `403`, owner-only tab visibility, public confirmation read access, and RSVP behavior. Restore production to `OPEN` with no scheduled change and delete every temporary session.

