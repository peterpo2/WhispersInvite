# Table Minimum Spend Design

## Goal

Add a configurable minimum spend in whole euros to every staff table.

## Data Model

- Add `minimum_spend_eur` to `staff_tables` as a non-negative integer.
- Existing tables default to `0`.
- Add an idempotent dated migration and update `sql/schema.sql`.

## API

- `GET /api/staff/tables` returns `minimumSpendEur` for every table.
- Add an authenticated staff update operation for one table's minimum spend.
- Owner, admin and door may update the value. Service remains read-only.
- Accept only a known table ID and an integer greater than or equal to zero.
- Return short user-facing errors without upstream database details.

## Staff UI

- The selected table displays `Minimum spend (EUR)`.
- Owner, admin and door see a numeric input that accepts whole non-negative values.
- The input saves on Enter or blur and reports `Saving...`, `Saved.` or a short error.
- Empty input saves as `0`.
- Service sees a formatted euro amount without an editable input.
- The unassigned group does not show a minimum-spend control.
- Table chips include the configured euro amount so staff can scan all tables quickly.

## Export

- The Tables CSV gains a `Minimum spend EUR` column.
- Each assigned group row carries its table's configured value.

## Verification

- Pure validation and role/source tests cover the API contract.
- Source tests cover editable and read-only rendering and CSV output.
- Run the complete Node test suite.
- Apply the migration to the linked production database.
- Verify owner/door editing and service read-only rendering at desktop and mobile sizes.

