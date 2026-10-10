# Mobile Tables Modal and Ready Status Design

## Goal

Keep the existing two-column Tables experience unchanged on desktop while making table work fast
and predictable on phones. On a phone, selecting a table opens its complete detail view in a
modal instead of replacing the visible table list and forcing long page navigation.

Add an explicit, persisted ready status for each table. Saving a table marks it ready
automatically. Only the owner can manually set or clear that status.

## Scope

This change affects only the staff Tables experience, the shared table-ready state shown on MAP,
and the staff tables API/database model. It does not change table assignments, RSVP semantics,
minimum-spend rules, map positions, guest-facing pages, or desktop navigation.

## Responsive Behavior

### Desktop (`min-width: 760px`)

- Preserve the current layout: table list on the left and selected table detail on the right.
- Selecting another table updates the right-hand detail panel.
- No modal is used.

### Phone (`max-width: 759px`)

- The table list remains the primary page content and stays available after a detail is closed.
- Selecting a table opens its detail in a modal overlay.
- The modal contains the same complete table workflow as desktop:
  - table name, guest count and last-edit information;
  - minimum-spend editor or read-only value according to role;
  - ready checkbox/status;
  - Save table action when the role can edit;
  - assigned primary guests and their attached guests;
  - Called, Remove and Move controls according to existing role rules;
  - broad Members and Invites search with Add/Move actions.
- The modal has a visible close button in the top-right corner.
- The modal closes through the close button, Escape, or the backdrop. Clicks inside the panel do
  not close it.
- Opening the modal locks background scrolling. Closing it restores the previous page scroll
  position so the same portion of the table list remains visible.
- The panel accounts for iOS safe areas and its own content scrolls vertically without horizontal
  overflow at 320px.
- `Unassigned` keeps its existing collapsed mobile behavior and does not open as a table modal.

## Ready Status

Add `staff_tables.is_ready boolean not null default false`.

- The migration backfills `is_ready = true` for tables whose existing `table_map_edited_at` or
  `hall_map_edited_at` indicates they were previously saved. This preserves existing green tables.
- `Save table` persists the current table and sets `is_ready = true` automatically.
- Only the `owner` role can manually set `is_ready` to either `true` or `false` through the ready
  checkbox.
- `admin` and `door` see the checkbox as a disabled, read-only status. Their existing Save table
  action still marks the table ready.
- `service` sees the modal and ready status read-only and retains no edit actions.
- Ready tables use the existing restrained green treatment in the Tables list and on both table
  maps. Selection styling must remain legible when a ready table is selected.
- Last-edit timestamps remain independent audit information and no longer define whether a table
  is green.

## API and Authorization

`GET /api/staff/tables` includes `is_ready` and returns it as `isReady` for every table.

`PATCH /api/staff/tables` supports two relevant commands:

- `{ tableId, markEdited: true, editSurface }`: existing door-or-higher Save table operation;
  updates the appropriate edit timestamp and also sets `is_ready = true`.
- `{ tableId, isReady }`: owner-only manual ready-status operation. Non-owner requests receive
  `403` and cannot change the value.

Validation remains in pure helpers under `functions/_shared/`. Invalid IDs or non-boolean ready
values return `400`. Upstream database errors remain generic and do not expose internal details.

## Rendering and State

The existing table detail markup remains one rendering path. JavaScript applies modal semantics
only at the mobile breakpoint, avoiding a second implementation of table actions.

- `selectedTableId` remains the selected-table source of truth.
- A small mobile-only modal state determines whether the selected detail is open as an overlay.
- Reloading table data after Save, assignment, minimum-spend, Called, or ready-status changes keeps
  the currently selected table and the mobile modal open.
- Closing the mobile modal clears only its open state; it does not clear table data or alter the
  selected table's persisted state.
- The fallback staff asset mirrors the primary inline implementation.

## Error Handling

- Failed Save table or ready-status requests leave the modal open and show the existing inline
  error state.
- The checkbox is restored to its server-backed value when a manual update fails.
- Network failures do not mark a table green optimistically.
- Closing the modal never discards or changes table assignments or minimum spend.

## Accessibility

- The mobile overlay uses `role="dialog"`, `aria-modal="true"`, and a label tied to the table
  heading.
- Focus moves to the close button when opened and returns to the table button that opened it.
- The close button has an accessible name.
- The ready checkbox has a visible label and exposes its disabled state for non-owners.
- Reduced-motion users receive no animated modal transition or smooth-scroll dependency.

## Testing

- Pure tests validate ready-status payloads.
- Source/UI tests verify:
  - desktop keeps the two-column detail layout;
  - mobile table selection opens a modal with close behavior and scroll locking;
  - the modal reuses all detail, search and assignment controls;
  - owner gets an editable checkbox while other roles see it read-only;
  - Save table includes automatic ready persistence;
  - Tables, Show Map and MAP use `isReady` for green styling;
  - the fallback implementation matches the primary implementation.
- Migration tests verify the new column and preservation backfill.
- Run the complete `npm test` suite and JavaScript syntax checks before deployment.
- Apply and verify the migration before deploying code that requests `is_ready`.
- After deployment, verify public/staff shell status, protected API behavior, production database
  counts, and mobile modal rendering with a real browser viewport.
