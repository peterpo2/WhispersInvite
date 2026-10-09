# Grouped Guest Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Render every primary guest and linked plus-one/companion on separate attached rows in Tables, Show map, MAP, and all related search results.

**Architecture:** Keep the existing RSVP group and assignment APIs unchanged. Add small escaped HTML helpers to both staff runtimes and the MAP asset so every surface renders `peopleDetails` as stacked rows while preserving one action per RSVP group and the matched invite alias as the primary label.

**Tech Stack:** Cloudflare Pages Functions, vanilla JavaScript, inline CSS, Node.js `node:test` source-regression tests.

---

### Task 1: Add Failing UI Regression Tests

**Files:**
- Modify: `test/hall-plan.test.js`
- Modify: `test/staff-admin-ui.test.js`

- [x] **Step 1: Assert that MAP renders complete groups as person rows**

Add assertions that `assets/hall-plan.js` defines a `groupPeopleRows` helper, reads `peopleDetails`, renders `hm-person-row`, permits an invite alias for the first row, and uses the helper from `groupRow`.

- [x] **Step 2: Assert that both staff runtimes use complete group rows**

For both `functions/staff/rose-door-10.js` and `assets/staff-admin-fallback.js`, assert that the source defines `groupPeopleRows`, renders `group-person-row`, and calls it from `groupCard` and `renderTablePeopleSearch`.

- [x] **Step 3: Run targeted tests and confirm failure**

Run: `node --test test/hall-plan.test.js test/staff-admin-ui.test.js`

Expected: FAIL because the new row helpers and class names do not exist yet.

### Task 2: Implement Grouped Rows in MAP

**Files:**
- Modify: `assets/hall-plan.js`
- Modify: `functions/_shared/hall-plan-markup.js`

- [x] **Step 1: Add escaped MAP person-row markup**

Implement `groupPeopleRows(group, primaryName)` using `group.peopleDetails`, with a fallback to `group.people`. The first row uses `primaryName` when an invite search alias is being displayed; subsequent rows keep their actual names. Each row includes only that person's email and phone.

- [x] **Step 2: Replace chips with attached rows**

Call `groupPeopleRows` from `groupRow`, leave badges and notes at group level, and keep the existing single action element outside the person row list.

- [x] **Step 3: Style MAP rows**

Add `.hm-person-rows` and `.hm-person-row` styles with an internal divider, wrapping contact text, and mobile-safe sizing.

- [x] **Step 4: Run the MAP regression test**

Run: `node --test test/hall-plan.test.js`

Expected: PASS.

### Task 3: Implement Grouped Rows in Tables and Show Map

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`

- [x] **Step 1: Add the same escaped row helper to both runtimes**

Implement `groupPeopleRows(group, primaryName)` in both files. It must render all `peopleDetails`, preserve the searched invite alias for the first row, and fall back safely for legacy group data.

- [x] **Step 2: Update table cards and Add guests results**

Replace the existing name heading and person chips in `groupCard` with attached person rows. Keep reservation/confirmation badges and one shared Add, Move, or Remove action per group.

- [x] **Step 3: Update the main Tables search**

When a search match belongs to an RSVP group, render the complete group through `groupPeopleRows(group, person.name)`. Continue deduplicating by RSVP ID and render standalone invite results as a single row.

- [x] **Step 4: Add responsive row styling**

Add `.group-person-rows` and `.group-person-row` styles that remain legible at 320px and do not resize the shared action controls.

- [x] **Step 5: Run staff UI tests**

Run: `node --test test/staff-admin-ui.test.js`

Expected: PASS.

### Task 4: Verify and Release

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `test/staff-admin-ui.test.js`

- [x] **Step 1: Bump frontend asset versions**

Change both staff asset query versions to `20261010-grouped-rows1` and update pinned test expectations.

- [x] **Step 2: Run syntax and complete tests**

Run: `node --check assets/hall-plan.js`, `node --check assets/staff-admin-fallback.js`, `npm test`, and `git diff --check`.

Expected: all syntax checks and tests pass, with no whitespace errors.

- [x] **Step 3: Review the scoped diff**

Confirm there are no API, schema, migration, RSVP, or table-assignment data changes and no unescaped guest fields.

- [x] **Step 4: Commit, push, deploy, and smoke test**

Stage only the plan, tests, MAP/staff JavaScript, markup CSS, and cache-version change. Commit, push `main`, deploy Cloudflare Pages, then verify the live staff assets and production page return the new grouped-row implementation without console or HTTP errors.
