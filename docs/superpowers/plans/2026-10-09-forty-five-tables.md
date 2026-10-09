# Forty-five Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tables 36-45 to production, the Tables interface, Tables -> Show map, and the separate MAP tab without changing Tables 1-35.

**Architecture:** Add one idempotent migration and matching fresh-schema seeds. The existing APIs already return every `staff_tables` row; new rows receive valid Show map coordinates while nullable `hall_x`/`hall_y` keep them under `Not on the plan` in the MAP tab.

**Tech Stack:** PostgreSQL migrations, Supabase/PostgREST, Cloudflare Pages Functions, Node `node:test`.

---

### Task 1: Specify the 45-table database state

**Files:**
- Modify: `test/staff-admin-ui.test.js`
- Create: `sql/2026-10-09-forty-five-staff-tables.sql`
- Modify: `sql/schema.sql`

- [ ] **Step 1: Write the failing source test**

Add a migration fixture and replace the 35-table assertion with a 45-table assertion that requires:

```js
const fortyFiveTablesMigrationPath = "sql/2026-10-09-forty-five-staff-tables.sql";
const fortyFiveTablesMigration = existsSync(fortyFiveTablesMigrationPath)
  ? readFileSync(fortyFiveTablesMigrationPath, "utf8")
  : "";

assert.match(schema, /\('t45', 'Table 45', 45, 90, 28\)/);
assert.match(fortyFiveTablesMigration, /\('t36', 'Table 36', 36, 10, 14\)/);
assert.match(fortyFiveTablesMigration, /\('t45', 'Table 45', 45, 90, 28\)/);
assert.match(fortyFiveTablesMigration, /on conflict \(id\) do nothing/);
assert.doesNotMatch(fortyFiveTablesMigration, /\bupdate\s+public\.staff_tables\b/i);
```

Also assert that the fresh schema seed for `t45` omits `hall_x` and `hall_y`, leaving both nullable.

- [ ] **Step 2: Verify the new test fails**

Run:

```powershell
node --test test/staff-admin-ui.test.js
```

Expected: FAIL because the new migration and `t36`-`t45` schema rows do not exist.

- [ ] **Step 3: Add the idempotent migration**

Create `sql/2026-10-09-forty-five-staff-tables.sql` with only this insert:

```sql
insert into public.staff_tables (id, label, sort_order, map_x, map_y) values
  ('t36', 'Table 36', 36, 10, 14),
  ('t37', 'Table 37', 37, 30, 14),
  ('t38', 'Table 38', 38, 50, 14),
  ('t39', 'Table 39', 39, 70, 14),
  ('t40', 'Table 40', 40, 90, 14),
  ('t41', 'Table 41', 41, 10, 28),
  ('t42', 'Table 42', 42, 30, 28),
  ('t43', 'Table 43', 43, 50, 28),
  ('t44', 'Table 44', 44, 70, 28),
  ('t45', 'Table 45', 45, 90, 28)
on conflict (id) do nothing;
```

Do not add an `UPDATE`; existing records must remain untouched.

- [ ] **Step 4: Update the fresh schema seed**

Append the same ten rows to the existing `staff_tables` insert in `sql/schema.sql`. Keep the insert column list at `(id, label, sort_order, map_x, map_y)` so `minimum_spend_eur` remains `0` and `hall_x`/`hall_y` remain `null` by their schema defaults.

- [ ] **Step 5: Verify the focused test passes**

Run:

```powershell
node --test test/staff-admin-ui.test.js
```

Expected: all staff admin UI tests pass.

### Task 2: Verify and ship

**Files:**
- Verify: `sql/2026-10-09-forty-five-staff-tables.sql`
- Verify: `sql/schema.sql`
- Verify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Run repository verification**

Run:

```powershell
git diff --check
npm test
```

Expected: no whitespace errors and all tests pass.

- [ ] **Step 2: Commit only this feature's files**

Stage the migration, schema, test, amended design, and this plan. Do not stage the pre-existing `functions/staff/rose-door-10.js` modification.

```powershell
git add -- sql/2026-10-09-forty-five-staff-tables.sql sql/schema.sql test/staff-admin-ui.test.js docs/superpowers/specs/2026-10-09-forty-five-tables-design.md docs/superpowers/plans/2026-10-09-forty-five-tables.md
git commit -m "feat: expand venue to forty-five tables"
```

- [ ] **Step 3: Apply the production migration**

Run the idempotent SQL against the production Supabase database using the repository's existing secure migration mechanism. Verify the database returns exactly 45 rows ordered from `t1` through `t45`, and verify `t36`-`t45` have `hall_x is null` and `hall_y is null`.

- [ ] **Step 4: Push and deploy**

```powershell
git push origin main
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

Expected: push succeeds and Wrangler prints a successful deployment URL.

- [ ] **Step 5: Production smoke test**

Verify the public site and staff login return `200`, unauthenticated staff APIs return `401`, and an authenticated owner session shows Tables 1-45 with Tables 36-45 under `Not on the plan` in MAP.
