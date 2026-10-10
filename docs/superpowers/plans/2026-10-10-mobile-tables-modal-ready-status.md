# Mobile Tables Modal and Ready Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the desktop Tables workspace while giving phones a closable table-detail modal and adding an owner-controlled, automatically saved ready status shared by Tables and MAP.

**Architecture:** Add a persisted `staff_tables.is_ready` flag with an idempotent backfill and pure payload validation. Extend the existing tables API and reuse the existing table detail renderer, applying dialog semantics only below 760px. Keep the primary inline staff client and fallback asset behaviorally identical, and make both map surfaces read the new flag instead of edit timestamps for green styling.

**Tech Stack:** Cloudflare Pages Functions ES modules, Supabase/PostgREST, static HTML/CSS/JavaScript, Node `node:test`.

---

### Task 1: Persist and validate table ready status

**Files:**
- Create: `sql/2026-10-10-table-ready-status.sql`
- Modify: `sql/schema.sql`
- Modify: `functions/_shared/staff-tables.js`
- Test: `test/staff-tables.test.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing validation and migration tests**

Add tests that expect:

```js
assert.deepEqual(validateTableReadyPayload({ tableId: "t4", isReady: true }), {
  tableId: "t4",
  isReady: true,
});
assert.equal(validateTableReadyPayload({ tableId: "t4", isReady: "true" }), null);
assert.match(readyMigration, /add column if not exists is_ready boolean not null default false/i);
assert.match(readyMigration, /table_map_edited_at is not null or hall_map_edited_at is not null/i);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```powershell
node --test test/staff-tables.test.js test/staff-admin-ui.test.js
```

Expected: failure because the helper and migration do not exist.

- [ ] **Step 3: Add the migration, fresh schema column and pure validator**

The migration must be idempotent and preserve existing green tables:

```sql
begin;
alter table public.staff_tables
  add column if not exists is_ready boolean not null default false;
update public.staff_tables
set is_ready = true
where is_ready = false
  and (table_map_edited_at is not null or hall_map_edited_at is not null);
notify pgrst, 'reload schema';
commit;
```

Add `validateTableReadyPayload(body)` using the existing table ID pattern and requiring a literal boolean.

- [ ] **Step 4: Run focused tests and commit**

Run the focused tests, then:

```powershell
git add sql/2026-10-10-table-ready-status.sql sql/schema.sql functions/_shared/staff-tables.js test/staff-tables.test.js test/staff-admin-ui.test.js
git commit -m "feat: persist table ready status"
```

### Task 2: Expose ready state with owner-only manual updates

**Files:**
- Modify: `functions/api/staff/tables.js`
- Test: `test/staff-auth-source.test.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing API source tests**

Require the GET projection and output mapping:

```js
assert.match(tablesApi, /is_ready/);
assert.match(tablesApi, /isReady: table\.is_ready === true/);
```

Require owner authorization for manual status and automatic status for Save table:

```js
assert.match(tablesApi, /ready && staff\.user\.role !== "owner"/);
assert.match(tablesApi, /return json\(\{ error: "Forbidden" \}, 403\)/);
assert.match(tablesApi, /is_ready: true/);
```

- [ ] **Step 2: Run focused tests and verify failure**

```powershell
node --test test/staff-auth-source.test.js test/staff-admin-ui.test.js
```

Expected: failure because `is_ready` is not selected or updated.

- [ ] **Step 3: Extend GET and PATCH without weakening current roles**

Import `validateTableReadyPayload`, parse it after position/minimum-spend/edit payloads, and reject
manual status writes unless `staff.user.role === "owner"`. Save table patches include
`is_ready: true`; manual ready patches include only `is_ready: value.isReady` plus `updated_at`.
Return `isReady` in both GET rows and PATCH responses.

- [ ] **Step 4: Run focused tests and commit**

```powershell
git add functions/api/staff/tables.js test/staff-auth-source.test.js test/staff-admin-ui.test.js
git commit -m "feat: authorize table ready updates"
```

### Task 3: Build the mobile modal in the primary staff client

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing mobile dialog tests**

Test for one responsive detail renderer with:

```js
assert.match(staffPage, /role="dialog"/);
assert.match(staffPage, /aria-modal="true"/);
assert.match(staffPage, /data-close-table-modal/);
assert.match(staffPage, /document\.body\.classList\.toggle\('table-modal-open'/);
assert.match(staffPage, /e\.key==='Escape'/);
assert.match(staffPage, /@media\(min-width:760px\).*tables-layout/s);
```

Also require the owner-editable ready checkbox and `isReady`-based chip/map classes.

- [ ] **Step 2: Run the UI test and verify failure**

```powershell
node --test test/staff-admin-ui.test.js
```

Expected: failure on dialog and ready controls.

- [ ] **Step 3: Add responsive modal styling and state**

Keep `.tables-layout` unchanged at desktop. Under 760px, render the selected table detail inside a
fixed backdrop and scrollable panel with safe-area padding. Add `mobileTableModalOpen`, saved scroll
position and opener focus state. Table chips call a shared selection function which opens the modal
only for real tables on mobile. Close restores body scrolling and opener focus.

- [ ] **Step 4: Add ready controls and persistence**

Render a labeled checkbox for every real table:

```html
<label class="table-ready"><input type="checkbox" data-table-ready ...><span>Table ready</span></label>
```

Enable it only for `STAFF_ROLE === 'owner'`. Add `saveTableReady(input)` that PATCHes
`{ tableId, isReady }`, waits for success, updates `table.isReady`, then rerenders. Update Save table
to consume returned `isReady` and keep the modal open.

- [ ] **Step 5: Run focused tests and commit**

```powershell
node --test test/staff-admin-ui.test.js
git add functions/staff/rose-door-10.js test/staff-admin-ui.test.js
git commit -m "feat: open table details in a mobile modal"
```

### Task 4: Mirror fallback behavior and MAP ready styling

**Files:**
- Modify: `assets/staff-admin-fallback.js`
- Modify: `assets/hall-plan.js`
- Modify: `functions/_shared/hall-plan-markup.js`
- Modify: `functions/staff/rose-door-10.js`
- Test: `test/hall-plan.test.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing parity and MAP tests**

Require fallback modal state/close behavior, owner-only ready PATCH, and both maps to use `isReady`
instead of `tableMapEditedAt`/`hallMapEditedAt` for their green class.

- [ ] **Step 2: Run focused tests and verify failure**

```powershell
node --test test/staff-admin-ui.test.js test/hall-plan.test.js
```

- [ ] **Step 3: Mirror the primary client in the fallback asset**

Implement the same state names, selection/close helpers, checkbox behavior, Save table update and
scroll restoration. Do not introduce a separate mobile detail implementation.

- [ ] **Step 4: Update both map surfaces**

Use `table.isReady` for `.edited`/green visual state in the hidden Tables map and dedicated MAP.
After Save table or owner checkbox changes, update the shared in-memory table row and rerender both
surfaces. Keep edit timestamps visible as audit text.

- [ ] **Step 5: Cache-bust assets, run tests and commit**

Update both asset query versions in the staff shell, run focused tests, then:

```powershell
git add assets/staff-admin-fallback.js assets/hall-plan.js functions/_shared/hall-plan-markup.js functions/staff/rose-door-10.js test/hall-plan.test.js test/staff-admin-ui.test.js
git commit -m "feat: share ready table state across staff maps"
```

### Task 5: Regression, browser QA and deployment

**Files:**
- Modify: `docs/project-spec.md`

- [ ] **Step 1: Update project documentation**

Document the phone modal, `is_ready`, automatic Save behavior and owner-only manual toggle.

- [ ] **Step 2: Run complete local verification**

```powershell
npm test
node --check assets/staff-admin-fallback.js
node --check assets/hall-plan.js
node --check functions/api/staff/tables.js
git diff --check
```

Expected: all tests pass, syntax checks return zero and diff check is clean.

- [ ] **Step 3: Verify mobile and desktop rendering locally**

Run Wrangler and inspect at 390x844 and 1280x800. Confirm no horizontal overflow, mobile modal
close/scroll behavior, full table controls, desktop two-column layout and ready styling.

- [ ] **Step 4: Commit documentation and final fixes**

```powershell
git add docs/project-spec.md
git commit -m "docs: document mobile table workflow"
```

- [ ] **Step 5: Apply migration before code deployment**

Read production table counts and current ready-column state. Run
`sql/2026-10-10-table-ready-status.sql` through the linked Supabase project. Verify 45 tables,
the expected backfill count, a non-null ready value for every table, and unchanged assignment count.

- [ ] **Step 6: Merge, push and verify Cloudflare**

Fast-forward `main`, push it, wait for the matching Cloudflare deployment to become Active, and
smoke-test `/`, `/menu`, `/staff/rose-door-10`, protected `/api/staff/tables`, and cache-busted assets.
Confirm production database counts once more and report any authenticated-browser limitation.
