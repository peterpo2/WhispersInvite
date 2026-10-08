# Tables Scroll-to-Top Design

## Goal

Add a compact floating control that appears only while the Tables view is active and the page has been scrolled down. Activating it returns the user to the top navigation and Tables search.

## Behaviour

- Render one icon-only, accessible button at the bottom-right of the viewport.
- Keep it hidden outside the Tables view and near the top of the page.
- Show it after the window scroll position passes 400 pixels.
- Scroll to the top of the page on activation, using smooth motion unless reduced motion is requested.
- Respect mobile safe-area insets and avoid covering the existing interface.
- Keep the Tables people search available to every role that can access Tables: owner, admin, door and service.

## Scope

The change is limited to the staff page shell, its fallback runtime and source-level UI tests. It does not change APIs, database records, permissions or table assignments.
