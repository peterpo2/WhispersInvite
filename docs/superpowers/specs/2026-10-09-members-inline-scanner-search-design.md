# Members Inline Updates And Scanner Search

## Goal

Keep the staff member list stable while operational checkboxes are changed, and make the scanner's "Scanned tonight" list easier to use at the door.

## Members

- Check-in, table-request and reservation-confirmation checkboxes save without reloading the members table.
- The changed checkbox is disabled while its request is pending.
- A successful response updates the in-memory member data and re-renders the current page without changing the window scroll position, search query, sort or pagination.
- Request and reservation-confirmation changes update every displayed person belonging to the same RSVP group.
- Check-in changes update only the selected ticket holder and use the server-returned check-in timestamp.
- A failed request restores the checkbox state and shows a short error without replacing the table.
- Table data and the scanner list may refresh in the background when their data is affected, but the Members view must not show a loading state or jump to the top.

## Scanned Tonight

- Add a compact search field immediately above the scanned list.
- Search is case-insensitive and matches guest name, primary guest name, assigned table and seal code.
- Each scan displays its assigned table next to the guest identity when one exists.
- Primary guests, legacy plus-ones and companion rows use the table assignment of their RSVP group.
- Existing newest-first ordering and latest-scan highlight remain unchanged.

## API

- `GET /api/door` includes an optional `table` string for each scan.
- The API resolves the assignment through the existing `staff_table_assignments -> staff_tables` relationship. No migration is required.
- No ticket tokens, internal IDs or new personal data are exposed.

## Error Handling

- Checkbox failures leave the previous state intact and keep the user at the same scroll position.
- Scanner search operates on the last successfully loaded list. A failed refresh keeps the existing error behavior.
- Missing table assignments render no table label.

## Verification

- Pure `doorScans` tests cover table propagation for primary guests and plus-ones.
- Staff UI source-contract tests cover inline member updates, failure rollback, scanner search and table rendering.
- Run the complete Node test suite and mobile browser smoke tests before release.
