# Grouped Guest Rows in Tables and Maps

## Goal

Show every person in an RSVP group on a separate row while keeping the group visually and functionally joined. A primary guest and their plus-one must always appear as two adjacent rows in Tables, Show map, MAP, and their search results.

## Display

- Render one bordered group container per RSVP.
- Render the primary guest on the first row.
- Render the plus-one and any additional linked companions on following rows.
- Each row shows that person's name and available email or phone details.
- Rows share one container and use an internal divider, so they read as one group rather than separate assignments.
- Keep the existing reservation and confirmation badges at group level.

## Actions

- Keep one shared `Add`, `Move here`, or `Remove` action for the complete RSVP group.
- Never expose an action that can assign the primary guest and plus-one separately.
- Preserve the existing assignment API and RSVP grouping behavior.

## Search

- Searching by the primary guest, plus-one, companion, email, or phone returns the complete group.
- Deduplicate results by RSVP ID so the same group appears only once.
- Display every person in the matched group as adjacent rows, even when only one person matched the query.
- Preserve admin invite aliases as searchable values and as the visible primary label when applicable.

## Surfaces

- Tables table details and Add guests results.
- Tables main people search.
- MAP table details and Add guests results.
- MAP search results.

## Data and Security

- No schema or migration changes.
- No changes to RSVP, plus-one, companion, or assignment records.
- Continue escaping all guest-provided names and contact details before rendering.
- Service remains read-only; owner, admin, and door retain their current group-level actions.

## Verification

- Add source-level UI regression tests for stacked person rows on both staff runtimes and MAP.
- Verify a query matching either member of a two-person RSVP renders both rows once.
- Run the complete `npm test` suite and JavaScript syntax checks.
