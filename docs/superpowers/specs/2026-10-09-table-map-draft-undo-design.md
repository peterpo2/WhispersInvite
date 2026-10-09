# Tables and MAP Draft Movement Design

## Goal

Improve table management on phones and make table-position editing recoverable in both staff maps without changing guest assignments or the existing database model.

The feature has four parts:

1. Collapse the `Unassigned` detail by default on phone-sized Tables views.
2. Edit a selected table's minimum spend from the MAP tab.
3. Stage table movements locally in both maps until the user presses `Save`.
4. Support five-step undo and protect staged changes when the user leaves a view.

## Scope

The two maps remain independent:

- Tables -> `Open map` edits `staff_tables.map_x` and `staff_tables.map_y` through `/api/staff/tables`.
- The MAP tab edits `staff_tables.hall_x` and `staff_tables.hall_y` through `/api/staff/hall-map`.

No migration or new database columns are required. Guest assignment changes keep their existing immediate-save behavior and are not part of map undo history.

## Mobile Unassigned Section

On viewports up to 759 px, the `Unassigned` detail in Tables is collapsed by default. Its collapsed header shows the title and number of waiting groups, followed immediately by the table list. Tapping the header expands or collapses the existing unassigned group controls.

On wider viewports, `Unassigned` remains expanded by default. Selecting an unassigned person from the main Tables search automatically expands the section on every viewport so the selected result is visible.

The collapse state is presentation state only. It does not change assignments or API data.

## Minimum Spend in MAP

Selecting a table in the MAP tab adds the existing minimum-spend editor to its detail panel:

- Owner, Admin and Door may enter a non-negative whole-euro amount and save it.
- Service sees the amount read-only.
- Validation and persistence use the existing `PATCH /api/staff/tables` contract.
- The minimum-spend editor has its own `Save` action and is independent from position drafts, Undo and the map-level Save button.

## Position Drafts and Undo

Each map owns a separate in-memory draft controller. It tracks:

- The last server-confirmed position for each table.
- The current displayed draft position.
- The set of tables whose draft differs from the confirmed position.
- A movement history containing at most the five latest completed drags or placements.

A completed drag changes only the local draft. It does not call the API. One completed drag is one history entry, even if it moves a table that was moved earlier. Clicking or tapping a table without dragging does not create history.

`Undo` restores the position before the latest completed movement and removes that history entry. Undo may remove a table from the dirty set when it returns to its confirmed position. The button is disabled when history is empty.

MAP's `Place on map` action follows the same rules: placement is a local movement and can be undone back to `Not on the plan` before saving.

History is cleared after all currently dirty positions have been saved or explicitly discarded. A maximum of five entries is retained; the oldest entry is dropped when a sixth movement is completed.

## Save Behavior

Each map has a compact `Undo` and `Save` control group near its existing map controls. Both controls use the existing staff visual language and remain stable on phone layouts.

`Save` is disabled when no positions are dirty. When pressed, it sends the final position for each dirty table through that map's existing PATCH endpoint. Requests are performed sequentially so the UI can account for each result.

For each successful request, the returned position becomes that table's confirmed position. If all requests succeed, the dirty set and history are cleared and the map reports `Saved.`

If a request fails:

- Already successful requests remain confirmed and are removed from the dirty set.
- The failed table and any requests not yet attempted remain dirty.
- The map stays open and displays a restrained error message.
- `Save and leave` does not navigate away.

Closing the embedded Tables map does not discard drafts. Its Undo and Save controls remain visible while changes are pending so the state cannot become hidden.

## Leaving With Unsaved Positions

Internal staff navigation is intercepted whenever the active map has dirty positions. A WHISPERS-styled confirmation dialog offers:

- `Save and leave`: save pending positions, then navigate only if all saves succeed.
- `Leave without saving`: restore confirmed positions, clear history and navigate.
- `Cancel`: close the dialog and remain in the current view.

The dialog also protects logout and other same-page staff navigation that would replace the active view.

For browser refresh, Back, closing the tab or closing the browser, a standard `beforeunload` warning is registered only while either map is dirty. Browsers control this warning's wording. Internal navigation uses the custom three-action dialog because browser-native prompts cannot provide those three choices.

## Roles

- Owner, Admin and Door can move and save positions in both maps and edit minimum spend.
- Service remains read-only: no movement drafts, Undo, position Save or editable minimum-spend input.
- Read-only users continue to select tables and inspect guests and amounts.

## Error Handling

Network and API failures do not silently discard drafts. Buttons are disabled while a save is in progress, duplicate save attempts are ignored, and the user receives a short message without upstream details.

If fresh map data is reloaded while drafts exist, the reload is treated as leaving the draft state and uses the same save/discard/cancel decision instead of overwriting local edits.

## Testing

Automated source and pure-logic tests will cover:

- Mobile-only default collapse and automatic expansion after an unassigned search result.
- Five-entry movement history and restoration order.
- Dirty-state removal when Undo reaches the confirmed position.
- Independent draft state for the Tables map and MAP tab.
- No PATCH during drag; PATCH requests only on Save.
- Partial-save accounting and retry state.
- Role restrictions for movement and minimum spend.
- Internal navigation interception and `beforeunload` registration.
- MAP minimum-spend validation and the existing API contract.

Manual Playwright QA will cover owner and service roles on desktop and iPhone-sized viewports, including drag versus tap, five-step Undo, Save, failed-navigation protection, the custom leave dialog, and absence of horizontal page overflow.
