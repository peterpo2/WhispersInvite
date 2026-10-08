# Owner RSVP Settings Design

**Date:** 2026-10-08
**Status:** Approved

## Goal

Add an owner-only `SETTINGS` tab to the staff application where the owner can open or lock guest RSVP confirmations and detail updates immediately or schedule the opposite state for a future Sofia date and time.

The feature must preserve the currently deployed behavior on rollout: RSVP confirmation and updates remain open until the owner changes the setting.

## Scope

The setting controls both of these guest operations:

- creating a new RSVP through the invitation flow;
- changing an existing RSVP through `Update details` on a confirmation page.

The setting does not control ticket release, venue reveal, ticket rendering, door check-in, table assignment, or any other staff operation. `TICKET_RELEASE_AT` remains unchanged and independent.

## Roles

- Only an authenticated `owner` sees the `SETTINGS` tab.
- Only an authenticated `owner` may read or change the setting API.
- `admin`, `door`, and `service` users cannot see the tab and receive `403 Forbidden` from the API.
- Unauthenticated requests receive `401 Unauthorized`.

## User Interface

The staff application gains a `SETTINGS` tab rendered only for the owner. It follows the existing dark WHISPERS staff styling and contains one un-nested operational panel.

The panel shows:

- the effective state: `OPEN` or `LOCKED`;
- restrained explanatory copy that the state applies to RSVP confirmation and `Update details`;
- a primary action for the opposite state (`LOCK` while open, `UNLOCK` while locked);
- an optional `datetime-local` field labelled with `Europe/Sofia`;
- the currently scheduled change, when present;
- a `Cancel scheduled change` action when a future change exists;
- an `aria-live` status line for saving, success, validation, and network errors.

Behavior:

- With no date and time, the selected action applies immediately and has no automatic reversal.
- With a future date and time, the current state remains unchanged until that moment and then changes to the selected target state.
- The scheduled target must differ from the current effective state.
- A scheduled time must be in the future.
- Cancelling a schedule preserves the current effective state indefinitely.
- The date picker value is interpreted in `Europe/Sofia`, independent of the device timezone.

## Data Model

Extend the existing `event_details` row for `whispers-2026-10-10` with:

```sql
rsvp_open boolean not null default true,
rsvp_change_at timestamptz,
rsvp_change_to_open boolean
```

A check constraint requires the two scheduled-change columns to be either both null or both non-null.

The migration is idempotent and leaves the event open by default. Existing rows are not locked by migration.

The effective state is calculated as follows:

1. Start with `rsvp_open`.
2. When both schedule fields exist and `now >= rsvp_change_at`, use `rsvp_change_to_open`.
3. Expose no active schedule after its timestamp has elapsed.

No background worker or cron job is required. Every relevant request calculates the effective state from the stored values and the current time.

## Shared Logic

Create a focused shared module for pure policy and validation helpers:

- normalize a database row into an effective RSVP policy;
- validate owner update payloads;
- convert a local `YYYY-MM-DDTHH:mm` Sofia value to a valid ISO timestamp;
- construct the database patch for an immediate change, future change, or schedule cancellation.

The time conversion must round-trip through `Europe/Sofia` so invalid local times around daylight-saving transitions are rejected rather than silently shifted.

The public policy loader reads only the three RSVP setting columns from `event_details` through `supabaseFetch`. Missing rows retain the safe rollout default of open. Upstream database errors return a generic service error and never expose Supabase details.

## API

### `GET /api/staff/settings`

Requires role `owner` and returns:

```json
{
  "ok": true,
  "rsvp": {
    "isOpen": true,
    "scheduledChange": null,
    "timezone": "Europe/Sofia"
  }
}
```

When active, `scheduledChange` is:

```json
{
  "at": "2026-10-08T17:00:00.000Z",
  "open": false
}
```

### `PATCH /api/staff/settings`

Requires role `owner` and accepts one of:

```json
{ "targetOpen": false, "changeAtLocal": null }
```

for an immediate change,

```json
{ "targetOpen": false, "changeAtLocal": "2026-10-08T21:30" }
```

for a scheduled Sofia-time change, or:

```json
{ "cancelScheduledChange": true }
```

The response uses the same `rsvp` shape as GET. Malformed requests return `400` with short user-facing errors. Unsupported methods return `405`.

The endpoint updates the single event row with an upsert-safe operation and refreshes `updated_at`.

## Guest Enforcement

### New and updated RSVPs

`POST /api/rsvp` loads the effective policy before any insert or update. When locked, it returns:

```json
{ "error": "RSVP is closed." }
```

with HTTP `403`. Both new confirmations and changes to existing records are blocked server-side.

### Confirmation pages

`GET /api/confirmation` still allows guests to view their saved confirmation. Its `canUpdate` value is true only when:

- the existing ticket rules permit updates; and
- the effective RSVP policy is open.

When locked, `updateUrl` is null and the `Update details` action remains hidden. The confirmation page itself, ticket page, and saved data remain accessible.

## Security And Privacy

- Staff authorization is enforced server-side with `requireStaff(request, env, "owner")`.
- The route is added explicitly to the middleware allowlist; no wildcard API access is introduced.
- Database access uses only `supabaseFetch` and the server-only service-role key.
- API errors do not include upstream bodies, stack traces, credentials, tokens, or personal data.
- The public response reveals only whether updates are currently allowed; it does not expose staff identity or internal configuration.

## Rollout Order

1. Run the database migration. Defaults keep RSVP open.
2. Deploy the application code.
3. Verify unauthenticated and non-owner access controls.
4. Verify owner read, immediate save, scheduling, and cancellation.
5. Verify a public confirmation remains viewable and `canUpdate` follows the setting.
6. Leave production in `OPEN` with no scheduled change unless the owner explicitly changes it.

If deployment must be rolled back after migration, the old code ignores the new columns and continues operating as before.

## Test Coverage

Automated tests cover:

- policy evaluation before, at, and after a scheduled change;
- open-by-default behavior for an absent row;
- Sofia local-time conversion and invalid values;
- immediate, scheduled, and cancelled update payloads;
- owner-only API source and route allowlisting;
- RSVP rejection while locked;
- confirmation `canUpdate` gating while preserving read access;
- owner-only tab markup, navigation, and controls;
- absence of the tab for all non-owner roles;
- schema and migration defaults/constraints.

After the full Node test suite passes, browser QA covers owner desktop and phone layouts, saving states, refresh persistence, and the unchanged operational tabs. Production smoke tests use temporary sessions that are deleted after verification.

