# Persistent Map Edit Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and display an independent permanent green edited status and last-edit time for each table in each staff map.

**Architecture:** Add one nullable timestamp per coordinate system to `staff_tables`. Each position endpoint owns its timestamp, returns it in GET/PATCH responses, and each existing map client renders the corresponding persisted value without changing the draft/save model.

**Tech Stack:** Cloudflare Pages Functions, Supabase PostgREST/Postgres, browser JavaScript, inline CSS, Node `node:test`.

---

### Task 1: Database contract

**Files:**
- Create: `sql/2026-10-10-map-edit-status.sql`
- Modify: `sql/schema.sql`
- Test: `test/hall-plan.test.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] Add failing assertions for nullable `hall_map_edited_at` and `table_map_edited_at` columns.
- [ ] Run the focused tests and confirm they fail because the columns and migration do not exist.
- [ ] Add an idempotent migration and update the fresh schema without backfilling timestamps.
- [ ] Run the focused tests and confirm the database contract passes.

### Task 2: Independent API timestamps

**Files:**
- Modify: `functions/api/staff/hall-map.js`
- Modify: `functions/api/staff/tables.js`
- Test: `test/hall-plan.test.js`
- Test: `test/staff-auth-source.test.js`

- [ ] Add failing tests that require each GET/PATCH to select, write, and return only its own map timestamp.
- [ ] Run the focused tests and confirm the missing API fields cause the failures.
- [ ] Update the two endpoints to generate one server timestamp per successful position PATCH and expose it as camel-case JSON.
- [ ] Confirm minimum-spend PATCH does not write `table_map_edited_at`.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Dedicated MAP presentation

**Files:**
- Modify: `assets/hall-plan.js`
- Modify: `functions/_shared/hall-plan-markup.js`
- Test: `test/hall-plan.test.js`

- [ ] Add failing tests for the persistent green SVG class, Sofia date display, and post-save timestamp update.
- [ ] Run the MAP tests and confirm they fail for the missing presentation.
- [ ] Render `hm-edited` from `hallMapEditedAt`, show the detail timestamp, and store the PATCH response timestamp after each successful save.
- [ ] Add scoped green styling that remains legible for selected tables and table numbers.
- [ ] Run the MAP tests and confirm they pass.

### Task 4: Tables map presentation

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Test: `test/staff-admin-ui.test.js`

- [ ] Add failing tests for the `edited` class, Sofia date display, and successful-save timestamp update in both clients.
- [ ] Run the staff UI test and confirm it fails for the missing behavior.
- [ ] Render the persistent green class in `Tables -> Show map`, expose the last edit in table detail, and update local data from the PATCH response.
- [ ] Mirror the behavior in the fallback client and update asset cache versions where required.
- [ ] Run the staff UI test and confirm it passes.

### Task 5: Verification and release preparation

**Files:**
- Modify only files required by verification findings.

- [ ] Run `npm test` and require a clean pass.
- [ ] Run `node --check` for changed JavaScript files.
- [ ] Run `git diff --check` and inspect the final scoped diff.
- [ ] Commit only the implementation files with a focused commit message.
- [ ] Push, run the migration through the configured production workflow, deploy Cloudflare Pages, and verify both map API responses and live UI assets without logging credentials or ticket tokens.
