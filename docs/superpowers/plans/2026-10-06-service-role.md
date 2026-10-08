# Service Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `service` staff role that can open only a read-only Tables view.

**Architecture:** Extend the existing role hierarchy with `service` below `door`. Use `service` as the minimum requirement only for the staff shell, session endpoints, and `GET /api/staff/tables`; keep every mutation and non-table API at `door` or higher. Render the existing Tables data through a role-aware read-only variant instead of creating a second endpoint.

**Tech Stack:** Cloudflare Pages Functions, static inline JavaScript, Supabase/PostgREST, PostgreSQL migrations, Node `node:test`.

---

### Task 1: Role And Permission Contract

**Files:**
- Modify: `test/staff-auth.test.js`
- Modify: `test/staff-auth-source.test.js`
- Modify: `functions/_shared/staff-auth.js`
- Modify: `functions/staff/rose-door-10.js`
- Modify: `functions/api/staff/logout.js`
- Modify: `functions/api/staff/me.js`
- Modify: `functions/api/staff/tables.js`

- [ ] Add failing tests asserting `isValidRole("service")`, `roleAllows("service", "service")`, and rejection of `door`, `admin`, and `owner` requirements.
- [ ] Add source tests asserting that the staff shell, logout, identity, and tables read use `requireStaff(..., "service")`, while mutations and other operational APIs remain `door` or higher.
- [ ] Run `node --test test/staff-auth.test.js test/staff-auth-source.test.js` and confirm failure.
- [ ] Add `service` to `ROLES` and implement the hierarchy:

```js
if (role === "owner") return true;
if (role === "admin") return ["admin", "door", "service"].includes(required);
if (role === "door") return required === "door" || required === "service";
if (role === "service") return required === "service";
```

- [ ] Lower only the staff shell, logout, identity, and tables GET requirement to `service`.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Read-Only Service Tables UI

**Files:**
- Modify: `test/staff-admin-ui.test.js`
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`

- [ ] Add failing source tests asserting `service:['tables']` in both scripts and role-aware table rendering without export, Add, Remove, assignment selects, confirmation checkboxes, or the add-to-table panel.
- [ ] Run `node --test test/staff-admin-ui.test.js` and confirm failure.
- [ ] Add `service:['tables']`, start service users on Tables, and derive `TABLES_READ_ONLY` from the current role.
- [ ] Keep table selection/navigation available, but render status labels instead of mutation controls for service users.
- [ ] Update the fallback script with the identical permission and rendering behavior, then bump its cache query version.
- [ ] Re-run `node --test test/staff-admin-ui.test.js` and confirm it passes.

### Task 3: Staff Role Selection And Database Constraint

**Files:**
- Modify: `test/staff-admin-ui.test.js`
- Modify: `test/staff-auth-source.test.js`
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `sql/schema.sql`
- Create: `sql/2026-10-06-service-staff-role.sql`

- [ ] Add failing tests for the `service` role option in both Staff renderers and for schema/migration support.
- [ ] Run the focused tests and confirm failure.
- [ ] Add `<option value="service">service</option>` to both owner-only role selectors.
- [ ] Update `schema.sql` and add an idempotent migration that drops the existing role check and recreates it with `owner`, `admin`, `door`, and `service`.
- [ ] Run the focused tests and confirm they pass.

### Task 4: Production Migration, QA, And Deployment

**Files:**
- Verify all files above.

- [ ] Run `npm test`, syntax checks for changed JavaScript, and `git diff --check`.
- [ ] Apply the role-constraint migration to production Supabase without logging credentials.
- [ ] Start Wrangler locally and verify a service-rendered staff page at mobile and desktop widths with only Tables visible and no mutation controls.
- [ ] Stop local processes and remove generated QA artifacts.
- [ ] Deploy with `npx wrangler pages deploy . --project-name whispers-invite --branch main`.
- [ ] Verify the production bundle contains the service role, read-only rendering, and updated migration behavior.
