# Independent Confirmation And Update Controls Design

**Date:** 2026-10-08
**Status:** Approved

## Goal

Split the current owner RSVP switch into two independent controls:

- **New confirmations** controls the first saved RSVP for a guest.
- **Update details** controls changes to an RSVP that already exists.

Both controls support an immediate lock/unlock, an optional future Sofia date and time, and cancellation of their own scheduled change. The owner must be able to keep new confirmations open while locking updates, or choose any other combination.

Ticket release, confirmation-page read access, ticket rendering, venue reveal, check-in and staff operations remain independent.

## Chosen Approach

Keep the existing `rsvp_*` database fields as the New confirmations policy and add a parallel set of `rsvp_updates_*` fields for Update details. This is the lowest-risk migration because the deployed confirmation setting and its current state remain intact.

Alternatives considered:

- Renaming the existing columns would make the names clearer but creates unnecessary rollout and rollback risk.
- Storing policies as JSON would reduce columns but weaken database constraints and complicate PostgREST updates.

The parallel-column approach preserves backward compatibility while keeping both policies independently constrained.

## User Interface

The owner-only **Settings** tab contains two un-nested setting sections:

1. **New confirmations**
2. **Update details**

Each section independently shows:

- effective state: `OPEN` or `LOCKED`;
- one optional `datetime-local` field interpreted in `Europe/Sofia`;
- an action labelled `Lock now`, `Unlock now`, `Schedule lock`, or `Schedule unlock`;
- the scheduled change, when present;
- `Cancel scheduled change` when applicable;
- an `aria-live` save/error message.

Saving one section must not change the other section. While one request is running, only that section's controls are disabled.

## Data Model

The existing fields continue to represent New confirmations:

```sql
rsvp_open boolean not null default true,
rsvp_change_at timestamptz,
rsvp_change_to_open boolean
```

Add the Update details policy:

```sql
rsvp_updates_open boolean not null default true,
rsvp_updates_change_at timestamptz,
rsvp_updates_change_to_open boolean
```

A check constraint requires the two update schedule fields to be both null or both non-null. The migration is idempotent and defaults updates to open, preserving current production behavior.

Both policies are evaluated lazily on each relevant request. No cron job is required. A future schedule changes the effective state at the exact timestamp but does not rewrite the row until the owner next saves or cancels that policy.

## Shared Policy Contract

`loadRsvpPolicy()` returns:

```json
{
  "confirmation": {
    "isOpen": true,
    "scheduledChange": null,
    "timezone": "Europe/Sofia"
  },
  "updates": {
    "isOpen": true,
    "scheduledChange": null,
    "timezone": "Europe/Sofia"
  }
}
```

The existing Sofia conversion and schedule validation are shared by both policies. Patch construction accepts an explicit policy key and returns only that policy's three database fields, preventing one save from overwriting the other.

## Staff API

`GET /api/staff/settings` remains owner-only and returns both policies under `rsvp`.

`PATCH /api/staff/settings` remains owner-only and requires a policy selector:

```json
{
  "setting": "confirmation",
  "targetOpen": false,
  "changeAtLocal": null
}
```

or:

```json
{
  "setting": "updates",
  "targetOpen": false,
  "changeAtLocal": "2026-10-08T21:30"
}
```

Schedule cancellation is also scoped:

```json
{
  "setting": "updates",
  "cancelScheduledChange": true
}
```

Missing or invalid selectors return `400`. Authentication behavior remains `401` for unauthenticated requests and `403` for non-owner staff.

## Guest Enforcement

### New confirmation

`POST /api/rsvp` keeps validation and identity resolution unchanged. It builds the candidate row, applies a personal invite when present, and performs the existing RSVP lookup.

When no existing RSVP is found, the New confirmations policy is checked before insertion. If locked, the API returns HTTP `403` with:

```json
{ "error": "RSVP confirmations are closed." }
```

### Existing RSVP update

When the existing lookup finds an RSVP by guest identity or normalized contact details, the Update details policy is checked before calling the unchanged `updateExistingRsvp()` path. If locked, the API returns HTTP `403` with:

```json
{ "error": "Updates are closed." }
```

This ordering is essential: the policy is selected from the server's existing-record lookup, never from a client-provided mode flag. It prevents a caller from bypassing the update lock by changing a URL parameter or request field.

All existing update safeguards remain intact after this guard, including checked-in protection, ticket preservation, companion synchronization and table-request behavior.

### Confirmation page

`GET /api/confirmation` remains readable regardless of either setting. `canUpdate` and `updateUrl` depend only on the Update details policy plus the existing holder/status/identity rules. The New confirmations policy does not hide Update details.

## Rollout

1. Apply the additive migration first. Both update fields default to open.
2. Verify production remains `confirmation open / updates open`, with no schedules.
3. Deploy the application.
4. Verify owner sees both controls and non-owner roles do not see Settings.
5. Verify a real existing confirmation still returns `canUpdate: true` while updates are open.
6. Verify the four policy combinations through isolated tests; do not temporarily lock live production during smoke testing.

Rollback is safe: the previous code ignores the new update columns and continues using the existing combined confirmation setting.

## Test Coverage

Automated tests cover:

- independent effective state and schedule evaluation;
- independent patch construction with no cross-policy fields;
- migration and fresh-schema defaults/constraints;
- owner API selector validation;
- new RSVP gating by the confirmation policy;
- existing RSVP gating by the update policy after server-side lookup;
- confirmation `canUpdate` using only the update policy;
- two independent Settings sections in the primary and fallback staff scripts;
- unchanged owner-only authorization and route allowlisting;
- the full existing suite for RSVP updates, companions, ticket preservation, MAP and staff roles.

Runtime verification uses read-only production checks plus temporary staff sessions that are deleted after use. Production is left open with no schedules unless the owner explicitly changes it.
