# Independent Confirmation And Update Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner independent immediate and scheduled controls for new RSVP confirmations and updates to existing RSVP details.

**Architecture:** Retain the deployed `rsvp_*` columns as the confirmation policy and add parallel `rsvp_updates_*` columns. The shared policy module evaluates both settings; `/api/rsvp` selects the correct policy only after its existing server-side identity lookup determines whether the request inserts or updates, while `/api/confirmation` uses only the update policy for `canUpdate`.

**Tech Stack:** Cloudflare Pages Functions ES modules, Supabase/PostgREST, static server-rendered HTML/JavaScript, Node built-in test runner.

---

### Task 1: Generalize The Policy Module

**Files:**
- Modify: `test/rsvp-settings.test.js`
- Modify: `functions/_shared/rsvp-settings.js`

- [ ] **Step 1: Write failing dual-policy tests**

Add assertions that `effectiveRsvpPolicy()` returns independent `confirmation` and `updates` objects, absent update columns default open, and a due schedule affects only its own policy. Add patch tests using `setting: "confirmation"` and `setting: "updates"`, asserting the returned patch contains exactly the selected three columns.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test test/rsvp-settings.test.js
```

Expected: failures because the current helper exposes one `{ isOpen, scheduledChange }` policy and accepts no setting selector.

- [ ] **Step 3: Implement dual-policy evaluation and patch construction**

Keep `sofiaLocalToIso()` unchanged. Introduce descriptors for `confirmation` and `updates`, evaluate each through one internal pure helper, and return:

```js
{
  confirmation: { isOpen, scheduledChange, timezone: RSVP_TIME_ZONE },
  updates: { isOpen, scheduledChange, timezone: RSVP_TIME_ZONE },
}
```

Make `buildRsvpSettingsPatch(body, currentPolicy, now)` validate `body.setting`, select the matching policy, and emit only its column names. Update `loadRsvpPolicy()` to select all six database fields.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run `node --test test/rsvp-settings.test.js` and expect all tests to pass.

### Task 2: Add The Update-Details Database Policy

**Files:**
- Create: `sql/2026-10-08-independent-rsvp-controls.sql`
- Modify: `sql/schema.sql`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Write failing migration/schema tests**

Require these fresh-schema and migration fields:

```sql
rsvp_updates_open boolean not null default true
rsvp_updates_change_at timestamptz
rsvp_updates_change_to_open boolean
```

Require an idempotent paired-null constraint and `notify pgrst, 'reload schema'`.

- [ ] **Step 2: Run tests and verify RED**

Run `node --test test/staff-settings-source.test.js` and expect missing-column failures.

- [ ] **Step 3: Add the idempotent migration and update fresh schema**

The migration must add only the three columns and one constraint. It must not alter the current confirmation state or schedule. Update the event seed to include both open defaults.

- [ ] **Step 4: Run schema tests and verify GREEN**

Run `node --test test/staff-settings-source.test.js`.

### Task 3: Update The Owner Settings API

**Files:**
- Modify: `functions/api/staff/settings.js`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Add failing API contract assertions**

Assert the API selects and returns both policies, requires `setting`, passes the full `rsvp` policy to patch validation, and returns the dual-policy response after saving.

- [ ] **Step 2: Run tests and verify RED**

Run `node --test test/staff-settings-source.test.js`.

- [ ] **Step 3: Implement the scoped API update**

Keep `requireStaff(request, env, "owner")`. Pass the request body to the shared selector-aware patch builder, upsert only the selected patch plus `event_key` and `updated_at`, select all six policy columns, and return `effectiveRsvpPolicy(rows[0], now)`.

- [ ] **Step 4: Run tests and verify GREEN**

Run `node --test test/staff-settings-source.test.js`.

### Task 4: Gate Inserts And Updates Independently

**Files:**
- Modify: `functions/api/rsvp.js`
- Modify: `functions/api/confirmation.js`
- Modify: `test/rsvp-api-source.test.js`
- Modify: `test/staff-settings-source.test.js`

- [ ] **Step 1: Write failing source regression tests**

Assert `/api/rsvp` performs `findExistingRsvp()` before choosing the policy, blocks an existing row through `availability.policy.updates.isOpen`, blocks a missing row through `availability.policy.confirmation.isOpen`, and calls the existing update/insert paths unchanged afterward. Assert `/api/confirmation` uses only `availability.policy.updates.isOpen` for `canUpdate`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node --test test/rsvp-api-source.test.js test/staff-settings-source.test.js
```

- [ ] **Step 3: Move the policy decision after identity lookup**

In `/api/rsvp`, load the policy once, preserve invite application and existing lookup, then use:

```js
if (existing.row) {
  if (!availability.policy.updates.isOpen) return json({ error: "Updates are closed." }, 403);
  return updateExistingRsvp(...);
}
if (!availability.policy.confirmation.isOpen) {
  return json({ error: "RSVP confirmations are closed." }, 403);
}
```

Do not modify `updateExistingRsvp()`, companion synchronization, checked-in protection, token handling, table requests, insertion retries, or email behavior.

In `/api/confirmation`, preserve read access and gate only `canUpdate` with `policy.updates.isOpen`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the two focused test files and expect all tests to pass.

### Task 5: Render Two Independent Owner Controls

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-settings-source.test.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing UI contract tests**

Require separate confirmation/update status, date, apply, cancel and live-message IDs. Require payloads to include `setting: "confirmation"` or `setting: "updates"`. Preserve owner-only server rendering and fallback behavior.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test test/staff-settings-source.test.js test/staff-admin-ui.test.js
```

- [ ] **Step 3: Replace the combined panel with two settings sections**

Render both controls inside the existing owner-only Settings view. Use one small generic renderer/binder parameterized by setting name and element prefix. Saving or cancelling one control must not disable or overwrite the other. Keep `Europe/Sofia` copy next to both date fields and retain the existing staff visual language.

- [ ] **Step 4: Mirror behavior in the fallback asset**

Update `assets/staff-admin-fallback.js` with the same dual-policy state, scoped requests and per-control busy state. Bump the fallback cache query in the staff shell.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the two focused UI test files.

### Task 6: Documentation And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Document independent semantics and migration**

Replace combined-setting descriptions with New confirmations and Update details behavior. Add the migration to the production checklist and document the six-column policy response.

- [ ] **Step 2: Run static and automated checks**

Run:

```powershell
git diff --check
npm test
```

Expected: zero whitespace errors and all tests pass.

- [ ] **Step 3: Apply migration before deployment**

Run:

```powershell
npx supabase db query --linked --file sql/2026-10-08-independent-rsvp-controls.sql
```

Verify both policies are open with null schedules before deployment.

- [ ] **Step 4: Run local runtime smoke tests**

Use a temporary owner session to verify GET, independently schedule and cancel each policy, and restore both policies to open/no schedule in `finally`. Use a real confirmation token for a read-only `canUpdate: true` check. Delete all temporary sessions.

- [ ] **Step 5: Commit only feature files**

Stage exact files. In `functions/staff/rose-door-10.js`, stage only Settings-related hunks so pre-existing MAP changes remain unstaged.

Commit:

```powershell
git commit -m "feat: split confirmation and update controls"
```

- [ ] **Step 6: Push and deploy**

Run:

```powershell
git push origin main
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

- [ ] **Step 7: Production smoke test without live locking**

Verify owner receives both policies, admin receives `403`, the staff page renders both controls, the real confirmation remains updateable while updates are open, public routes return `200`, and both database policies remain open with null schedules. Do not temporarily lock production.
