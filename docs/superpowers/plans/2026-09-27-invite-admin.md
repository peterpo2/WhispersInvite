# Invite Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin Invite tab that creates primary guest invites with pre-generated confirmation and ticket links.

**Architecture:** Extend `guest_list` as the invite registry, add one staff API for list/create, reuse pre-generated invite ticket tokens during RSVP insert, and show pending locked tickets before RSVP. Keep existing staff page structure and current no-auth behavior.

**Tech Stack:** Cloudflare Pages Functions, Supabase PostgREST, static HTML/JS, Node `node:test`.

---

### Task 1: Database And Docs

**Files:**
- Create: `sql/2026-09-27-invite-registry.sql`
- Modify: `sql/schema.sql`
- Modify: `docs/project-spec.md`
- Modify: `README.md`

- [ ] Add `phone`, `ticket_token` and `updated_at` to `guest_list`.
- [ ] Add `guest_list_ticket_token_unique`.
- [ ] Document Invite links and pending ticket behavior.

### Task 2: Shared Invite Helpers

**Files:**
- Modify: `functions/_shared/rsvp.js`
- Modify: `test/rsvp.test.js`

- [ ] Add `validateInvitePayload`.
- [ ] Add `buildInviteRow`.
- [ ] Add `applyInviteToRsvpRow`.
- [ ] Add `pendingInviteTicket`.
- [ ] Add focused helper tests.

### Task 3: Staff Invites API

**Files:**
- Create: `functions/api/staff/invites.js`
- Modify: `functions/_shared/access.js`
- Modify: `test/access.test.js`

- [ ] Implement `GET /api/staff/invites`.
- [ ] Implement `POST /api/staff/invites`.
- [ ] Return absolute `confirmationLink` and `ticketLink`.
- [ ] Allowlist the new route.

### Task 4: RSVP And Ticket Integration

**Files:**
- Modify: `functions/api/rsvp.js`
- Modify: `functions/api/guest-check.js`
- Modify: `functions/api/ticket.js`

- [ ] Make personal RSVP inserts reuse `guest_list.ticket_token`.
- [ ] Return invite email/phone from guest-check for future prefill.
- [ ] Let `/api/ticket` return a pending locked ticket for unused invite ticket tokens.

### Task 5: Admin UI

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add `Invite` tab.
- [ ] Add create invite form.
- [ ] Add invite search and table.
- [ ] Add copy buttons for confirmation and ticket links.
- [ ] Refresh Invite tab from the global Refresh button.

### Task 6: Verify, Migrate, Ship

**Commands:**

```powershell
npm test
node --check functions/api/staff/invites.js
node --check functions/api/rsvp.js
node --check functions/api/ticket.js
node --check functions/staff/rose-door-10.js
npx supabase db query --linked "select 1;"
npx supabase db query --linked "<migration sql>"
git diff --check
git status --short
git add <specific files>
git commit -m "Add invite admin registry"
git push
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

Expected: tests pass, migration applies idempotently, production deploy succeeds, live staff page exposes Scanner/Members/Tables/Invite.
