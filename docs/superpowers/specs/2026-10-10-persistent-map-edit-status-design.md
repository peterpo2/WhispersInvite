# Persistent Map Edit Status Design

## Goal

Make it immediately clear which table positions have been deliberately edited and saved. A saved table stays green permanently in the relevant map and exposes the date and time of its latest saved position edit.

## Scope

The staff application has two independent maps and they must keep independent edit state:

- The dedicated `MAP` tab uses `hall_x` / `hall_y` and `hall_map_edited_at`.
- `Tables -> Show map` uses `map_x` / `map_y` and `table_map_edited_at`.

Changing minimum spend, guest assignments, or any other table data does not change either map-edit timestamp.

## Persistence

Add nullable `timestamptz` columns to `staff_tables`:

- `hall_map_edited_at`
- `table_map_edited_at`

Existing tables begin with both values null, even when seeded coordinates exist. This distinguishes initial layout data from a position deliberately reviewed and saved by staff. Each map PATCH writes only its own timestamp together with its own coordinates. The API returns the server-generated timestamp after a successful save.

## User Interface

In each map, a table is green when that map's edit timestamp is non-null. The state survives reloads and is visible to every role that can view the map.

Selecting a table shows `Last edited: <local date and time>` in its detail area. If it has never been saved in that map, the detail shows `Not edited yet`. Dates are formatted in the browser using the Bulgarian locale and `Europe/Sofia` timezone.

Moving a previously saved table leaves its persisted green status visible while the draft is pending; the existing dirty-state controls continue to communicate that there are unsaved changes. `Undo`, `Save`, navigation guards, assignments, and minimum-spend editing retain their current behavior.

## API Contract

`GET /api/staff/hall-map` adds `hallMapEditedAt` to each table. A successful PATCH returns the same field.

`GET /api/staff/tables` adds `tableMapEditedAt` to each table. A successful map-position PATCH returns the same field. Minimum-spend PATCH responses remain unchanged and do not update `table_map_edited_at`.

## Failure Handling

The UI updates the green state and date only after a successful API response. Failed saves keep the current persisted status and preserve unsaved drafts under the existing behavior.

## Testing

Automated tests cover the migration and schema, independent API columns and timestamps, permanent green styles, date rendering, successful-save state updates, and both inline and fallback staff clients. The complete Node test suite and JavaScript syntax checks must pass before release.
