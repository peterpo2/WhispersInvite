# Confirmation Update Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow safe post-RSVP updates from the confirmation page only when the primary guest has no added guest and ticket release has not happened.

**Architecture:** Extend `/api/confirmation` to expose update eligibility and a confirmation-token update URL. Extend `index.html` with update mode that loads the confirmation token, skips primary contact fields, and sends the existing RSVP identity back to `/api/rsvp`. Keep `/api/rsvp` as the final server-side guard against late updates.

**Tech Stack:** Cloudflare Pages Functions, Supabase PostgREST, static `index.html`, Node `node:test`.

---

### Task 1: Confirmation API Eligibility

**Files:**
- Modify: `functions/api/confirmation.js`
- Test: `test/confirmation-api.test.js`

- [x] Write failing tests for `canUpdate` true/false cases.
- [x] Add `guest_id`, contact fields and update eligibility to primary confirmation payload.
- [x] Ensure companion confirmations never expose update.
- [x] Verify tests fail before implementation and pass after implementation.

### Task 2: Public Update Flow

**Files:**
- Modify: `index.html`
- Test: `test/frontend-copy.test.js`

- [x] Write failing tests for `?confirmation=<token>&update=1` support.
- [x] Load confirmation details into frontend state.
- [x] Make `Respond` go to plus/table step in update mode.
- [x] Keep primary name/email/phone out of the update path.

### Task 3: Confirmation Page Button

**Files:**
- Modify: `functions/hi/[token].js`
- Test: `test/frontend-copy.test.js`

- [x] Write failing tests for conditional `Update details` rendering.
- [x] Add hidden button/link to the confirmation shell.
- [x] Show it only when `/api/confirmation` returns an update URL.

### Task 4: Server-Side Release Guard

**Files:**
- Modify: `functions/api/rsvp.js`
- Test: `test/rsvp-api-source.test.js`

- [x] Write failing source-level test for a ticket-release update guard.
- [x] Reject existing RSVP updates after ticket release.
- [x] Keep existing RSVP deadline behaviour intact.

### Task 5: Email And Documentation Review

**Files:**
- Modify: `functions/_shared/email-content.js`
- Modify: `test/email-content.test.js`
- Modify: `README.md`
- Modify: `docs/project-spec.md`
- Modify: `docs/whispers-page-texts-2026-09-28.md`

- [x] Verify invite emails target `/invite`.
- [x] Verify RSVP confirmation emails target `/hi`.
- [x] Verify ticket emails target `/ticket`.
- [x] Polish email copy if tests reveal stale/plain language.
- [x] Update docs to describe the final flow.

### Task 6: Verification And Ship

**Files:**
- No new files expected beyond the implementation above.

- [x] Run `npm test`.
- [x] Commit the spec/plan/docs/code together with a focused message.
- [x] Push to `main` for Cloudflare Pages deploy.
- [x] Verify live endpoints after deploy.
