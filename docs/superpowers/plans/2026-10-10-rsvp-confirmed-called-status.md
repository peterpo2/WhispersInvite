# RSVP Confirmed And Called Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every existing manual reservation confirmation as `Called`, make `Confirmed` a read-only reflection of attending RSVP status, and present both states clearly throughout Members, Tables and MAP.

**Architecture:** Use an additive PostgreSQL migration so deployed code remains valid while the new column rolls out. Staff APIs expose `confirmed` from `status` and `called` from the new column; only `called` remains writable. Public ticket behaviour keeps using the migrated manual state, while all runtime references to `reservation_confirmed` are removed from the new code.

**Tech Stack:** PostgreSQL/Supabase, Cloudflare Pages Functions, vanilla JavaScript staff UI, Node `node:test`.

---

## File Map

- Create `sql/2026-10-10-rsvp-called.sql`: additive `called` column and existing-value backfill.
- Modify `sql/schema.sql`: fresh schema uses `called`; legacy migration remains historical.
- Modify `functions/_shared/rsvp.js`: preserve requested-table state after a called record and expose guest table status from `called`.
- Modify `functions/api/rsvp.js`, `functions/api/ticket.js`, `functions/api/confirmation.js`: select and consume `called`.
- Modify `functions/api/staff/members.js`: return read-only `confirmed` and editable `called`.
- Modify `functions/api/staff/tables.js`: return `confirmed` and `called` on groups.
- Modify `functions/api/staff/reservation-state.js`: accept and persist only `called` for the manual state.
- Modify `functions/staff/rose-door-10.js`, `assets/staff-admin-fallback.js`, `assets/hall-plan.js`: update labels, checkboxes, search and CSV output.
- Modify `test/rsvp.test.js`, `test/staff-admin-ui.test.js`, `test/staff-auth-source.test.js`, `test/confirmation-api-source.test.js`, `test/ticket-api.test.js`: regression coverage and obsolete-reference guard.

### Task 1: Add And Test The Additive Data Migration

**Files:**
- Create: `sql/2026-10-10-rsvp-called.sql`
- Modify: `sql/schema.sql`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing migration tests**

Require the migration to contain:

```js
assert.match(calledMigration, /add column if not exists called boolean not null default false/i);
assert.match(calledMigration, /set called = reservation_confirmed/i);
assert.match(calledMigration, /where called is distinct from reservation_confirmed/i);
assert.match(calledMigration, /notify pgrst, 'reload schema'/i);
assert.match(schema, /called boolean not null default false/i);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/staff-admin-ui.test.js`

Expected: FAIL because the migration and fresh-schema field do not exist.

- [ ] **Step 3: Add the migration and schema field**

Use this idempotent migration shape:

```sql
alter table public.rsvps
  add column if not exists called boolean not null default false;

update public.rsvps
set called = reservation_confirmed
where called is distinct from reservation_confirmed;

notify pgrst, 'reload schema';
```

In `schema.sql`, replace the fresh-schema `reservation_confirmed` field with `called boolean not null default false`. Do not edit the historical `2026-09-27-reservation-confirmed.sql` migration.

- [ ] **Step 4: Run the focused test and commit**

Run: `node --test test/staff-admin-ui.test.js`

Expected: PASS.

Commit the migration, schema and test as `feat: add called RSVP state`.

### Task 2: Move Runtime Data Flow To Confirmed And Called

**Files:**
- Modify: `functions/_shared/rsvp.js`
- Modify: `functions/api/rsvp.js`
- Modify: `functions/api/ticket.js`
- Modify: `functions/api/confirmation.js`
- Modify: `functions/api/staff/members.js`
- Modify: `functions/api/staff/tables.js`
- Modify: `functions/api/staff/reservation-state.js`
- Test: `test/rsvp.test.js`
- Test: `test/staff-admin-ui.test.js`
- Test: `test/staff-auth-source.test.js`
- Test: `test/confirmation-api-source.test.js`
- Test: `test/ticket-api.test.js`

- [ ] **Step 1: Write failing API and helper tests**

Assert these contracts:

```js
assert.equal(tableReservationForUpdate(row, { wants_table_reservation: true, called: true }), true);
assert.equal(ticketForToken({ ...ROW, called: true }, TOKEN).table_reserved, true);
assert.match(membersApi, /confirmed: row\.status === "attending"/);
assert.match(membersApi, /called: row\.called === true/);
assert.match(tablesApi, /confirmed: row\.status === "attending"/);
assert.match(tablesApi, /called: row\.called === true/);
assert.match(reservationStateApi, /body\?\.called/);
assert.doesNotMatch(runtimeSources, /reservation_confirmed|reservationConfirmed/);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```powershell
node --test test/rsvp.test.js test/staff-admin-ui.test.js test/staff-auth-source.test.js test/confirmation-api-source.test.js test/ticket-api.test.js
```

Expected: FAIL on the old property and column names.

- [ ] **Step 3: Update RSVP and public ticket data flow**

Replace selected columns and row reads with `called`. Keep `tableReservationForUpdate` behaviour:

```js
export function tableReservationForUpdate(row, existing) {
  if (existing?.called === true && existing?.wants_table_reservation === true) return true;
  return row?.wants_table_reservation === true;
}
```

Use `row.called === true` and `primary.called === true` for existing guest-facing `table_reserved` output. Do not change RSVP status mutations or ticket release logic.

- [ ] **Step 4: Update staff APIs**

Members and table groups return:

```js
confirmed: row.status === "attending",
called: row.called === true,
```

For inherited plus-one/companion rows, derive `confirmed` from the parent status and `called` from the parent row. Change the reservation-state patch to:

```js
if (typeof body?.called === "boolean") patch.called = body.called;
```

Return `called` in the response and reject a body that only contains `reservationConfirmed`.

- [ ] **Step 5: Run focused tests and commit**

Run the Task 2 focused command. Expected: PASS.

Commit as `refactor: separate confirmed and called states`.

### Task 3: Update And Polish Every Staff Renderer

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `assets/hall-plan.js`
- Modify: `functions/_shared/hall-plan-markup.js`
- Test: `test/staff-admin-ui.test.js`
- Test: `test/hall-plan.test.js`

- [ ] **Step 1: Write failing rendering tests**

Require both staff clients to render a disabled `Confirmed` checkbox and editable `Called` checkbox, and require all Tables/MAP renderers to use `CONFIRMED` and `CALLED` without `RESERVED`:

```js
assert.match(source, /data-confirmed-id=.*disabled/);
assert.match(source, /data-called-id/);
assert.match(source, />Confirmed</);
assert.match(source, />Called</);
assert.doesNotMatch(source, /data-reservation-id|Reserved|RESERVED/);
```

Add runtime markup assertions for groups with `{ confirmed: true, called: true }` and groups with both false.

- [ ] **Step 2: Run focused UI tests and verify failure**

Run: `node --test test/staff-admin-ui.test.js test/hall-plan.test.js`

Expected: FAIL on old checkbox bindings and `Reserved` copy.

- [ ] **Step 3: Update Members UI and inline behaviour**

Render columns as `Confirmed`, `Request`, `Called`, `Table`. The confirmation checkbox is checked from `m.confirmed`, has `disabled` and `aria-label="RSVP confirmed"`, and has no change handler. Rename `toggleReservation` to `toggleCalled`, post `{ rsvpId, called }`, and update all linked member rows with `{ called }` while preserving scroll position.

- [ ] **Step 4: Update Tables and MAP status treatment**

In all three renderers, add positive confirmation and quiet called pills:

```html
<span class="pill status-confirmed">confirmed</span>
<span class="pill status-called">called</span>
```

Use equivalent `hm-pill` classes in MAP. Rename manual table controls from `Confirmed` to `Called`. Update search terms and Tables CSV headers/data to separate `RSVP confirmed` and `Called`. Use green only for `status-confirmed`; use the existing gold family for request/called. Keep compact wrapping at 320px.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test test/staff-admin-ui.test.js test/hall-plan.test.js`

Expected: PASS.

Commit as `ui: clarify confirmed and called statuses`.

### Task 4: Eliminate Stale Runtime References And Verify

**Files:**
- Modify: tests above only if the obsolete-reference scan identifies a missed runtime path.

- [ ] **Step 1: Scan every runtime file**

Run:

```powershell
rg -n "reservation_confirmed|reservationConfirmed|RESERVED|Reserved" functions assets sql/schema.sql
rg -n "reservation_confirmed|reservationConfirmed|RESERVED|Reserved" test
```

Expected: no matches in runtime files or the fresh schema. Test matches may only remain in migration assertions or when explicitly asserting rejection of the obsolete API field. Historical migration files are excluded from this check.

- [ ] **Step 2: Run complete verification**

Run:

```powershell
npm test
Get-ChildItem functions,assets,scripts -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
git diff --check
```

Expected: all tests pass, all JavaScript parses, no whitespace errors.

- [ ] **Step 3: Commit any final test guards**

Stage only the files changed by this feature and commit as `test: guard confirmed and called semantics` if Task 4 adds test-only changes.

### Task 5: Production Migration And Deployment

**Files:**
- No additional source files.

- [ ] **Step 1: Push code commits without deploying the new runtime yet**

Run: `git push origin main`

Expected: remote `main` contains the additive migration and implementation commits.

- [ ] **Step 2: Apply the additive migration to production Supabase**

Use the existing secure linked-project or Supabase SQL Editor workflow to run `sql/2026-10-10-rsvp-called.sql`. Never print connection secrets.

- [ ] **Step 3: Verify the backfill before deployment**

Run these read-only checks in Supabase:

```sql
select
  count(*) filter (where reservation_confirmed) as old_checked,
  count(*) filter (where called) as called_checked,
  count(*) filter (where called is distinct from reservation_confirmed) as mismatches
from public.rsvps;
```

Expected: `old_checked = called_checked` and `mismatches = 0`.

- [ ] **Step 4: Deploy Cloudflare Pages**

Run:

```powershell
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

Expected: successful Functions bundle deployment.

- [ ] **Step 5: Production smoke test**

Verify `/`, `/menu`, `/staff/rose-door-10`, authenticated Members/Tables/MAP views, and unauthorized `/api/staff/tables` behaviour. Confirm a known old manual checkbox appears as `Called`, attending rows are read-only `Confirmed`, no `Reserved` label remains, and toggling `Called` persists after refresh.

