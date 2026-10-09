# RSVP Confirmed And Called Status Design

**Date:** 2026-10-10

## Goal

Make staff-facing status labels match their real meaning without losing any existing manual data:

- `Confirmed` means the invitation has an attending RSVP.
- `Called` is the existing manual staff checkbox currently stored as `reservation_confirmed`.
- `Request` continues to mean that the guest requested a table.

## Data Model

Add `rsvps.called boolean not null default false` in a new idempotent migration. The migration copies every existing `reservation_confirmed` value into `called`, preserving both checked and unchecked records.

`Confirmed` does not need another database column. It is derived from the existing RSVP source of truth:

```text
confirmed = rsvps.status === "attending"
```

The existing `reservation_confirmed` column stays temporarily during the additive rollout so the currently deployed application cannot fail between the database migration and the new Cloudflare deployment. New code must not read or write it. Removal, if desired, is a separate migration after production verification.

## API Behaviour

Staff APIs return two independent values:

- `confirmed`: derived from RSVP status and read-only.
- `called`: loaded from and written to `rsvps.called`.

The reservation-state endpoint accepts `called` for manual staff updates and no longer accepts `reservationConfirmed`. Request handling remains unchanged.

Ticket and confirmation APIs keep their existing guest-facing generic table-reservation behaviour, but read the migrated `called` field instead of `reservation_confirmed`. This preserves the current meaning and existing records while removing all runtime dependency on the old field.

## Staff UI

### Members

The status columns are ordered and labelled:

1. `Confirmed` - read-only checkbox derived from RSVP status.
2. `Request` - editable table-request checkbox.
3. `Called` - editable manual checkbox.
4. `Table` - current assignment.

The `Confirmed` checkbox is disabled/read-only and cannot mutate RSVP status. `Request` and `Called` retain their existing confirmation prompts and inline updates without refreshing the page.

### Tables And MAP

Group rows display independent compact status labels:

- `CONFIRMED` for an attending RSVP.
- `REQUESTED TABLE` when a table was requested.
- `CALLED` when staff marked the migrated manual state.

The old `RESERVED` label is removed from both the dedicated MAP tab and Tables rendering, including the fallback staff client. Primary guests and their plus-ones remain grouped together.

### Frontend Polish

Status labels use the existing restrained staff visual system:

- confirmation uses the existing positive green treatment;
- request and called use quiet gold treatments;
- crimson is not used for a positive status;
- labels wrap cleanly on narrow phones and do not compete with guest names or action buttons.

## Rollout

1. Add and run the additive `called` migration, including the data backfill.
2. Verify counts for old and new checked values match.
3. Deploy code that exclusively reads and writes `called`.
4. Verify Members, Tables, MAP, ticket and confirmation flows in production.
5. Keep `reservation_confirmed` unused until a later cleanup migration.

## Testing

- Migration is idempotent and copies existing true/false values.
- Staff table helpers expose `confirmed` from status and `called` from the new column.
- Members renders Confirmed as read-only and Called as editable.
- Reservation-state updates `called` and rejects the obsolete payload field.
- Tables, MAP and fallback render `CONFIRMED` and `CALLED`, never `RESERVED`.
- Ticket and confirmation APIs no longer reference `reservation_confirmed`.
- Full test suite and JavaScript syntax checks pass before deployment.

