# Organizer Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring WHISPERS Invite in line with the 27.09 organizer answers and latest product changes: English guest copy, max +1, required email for every attendee, RSVP/cancellation rules, locked ticket release, table reservation confirmation, sponsor logos, email readiness and mobile QA.

**Architecture:** Keep the no-build Cloudflare Pages + Pages Functions + Supabase architecture. Put reusable validation and date logic in `functions/_shared/rsvp.js`, keep public copy in `index.html`/ticket route, and keep staff operations under `/api/staff/*` plus `/staff/rose-door-10`.

**Tech Stack:** Static HTML, Cloudflare Pages Functions ES modules, Supabase PostgREST, Node built-in tests.

---

## File Map

- `functions/_shared/rsvp.js`: event constants, release/deadline helpers, max +1 helper logic, ticket payload shaping.
- `functions/api/rsvp.js`: RSVP insert/update rules, contact matching, max +1 enforcement, future deadline enforcement.
- `functions/api/ticket.js`: locked/released ticket payload and staff-only table assignment handling.
- `functions/ticket/[token].js`: ticket page copy, QR visibility and guest-facing table confirmation.
- `functions/staff/rose-door-10.js`: staff Members/Tables UI, future reservation-confirmed toggle if needed.
- `functions/api/staff/*`: staff data APIs, future table-confirmation endpoint if separate from table assignment.
- `sql/schema.sql` and dated migrations: any durable DB fields such as `reservation_confirmed`.
- `index.html`: invitation flow copy and guest registration UI.
- `docs/*`: source-of-truth specs, copy inventory, style guide and README.
- `test/rsvp.test.js`: pure helper tests.

## Task 1: Lock Copy And Flow Decisions

- [x] Update guest-facing table reservation copy to English:

```text
Would you like us to reserve a table for you?
Our team will contact you with the reservation details.
```

- [x] Update pre-release location copy:

```text
Sofia · private location in central Sofia
Address released on 09.10 at 18:00.
```

- [x] Add access-only disclaimer:

```text
This invitation only grants access to the event.
```

- [x] Update docs so they no longer say repeated opens can add multiple guests.
- [x] Update +1 validation so the added guest requires full name and email, while phone is not
  collected in the public flow.
- [x] Add a discreet `Powered by` sponsor footer at the end screen. It expects
  `assets/sponsor-1.png` and `assets/sponsor-2.png`.

## Task 2: Enforce The First-Event +1 Limit

- [x] Add helper constants in `functions/_shared/rsvp.js`:

```js
export const MAX_ADDED_GUESTS = 1;
```

- [x] Add helper tests in `test/rsvp.test.js` for the max +1 rule.
- [x] Update `functions/api/rsvp.js` so repeat registration with the same primary contact can add a companion only when none exists.
- [x] Run `npm test`.

## Task 3: RSVP Deadline Enforcement

- [x] Add the canonical deadline constant:

```js
export const RSVP_DEADLINE_AT = "2026-10-07T18:00:00+03:00";
```

- [x] Add pure tests for deadline boundary.
- [x] Organizer confirmed final RSVP deadline: `07.10 18:00`.
- [x] Organizer confirmed no cancellation/decline changes after the deadline.
- [x] Add a visible cancel-attendance action on the registration confirmation screen.
- [x] Update `functions/api/rsvp.js`:
  - no new registrations after deadline;
  - no +1 additions after deadline;
  - no name/email/phone edits after deadline;
  - no cancellation/decline changes after deadline.
- [x] Add tests for any new pure deadline helper logic.
- [x] Run `npm test`.

## Task 4: Table Reservation Confirmation

- [x] Stop showing table numbers on guest tickets.
- [x] Show only generic copy when staff confirms a table reservation:

```text
Your table is confirmed.
```

- [x] Organizer confirmed a separate `reservation_confirmed` checkbox is required.
- [x] Add a dated migration:

```sql
alter table public.rsvps
  add column if not exists reservation_confirmed boolean not null default false;
```

- [x] Update `schema.sql` to include `reservation_confirmed`.
- [x] Add staff UI toggle in Members and Tables.
- [x] Update `/api/ticket` to show generic table confirmation only when `reservation_confirmed = true`.
- [ ] Run `npm test` and manual staff UI QA.

## Task 5: Email Readiness

- [x] Decide sender provider: SuperHosting SMTP.
- [ ] Add provider-agnostic server helper:

```text
sendEmail(env, { to, from, replyTo, subject, html, text })
```

- [ ] Add registration confirmation email after RSVP save.
- [ ] Add ticket release sender for 09.10 at 18:00:
  - primary guests use `rsvps.ticket_token`;
  - companions use `rsvp_companions.ticket_token`;
  - companion email is required in the current public flow.
- [ ] Mark `ticket_email_sent_at` idempotently per person.
- [ ] Keep all provider credentials in Cloudflare Pages environment variables.

## Task 6: Admin Auth

- [ ] Wait for final admin emails, target latest `07.10.2026` morning for comfortable testing.
- [ ] Create server-side admin user storage.
- [ ] Implement username/password login.
- [ ] Implement email confirmation code.
- [ ] Set `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/staff` session cookie.
- [ ] Keep all admins same role for first version.
- [ ] Do not enable auth wall until domain/email are ready and tested.

## Task 7: Final Mobile QA

- [ ] Test iPhone/Safari at 320-390px widths:
  - seal hold;
  - form keyboard;
  - registration with +1;
  - locked ticket;
  - released ticket;
  - staff scanner.
- [ ] Test modern Android/Samsung Chrome:
  - same public flow;
  - no horizontal scroll;
  - ticket QR renders;
  - staff Tables/Members usable.
- [ ] Check `prefers-reduced-motion`.
- [ ] Check no QR/code/location appears before `09.10 18:00`.

## Open Organizer Questions

1. When will final video, font, sponsor logos and identity assets be delivered?
2. Can final admin emails be provided by `07.10.2026` morning for testing?
