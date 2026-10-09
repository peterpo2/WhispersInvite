# Members Inline Updates And Scanner Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save Members checkbox changes without a disruptive reload and add assigned-table labels plus filtering to Scanned tonight.

**Architecture:** Keep the existing APIs and server-rendered staff shell. Extend the pure `doorScans` projection and `/api/door` query with an optional table label, then make both the inline and fallback staff runtimes maintain local UI state after successful checkbox writes and render a filtered scan list from cached scan data.

**Tech Stack:** Cloudflare Pages Functions, Supabase PostgREST, browser JavaScript, Node `node:test`.

---

### Task 1: Preserve table labels in door scans

**Files:**
- Modify: `test/rsvp.test.js`
- Modify: `functions/_shared/rsvp.js`
- Modify: `functions/api/door.js`

- [ ] **Step 1: Write the failing pure-function test**

Add table values to the existing `doorScans` fixture and expect every output entry, including the plus-one, to contain the inherited `table` value.

- [ ] **Step 2: Verify the test fails**

Run: `node --test test/rsvp.test.js`

Expected: the door-list assertion fails because `doorScans` does not yet return `table`.

- [ ] **Step 3: Implement table propagation**

Update `doorScans` output objects to include:

```js
table: row.table || ""
```

Update `/api/door` PostgREST selections to include `staff_table_assignments(staff_tables(label))`, resolve the label with a small local helper, and attach it to both RSVP and companion rows before passing them to `doorScans`.

- [ ] **Step 4: Verify the pure-function test passes**

Run: `node --test test/rsvp.test.js`

Expected: all RSVP tests pass.

### Task 2: Add scanner search and table display

**Files:**
- Modify: `test/staff-admin-ui.test.js`
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`

- [ ] **Step 1: Write failing source-contract tests**

Assert the staff shell contains `#scanSearch`, both runtimes cache scans, filter by guest name, brought-by name, table and seal code, and render the table label in each matching row.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test test/staff-admin-ui.test.js`

Expected: scanner-search and table-render assertions fail.

- [ ] **Step 3: Implement the scanner UI**

Add a compact search input above `#list`. Introduce `doorScansData`, `scanSearchQuery`, `scanMatchesSearch()` and `renderDoorList()` in both runtimes. `loadList()` should cache successful API data and delegate rendering, while input events update the query and render locally.

- [ ] **Step 4: Verify scanner tests pass**

Run: `node --test test/staff-admin-ui.test.js`

Expected: all staff UI tests pass.

### Task 3: Make Members checkbox writes local

**Files:**
- Modify: `test/staff-admin-ui.test.js`
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`

- [ ] **Step 1: Write failing source-contract tests**

Assert checkbox handlers disable the control while pending, parse and validate API responses, update matching entries in `members`, render without `loadMembers()`, and restore the checkbox on failure.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test test/staff-admin-ui.test.js`

Expected: inline-update assertions fail because handlers currently call `loadMembers()`.

- [ ] **Step 3: Implement local state updates**

For a member check-in, update `checkedIn` and `checkedInAt` from the response. For request and reservation state, update all records sharing the RSVP id. Preserve `window.scrollY` around `renderMembers()`, refresh dependent Tables or Scanner data without replacing the Members table, and restore the old checkbox value on any non-2xx or network error.

- [ ] **Step 4: Verify staff UI tests pass**

Run: `node --test test/staff-admin-ui.test.js`

Expected: all staff UI tests pass.

### Task 4: Full verification

**Files:**
- Test: `test/rsvp.test.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Run syntax checks**

Run:

```powershell
node --check assets/staff-admin-fallback.js
node --check functions/api/door.js
```

Expected: both commands exit successfully.

- [ ] **Step 2: Run the full suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Run local browser verification**

Render the authenticated owner staff page against mock API data, verify a Members checkbox does not change `window.scrollY`, and verify Scanner filtering by both guest name and table on a mobile viewport.

- [ ] **Step 4: Commit implementation**

Stage only the API, shared helper, staff runtimes and their tests, then commit with:

```text
feat: improve members updates and scanner list
```
