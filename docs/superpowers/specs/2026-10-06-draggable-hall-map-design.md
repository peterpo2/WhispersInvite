# Draggable Hall Map Design

## Goal

Add a collapsible hall map above the existing Tables interface, expand the venue to 35 tables, and remove table capacity limits.

## Table Model

- `staff_tables` contains 35 rows, `t1` through `t35`.
- Tables have no capacity field or guest-count limit.
- Each table stores `map_x` and `map_y` as normalized percentages constrained to `0..100`.
- A dated idempotent migration adds tables 21–35, adds map coordinates, seeds useful initial positions, and removes the obsolete capacity column.
- Production migration and deployment are explicitly out of scope until the organizer approves the local preview.

## API

- `GET /api/staff/tables` returns table ID, label, sort order, minimum spend, and map coordinates.
- The existing authenticated PATCH endpoint accepts either a minimum-spend update or a map-position update.
- Map positions must be finite numbers between 0 and 100.
- Owner, admin and door may save positions. Service remains read-only.
- Assignment behavior no longer evaluates or exposes capacity.

## Hall Map

- A full-width `Open map` button appears at the top of the Tables view.
- Opening the map expands a tall, dark WHISPERS hall surface above the existing table details.
- All 35 tables are small circles with compact numbers and scale for phone and desktop layouts.
- Positions use percentages so the same saved layout is responsive.
- Owner, admin and door drag tables with Pointer Events. The dragged table uses pointer capture and `touch-action: none`.
- Releasing after a drag saves the final position automatically and reports saving or error state.
- Movement of at least 6 CSS pixels marks the gesture as a drag. A drag never triggers table navigation.
- A pointer gesture below that threshold is a tap: the map collapses, the selected table is rendered, and the page scrolls to its detail panel.
- Service can view the map and tap tables but cannot drag them.

## Existing Tables Interface

- The current table detail, assignment controls, reservation controls, minimum spend, search, and exports remain below the map.
- Capacity ratios such as `2 / 6 seats` are replaced with unlimited counts such as `2 guests`.
- CSV export removes the Capacity column and retains the guest count and minimum spend.

## Verification

- Pure helper tests cover position validation, clamping, and drag-vs-tap classification.
- Source tests cover 35 table seeds, no capacity UI/API, role protections, Pointer Events, auto-save, and scroll navigation.
- Browser QA covers owner drag/save, drag suppression, tap navigation, service read-only behavior, and phone layout.
- The final result is served locally for organizer review. No production database migration or Cloudflare deployment is performed.

