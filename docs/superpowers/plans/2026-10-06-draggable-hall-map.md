# Draggable Hall Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive draggable 35-table hall map above the unlimited-capacity Tables interface for local review only.

**Architecture:** Store normalized table coordinates on each `staff_tables` row and extend the existing Tables PATCH endpoint with a validated position update. Render the map with positioned HTML buttons and Pointer Events, while retaining the existing table-detail interface below it.

**Tech Stack:** Cloudflare Pages Functions, Supabase/PostgREST, static HTML/CSS/JavaScript, Node test runner, Playwright browser QA.

---

### Task 1: Position Validation

**Files:**
- Modify: `functions/_shared/staff-tables.js`
- Modify: `test/staff-tables.test.js`

- [ ] Add failing tests for valid `mapX`/`mapY`, bounds, finite numbers, and malformed table IDs.
- [ ] Run the focused test and confirm failure.
- [ ] Implement `validateTablePositionPayload` with normalized numeric output in `0..100`.
- [ ] Run the focused test and confirm success.

### Task 2: Database and API Contract

**Files:**
- Create: `sql/2026-10-06-thirty-five-table-map.sql`
- Modify: `sql/schema.sql`
- Modify: `functions/api/staff/tables.js`
- Modify: `test/staff-auth-source.test.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add failing source tests for 35 seeds, map coordinate constraints, no capacity field, GET coordinates, and PATCH position validation.
- [ ] Run focused tests and confirm failure.
- [ ] Update fresh schema and create the idempotent, unapplied migration.
- [ ] Remove capacity from the GET response and return map coordinates.
- [ ] Extend PATCH to save either minimum spend or a map position with door-or-higher authorization.
- [ ] Run focused tests and confirm success.

### Task 3: Hall Map UI

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add failing source tests for open/close controls, 35 positioned table buttons, Pointer Events, pointer capture, 6 px drag threshold, PATCH-on-release, tap-only navigation, service read-only mode, and capacity-free copy/export.
- [ ] Run the UI test and confirm failure.
- [ ] Add the responsive WHISPERS hall-map styles and tall mobile surface.
- [ ] Render map controls above the existing Tables layout.
- [ ] Implement drag state, normalized coordinate calculation, auto-save, and status handling in both scripts.
- [ ] Implement tap behavior that closes the map, selects the table, and scrolls to the details without firing after drag.
- [ ] Replace capacity ratios with unlimited guest counts and remove Capacity from CSV.
- [ ] Run focused tests and syntax checks.

### Task 4: Local Review

**Files:**
- No production files beyond Tasks 1–3.

- [ ] Run `npm test`, JavaScript syntax checks, and `git diff --check`.
- [ ] Start a local mock-backed staff server using the real page and fallback asset.
- [ ] Verify owner drag/save and tap navigation at desktop and phone widths.
- [ ] Verify service can view and navigate but has no draggable behavior.
- [ ] Leave the local preview server running and provide its URL.
- [ ] Do not run the Supabase migration and do not deploy Cloudflare Pages.
