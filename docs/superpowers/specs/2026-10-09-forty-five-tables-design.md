# Forty-five Tables Design

## Goal

Expand the existing staff table inventory from 35 to 45 tables without changing any existing table, assignment, minimum spend, or saved map position.

## Database

- Add an idempotent dated migration that inserts `t36` through `t45` as `Table 36` through `Table 45`.
- Keep `sort_order` equal to the table number.
- Use the existing defaults for `minimum_spend_eur`.
- Give the new rows no hall-plan position: `hall_x` and `hall_y` remain `null`.
- Do not update rows that already exist. Re-running the migration must be harmless.
- Update `sql/schema.sql` so a fresh database contains all 45 tables with the same initial state.

## Staff Interfaces

The existing Tables and MAP APIs already read all `staff_tables` rows ordered by `sort_order`, so no new endpoint or frontend branch is required.

- Tables lists Tables 1-45.
- Tables -> Show map receives Tables 36-45 with no manually chosen position and exposes them through the existing unplaced-table workflow.
- The separate MAP tab lists Tables 36-45 under `Not on the plan` until an authorized staff member places them.
- Dragging and saving uses the existing `map_x`/`map_y` and `hall_x`/`hall_y` APIs.
- Existing positions for Tables 1-35 remain unchanged.

## Compatibility

The migration must support the current production schema. It must not restore the removed capacity limit, modify table assignments, or overwrite minimum-spend values and map positions.

## Verification

- Add source tests that require the new migration and fresh schema to contain `t36` through `t45`.
- Assert the migration is idempotent and does not update existing table rows.
- Assert Tables 36-45 have nullable hall positions in the fresh schema.
- Run the full Node test suite.
- Apply the production migration, deploy, and verify both staff table APIs return 45 ordered rows while preserving Tables 1-35.
