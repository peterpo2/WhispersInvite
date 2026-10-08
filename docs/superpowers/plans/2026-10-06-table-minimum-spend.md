# Table Minimum Spend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store and edit a whole-euro minimum spend for each staff table while keeping service staff read-only.

**Architecture:** Add a constrained integer column to `staff_tables`, expose it through the existing Tables endpoint, and add a role-protected PATCH operation to that endpoint. Put request validation in a small pure shared helper, then render the setting in both the primary and fallback staff scripts.

**Tech Stack:** Cloudflare Pages Functions ES modules, Supabase PostgREST, static HTML/JavaScript, Node built-in test runner.

---

### Task 1: Validate Minimum Spend Updates

**Files:**
- Create: `functions/_shared/staff-tables.js`
- Create: `test/staff-tables.test.js`

- [ ] **Step 1: Write failing tests** for a known table ID, empty/whole-number values, and rejection of negative, decimal, oversized, or malformed values.
- [ ] **Step 2: Run `node --test test/staff-tables.test.js`** and verify the missing helper fails.
- [ ] **Step 3: Implement `validateMinimumSpendPayload(body)`** returning `{ tableId, minimumSpendEur }`, coercing an empty value to zero and accepting only safe non-negative integers.
- [ ] **Step 4: Run `node --test test/staff-tables.test.js`** and verify all cases pass.

### Task 2: Persist and Return the Setting

**Files:**
- Modify: `functions/api/staff/tables.js`
- Modify: `test/staff-auth-source.test.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Add failing source tests** requiring `minimum_spend_eur` in the GET query, a door-protected PATCH handler, validation, and a filtered Supabase update.
- [ ] **Step 2: Run the focused tests** and verify they fail for the absent contract.
- [ ] **Step 3: Extend GET** to return each table as `{ id, label, capacity, sortOrder, minimumSpendEur }`.
- [ ] **Step 4: Add PATCH** that parses JSON, requires role `door`, validates the payload, patches `staff_tables?id=eq.<tableId>`, and returns the updated setting without exposing upstream errors.
- [ ] **Step 5: Run the focused tests** and verify they pass.

### Task 3: Add the Database Column

**Files:**
- Create: `sql/2026-10-06-table-minimum-spend.sql`
- Modify: `sql/schema.sql`
- Modify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Add failing schema tests** for a non-null integer defaulting to zero with a non-negative check.
- [ ] **Step 2: Run the schema test** and verify it fails.
- [ ] **Step 3: Add the column to the schema and idempotent migration**, backfilling existing rows to zero before setting `NOT NULL`.
- [ ] **Step 4: Run the schema test** and verify it passes.

### Task 4: Render and Edit Minimum Spend

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Add failing UI source tests** for the number input, `min=0`, `step=1`, Enter-to-blur, blur-to-save, read-only service amount, status copy, and CSV column.
- [ ] **Step 2: Run `node --test test/staff-admin-ui.test.js`** and verify the new assertions fail.
- [ ] **Step 3: Add compact table-setting styles** using the existing dark/gold control language and responsive constraints.
- [ ] **Step 4: Render each table's formatted amount on its chip**, an editable number input for non-service roles, and formatted read-only text for service.
- [ ] **Step 5: Implement auto-save** by PATCHing `/api/staff/tables` on blur; Enter triggers blur, empty becomes zero, and status text reports saving/success/error.
- [ ] **Step 6: Add `Minimum spend EUR` to Tables CSV** in both scripts.
- [ ] **Step 7: Run the focused UI tests** and verify they pass.

### Task 5: Verify, Migrate, Deploy

**Files:**
- No additional source files.

- [ ] **Step 1: Run `npm test`**, JavaScript syntax checks, and `git diff --check`.
- [ ] **Step 2: Apply `sql/2026-10-06-table-minimum-spend.sql`** to the linked production Supabase project and query the resulting column/constraint.
- [ ] **Step 3: Run browser QA** for editable owner/door presentation and service read-only presentation at desktop and mobile widths.
- [ ] **Step 4: Deploy with Wrangler** and verify the production custom domain serves the updated fallback asset.
