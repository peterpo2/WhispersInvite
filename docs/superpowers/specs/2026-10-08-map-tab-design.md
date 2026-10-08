# MAP Tab Design

## Goal

Add a new `MAP` tab to the staff admin (`/staff/rose-door-10`). It reproduces the organizer's
floor plan "Whispers Floor Plan — Rev D, 08.10.2026" 1:1 and makes its tables live: they can be
dragged (positions saved separately from Tables → Show map) and tapped (a closable detail panel
opens under the map). Nothing in the other tabs or pages changes.

## Source of Truth

- `docs/floor-plan/whispers-floor-plan-rev-d.html` (moved from the repo root
  `Whispers Floor Plan (Copy).html`), plus the `.md` text and `.pdf` print of the same artifact.
- The artifact is one architectural sheet: header (title, venue, totals), the SVG drawing
  (viewBox `-56 -52 849 895`, 16.60 m × 18.40 m at 1:100), a right-hand column (Key, Joining for
  6+, Rows, Minimum spend, Read before you order stools) and a footer. On screens under 860px the
  column stacks under the drawing.

## What Is Reproduced 1:1

- Right-hand column and footer: copied verbatim (same text, same structure). The sheet header (title, venue line, totals: source lines 91–96) is left out (owner decision, 08.10).
- The right-hand column (Key, Joining for 6+, Rows, Minimum spend, Read before you order stools)
  is collapsed behind a **Legend** button (owner decision, 08.10). Closed: the drawing is centred,
  up to 880px wide. Open: the original two-column layout on desktop, stacked under the map and
  detail panel on phones.
- Static drawing layers, copied verbatim: floor, wine cellar, entrance / car lift, arrival and
  arrow, 1.3 m clear route, stair core (lifts, foyer, stairs), technical, bar, bar standing, route
  to bar, DJ, dance floor, chill, drainage channel, column and clearance rings, the five "JOIN FOR
  6" brackets, dimensions, scale bar and the outer wall (drawn last, on top).
- Colours, line styles and sizes: the artifact's CSS, scoped under `.hm` so it cannot leak into
  other tabs. The admin's global `table`, `td`, `th`, `h1`, `button` rules are reset inside `.hm`.
- Fonts: Cormorant Garamond and IBM Plex Mono (both SIL OFL), self-hosted as `.ttf` in `assets/`
  because the CSP only allows `font-src 'self'`. They are registered under MAP-only family names
  (`HM Cormorant`, `HM Plex Mono`) so the other tabs keep their current fonts.

## Live Tables

- Tables are drawn by `assets/hall-plan.js` exactly as in the artifact: 63×63 occupancy square,
  four 16×16 stools, 29.4×29.4 top, number in the centre. Tables 1–7 (row A, wine wall) use the
  crimson "premium" style, as in the artifact.
- Each table is positioned by its centre, stored as a percentage of the viewBox:
  `x% = (cx + 56) / 849 × 100`, `y% = (cy + 52) / 895 × 100`.
- Seed positions = the drawing's positions for tables 1–30 (computed from the artifact, see the
  migration). Tables 31–35 exist in the database but not in the drawing: they are not drawn on
  the plan and appear in a "Not on the plan" list under the map; tapping one opens its detail.
- The "JOIN FOR 6" brackets are part of the static drawing and do not follow moved tables.

## Interaction

- Owner, admin and door drag tables (Pointer Events, pointer capture, `touch-action: none` on
  tables only, 6 CSS px threshold). Pointer coordinates are mapped into SVG units with
  `getScreenCTM().inverse()`; the centre is clamped inside the floor. Releasing after a drag saves
  automatically ("Saving…" → "Saved." or an error; on error the table returns to its last saved
  position).
- Service sees and taps tables but cannot drag (client and server both enforce it).
- A tap (movement under 6px), Enter or Space selects a table: it is outlined, the detail panel
  renders under the map and the page scrolls to it.
- Detail panel: table label, row (from the artifact's Rows table), guest count, minimum spend
  (same `€1,234` format as Tables), each assigned group with its people and a "Reserved" pill when
  the reservation is confirmed. An `×` button closes it, removes the outline and scrolls back to
  the map.
- The panel is read-only. Assigning guests stays in Tables.

## Data

- Migration `sql/2026-10-08-hall-map-positions.sql` (idempotent): adds nullable `hall_x`,
  `hall_y` (`numeric(5,2)`, `0..100`) to `staff_tables` and seeds tables 1–30 where still null.
- `map_x` / `map_y` (Show map) are untouched; MAP and Show map never move each other's tables.
- `sql/schema.sql` gains the two columns and the same seed. The owner runs the migration in
  Supabase before the code is merged.

## API

- New `functions/api/staff/hall-map.js`, added to `isPublicPath` and its test.
  - `GET` (`requireStaff(request, env, "service")`): `{ ok, tables: [{ id, label, sortOrder,
    hallX, hallY }] }`; `hallX` / `hallY` are `null` when not placed.
  - `PATCH` (`requireStaff(request, env, "door")`): body `{ tableId, hallX, hallY }`, validated by
    `validateHallPositionPayload` (finite, 0..100, table id pattern, nulls rejected); updates only
    `hall_x`, `hall_y`, `updated_at`; 404 when the table does not exist.
- `functions/api/staff/tables.js` is not modified. MAP reads guests and minimum spend from the
  existing `GET /api/staff/tables`.

## Admin Integration (the only edits to existing admin code)

- `rose-door-10.js`: a `MAP` tab right after `Tables` (`data-view="hallmap"`), the view markup from
  `functions/_shared/hall-plan-markup.js`, `'hallmap'` in `ROLE_VIEWS` for all four roles, one
  branch in `viewFromHash`, a separate `#view-hallmap:target` CSS rule, and a
  `<script defer src="/assets/hall-plan.js">` tag.
- `assets/staff-admin-fallback.js`: `'hallmap'` in its role list and `viewFromHash`.
- All MAP behaviour lives in `assets/hall-plan.js`. It loads when `#view-hallmap` becomes active
  (MutationObserver on its class, plus `hashchange`), so it works under both the main script and
  the fallback without either calling it.

## Mobile

- No page-level horizontal scroll at 320px. As in the artifact, the drawing keeps
  `min-width: 580px` inside its own `overflow-x: auto` frame, so tables stay about 43px wide
  (a usable touch target). Panning the frame works because only the tables have
  `touch-action: none`.
- Under 860px the right-hand column stacks under the drawing and the detail panel.
- `prefers-reduced-motion` turns the smooth scrolls into instant jumps.

## Verification

- Tests first: validator, `isPublicPath`, endpoint roles and columns, migration seeds (30 rows,
  t1 = 10.31 / 14.49, t30 = 83.77 / 59.54), markup (static layers present, no table rects,
  scoped CSS, fonts), asset (Pointer Events, threshold, PATCH target, close button, read-only
  role) and admin wiring (tab, roles, script, fallback).
- Regression: all existing tests, including Tables / Show map, pass unchanged except the one
  assertion that pins the exact `ROLE_VIEWS` string.
- Browser QA on a preview branch at 320px, 390px and desktop: side-by-side visual check against
  the PDF, drag + save + reload, tap + close, service read-only, Show map unchanged.
- No merge to `main` until the organizer approves the preview.
