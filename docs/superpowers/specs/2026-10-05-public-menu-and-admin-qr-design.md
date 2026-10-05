# Public Menu And Admin QR Design

Date: 2026-10-05

## Goal

Add a permanent public menu URL and an internal admin surface for sharing it before the final menu content is available. The QR code must remain valid when the placeholder is later replaced with the real menu.

## Public Menu Page

- Add `GET /menu` as a public, no-store route.
- Use the existing WHISPERS dark, gold, grain, rose and vignette visual system.
- Use the existing WHISPERS logo and Aviano font assets.
- Show only restrained placeholder content:
  - `MENU`
  - `The menu will be revealed soon.`
- Do not add sample dishes, prices, categories, navigation or guest actions.
- Keep the page mobile-first, safe-area aware and free of horizontal scrolling at 320px.
- Include the existing favicon, social preview metadata, security headers and privacy-safe analytics helper used by other public pages.
- Add `/menu` to the middleware public-path allowlist. Do not expose any staff route from the public page.

## Staff Menu Tab

- Add a `Menu` tab after `Invite` in `/staff/rose-door-10`.
- Make it available only to `owner` and `admin`; `door` users must not see or open it.
- The tab contains:
  - a large QR code encoding exactly `https://whisperssociety.com/menu`;
  - the canonical URL as readable text;
  - an outlined `Copy Link` button;
  - one gold primary `Share` button.
- Generate the QR code in the browser with the QR library already used elsewhere in the project. Use a light QR surface for reliable scanning.
- `Copy Link` writes the canonical URL to the clipboard and briefly changes its label to `Copied`.
- `Share` uses `navigator.share` when available. If native sharing is unavailable, it copies the URL and reports `Link copied.` in the tab.
- If the QR library does not load, keep the readable URL and sharing controls usable and show a short local error message.
- Mirror the tab, permissions and controls in the staff fallback script so navigation remains usable if the main inline script fails.

## Data And Security

- No database table, migration or API endpoint is required.
- The public menu contains no guest data and accepts no user input.
- The QR code contains only the public canonical menu URL.
- Existing staff authentication and role checks remain unchanged. The client-side view allowlist must exclude `menu` for `door` users.
- No new external host is required, so the current CSP remains sufficient.

## Testing

- Add route allowlist tests for `/menu` and rejection of lookalike paths.
- Add source tests for the public page copy, assets, canonical metadata and analytics helper.
- Add staff UI tests for the tab, QR target, copy/share controls, fallback behavior and role visibility.
- Run the focused tests first, then `npm test`.
- Verify the public page at mobile and desktop viewport sizes and confirm the QR resolves to `/menu`.

## Later Extension

When the real menu is supplied, replace only the placeholder body of `/menu`. The route, canonical URL, QR code and staff sharing controls remain unchanged.
