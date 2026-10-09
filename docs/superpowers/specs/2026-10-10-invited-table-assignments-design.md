# Invited Table Assignments Design

**Date:** 2026-10-10

## Goal

Allow an Admin Invite that has not responded yet to be assigned to, moved between, and removed from tables in both Tables and MAP. The invite remains visibly `INVITED`; it must not be treated as RSVP-confirmed. If that invite later confirms, its table assignment must stay attached to the resulting RSVP group.

## Current Problem

The combined Tables/MAP search already returns unmatched `guest_list` rows, but marks them as unassignable because they do not have an `rsvps.id`. `staff_table_assignments` also requires an `rsvp_id`, so the API has no valid identity to persist for an unconfirmed invite. Production currently has 65 assignments, all attached to attending RSVP rows, and no unconfirmed invite assignments.

## Considered Approaches

### 1. Add invite identity to the existing assignment table (selected)

Add an optional `invite_id` foreign key to `staff_table_assignments`, make `rsvp_id` optional, and require exactly one of the two identities. This keeps one assignment model and allows a real invite to exist on a table before RSVP.

Advantages: no fabricated RSVP data, one table assignment per invite/group, existing assignments stay unchanged, and the UI can show the correct lifecycle state.

### 2. Create placeholder RSVP rows

This would reuse the current assignment foreign key, but it would pollute Members, RSVP counts, confirmation state, tickets, and email logic with records that are not real responses. Rejected.

### 3. Add a second invite-assignment table

This avoids altering the existing table but duplicates assignment queries, movement rules, exports, and reconciliation logic. Rejected because it creates two competing sources of truth.

## Database Model

Create an idempotent migration that:

- adds nullable `invite_id text references public.guest_list(id) on delete cascade`;
- makes `rsvp_id` nullable;
- adds an identity `id` primary key and replaces the current RSVP-only primary key;
- enforces exactly one of `rsvp_id` and `invite_id` per row;
- adds unique constraints for `(event_key, rsvp_id)` and `(event_key, invite_id)`, which enforce one assignment per event and subject while allowing the other subject column to be null;
- preserves every existing assignment unchanged;
- reloads the PostgREST schema.

The fresh schema must match the migration result.

## API And Data Flow

`GET /api/staff/tables` will load assignments for both RSVP rows and invites and build one canonical group per person/group:

- unmatched Admin Invite: `INVITED`, one person, `confirmed: false`, assignable by invite identity;
- matched attending RSVP: existing RSVP group with primary and plus-one/companions, `CONFIRMED`;
- declined RSVP: not assignable and not shown as an active table group;
- direct attending RSVP: existing RSVP assignment behaviour.

The search registry will carry an opaque assignment subject (`invite` or `rsvp`) instead of assuming every assignable result has an RSVP ID. Searching an invite will expose an active Add/Move action.

`POST /api/staff/table-assignment` will validate either an RSVP subject with a positive numeric ID or an invite subject with a bounded text ID. It will upsert, move, or remove only that subject. Raw column names supplied by the client will not be accepted.

An `AFTER INSERT OR UPDATE` database trigger on `rsvps` will reconcile an assignment whose `invite_id` matches the RSVP `guest_id`. It will preserve the same `table_id`; if an RSVP assignment already exists, that explicit RSVP assignment wins and the obsolete invite assignment is removed. This makes promotion atomic with the RSVP write. A repeat RSVP/update must not disturb the table.

## UI Behaviour

Tables and MAP will:

- show `ADD` for `INVITED` search results;
- render assigned invites in the selected table as a one-person group;
- show an `INVITED` badge, never `CONFIRMED`, until an attending RSVP exists;
- support Move and Remove using the same controls as RSVP groups;
- include assigned invites in guest counts and Tables CSV;
- keep confirmed guests and their plus-one/companions together as today.

Service remains read-only. Existing owner/admin/door permissions do not change. The hidden embedded Tables map remains hidden.

## Concurrency And Safety

Database uniqueness prevents duplicate assignments when two staff users act at the same time. After every successful mutation, the client reloads Tables data, so changes made by another logged-in user become visible on refresh/reload. Existing RSVP assignment rows and table positions are not rewritten by the migration.

The database migration must be deployed before code that reads `invite_id`. Aggregate checks will verify that all existing assignment counts and RSVP/table pairs are preserved.

## Tests

Add coverage for:

- an unmatched invite being assignable and represented as an `INVITED` group;
- attending linked invites merging into one RSVP group without duplication;
- declined rows remaining unavailable;
- assignment payload validation for invite and RSVP subjects;
- migration constraints, uniqueness, and preservation of existing rows;
- Tables and MAP Add/Move/Remove markup for invite subjects;
- RSVP reconciliation preserving the invite's table;
- CSV and table counts including assigned invites;
- the full existing suite, JavaScript syntax checks, and production smoke checks.

## Acceptance Criteria

1. Searching `Peter Test` in the shown MAP panel displays an active `ADD` button while the record is `INVITED`.
2. After Add, the invite appears at that table with an `INVITED` badge and contributes one guest.
3. Move and Remove work from both Tables and MAP.
4. After the invite confirms, the same table contains the resulting `CONFIRMED` RSVP group with no duplicate invite row.
5. Existing 65 production assignments remain unchanged through migration and deployment.
