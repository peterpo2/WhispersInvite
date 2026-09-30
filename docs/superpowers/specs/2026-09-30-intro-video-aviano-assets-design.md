# Intro Video, Aviano Typography And New Brand Assets Design

Date: 2026-09-30

## Goal

Use the new WHISPERS source assets correctly across the site: the Aviano Contrast font becomes the visual type system everywhere, the new intro video preloads while the guest is on the first seal screen, and the new logo/type artwork is used without damaging quality or creating fragile browser behavior.

## Source Assets

The new source files are:

- `VECTOR_TYPE.eps`
- `video/Aviano Contrast.ttf`
- `video/Timeline2.mov`
- `video/Artboard 1.png`
- `video/Artboard 1_1.png`

The current repo path for the vector file is `C:\Popoff\Whispers-Invite\VECTOR_TYPE.eps`, not `C:\Popoff\Whispers-Invite\VECTOR\_TYPE.eps`. If a `VECTOR` folder is later added, the implementation should still treat the root `VECTOR_TYPE.eps` as the asset currently available.

## Asset Usage Rules

### Aviano Contrast

`Aviano Contrast.ttf` is the WHISPERS typeface. The design intent is: use Aviano everywhere.

This means:

- Public invitation flow uses Aviano for headings, labels, names, details, buttons and helper text.
- Confirmation page uses Aviano.
- Ticket page uses Aviano.
- Staff/admin page uses Aviano.
- Generated ticket image uses Aviano.
- Email HTML should request Aviano first in its font stack where technically possible, but email clients may ignore custom fonts. In email, Aviano is the intended brand font; fallback is allowed only as a technical email-client limitation, not as a design choice.

The current italic mood must be preserved through Aviano styling:

- Replace the old generic serif/italic feeling with Aviano-based italic-like styling where possible.
- If the font file contains no true italic face, use Aviano with subtle CSS styling (`font-style: italic` only where browser synthesis is acceptable, lighter weight, softer color, and careful spacing). Do not introduce another decorative font to recreate the old italic look.

Two Aviano text scales are required:

- Large Aviano: names, key guest-facing statements, cinematic lines and important status text.
- Small Aviano: metadata, helper text, labels, secondary details, buttons and staff/admin UI.

No new font families should be introduced. Existing fallback stacks may remain only as technical fallbacks.

### Timeline2.mov

`Timeline2.mov` is the real intro film.

Rules:

- Do not trim the video.
- Do not crop the video.
- Do not visually alter the video.
- Do not degrade quality as part of the first implementation.
- Use the file as the intro film exactly as supplied.

The video should load while the guest is still on the first seal screen. The goal is that by the time the guest holds the seal or presses Enter, the video is already ready to play.

If the guest acts too quickly and the video is not ready yet:

- The site should move into a quiet waiting state on the film screen.
- The video should begin as soon as it is playable.
- The user must not see a broken or blank page.
- The user should still have a graceful escape path if playback fails.

When the video ends:

- The site automatically advances to the Event Details screen.

### Artboard 1.png

`Artboard 1.png` is the dark WHISPERS logo/type lockup. It should be the primary web-facing lockup asset for dark WHISPERS surfaces.

Use it for:

- Brand lockup reference.
- Possible first-screen or film-screen lockup if the current separate mark + text no longer matches the updated visual system.
- Possible poster/fallback visual while the intro video is loading.

It should be optimized for web delivery only if the visual result remains identical. Do not crop or redesign the lockup.

### Artboard 1_1.png

`Artboard 1_1.png` is the light WHISPERS logo/type lockup. It should be retained as a source/reference asset and used only where a light-background WHISPERS lockup is needed.

The public site is dark-only, so this should not become the main visible brand asset unless a specific light surface requires it.

### VECTOR_TYPE.eps

`VECTOR_TYPE.eps` is the master vector/type source.

It should not be served directly to browsers. EPS is not a web runtime format and should not be added to the public allowlist as a user-facing asset.

Use it properly by:

- Keeping it as the source/master artwork.
- Using it to regenerate/export web-safe artwork when needed.
- Producing runtime assets from it, such as optimized PNG or SVG, only if those exports preserve the original artwork.

The EPS itself should remain source material, not a directly loaded page asset.

### Vector-Derived Logo System

The site should move to a higher-quality logo system derived from `VECTOR_TYPE.eps`.

Design intent:

- Use the EPS as the master source for the WHISPERS logo/type artwork.
- Export browser-safe runtime artwork from it.
- Prefer SVG for the primary runtime logo/wordmark/lockup if the export is clean, lightweight and visually faithful.
- Use high-resolution PNG if the SVG export is too heavy, visually unreliable, or contains Illustrator artifacts that do not render consistently in browsers.
- Keep the existing old logo PNG assets in the project as fallback/archive assets. Do not delete them as part of this change.

The new vector-derived artwork should become the preferred logo treatment everywhere:

- First seal screen.
- Film/poster/fallback state.
- Event Details screen.
- Identify/details screens.
- RSVP and plus-one screens.
- Confirmation and decline screens.
- Personal `/hi/<token>` status page.
- Ticket page.
- Staff/admin pages.
- Generated ticket card image, if the canvas renderer can use the exported web asset reliably.
- Email header where technically possible; email clients may fall back to the existing PNG if SVG or custom assets are not reliable.

The old `whispers-mark.png`, `whispers-seal.png`, `whispers-favicon.png` and related existing PNGs should remain available as backups. They should not be the primary visual choice once the vector-derived asset is implemented, except where technical constraints require a fallback.

Suggested runtime assets:

- `assets/whispers-logo.svg` or `assets/whispers-logo.png` for the mark.
- `assets/whispers-wordmark.svg` or `assets/whispers-wordmark.png` for the wordmark.
- `assets/whispers-lockup.svg` or `assets/whispers-lockup.png` for the combined mark + wordmark treatment.
- `assets/whispers-seal-vector.svg` or `assets/whispers-seal-vector.png` if the seal itself can be exported cleanly from the vector source.

The implementation should compare the vector-derived export against the current PNG logo treatment before replacing it. The replacement should be visibly sharper, more premium, and more consistent on high-density mobile screens.

## Public Flow Design

### First Screen: Seal

The first screen still opens on the seal/logo interaction.

While the seal screen is visible:

- The intro video element is created or present in the DOM.
- The video source is assigned immediately.
- `preload="auto"` is used.
- JavaScript explicitly calls `video.load()` on page initialization.
- A `<link rel="preload" as="video">` is added for the intro video.
- The poster/brand image can be preloaded too.

The seal can be opened in two ways:

- Hold the seal/logo long enough.
- Press the Enter action.

Both actions enter the same video gate. There should not be two separate code paths.

### Video Gate

After the seal is opened:

1. The seal performs its existing opening/cracking transition.
2. The Film screen becomes active.
3. The page checks whether the intro video is playable.
4. If playable, the video starts immediately.
5. If not playable yet, the Film screen shows a restrained loading/pending state while waiting.
6. Once playable, the video starts.
7. When the video ends, the page advances to the Event Details screen.

The video gate should listen for:

- `loadedmetadata`
- `canplay`
- `canplaythrough`
- `playing`
- `ended`
- `error`

The implementation should avoid arbitrary long waits. It should wait long enough to handle fast taps on slow networks, but if the video fails, it should not trap the guest.

### Failure And Fallback

The current scripted film sequence can remain as fallback only.

Fallback is allowed when:

- The video file cannot load.
- The browser refuses to play the video.
- The video errors.
- The user has `prefers-reduced-motion: reduce`, if we decide reduced-motion should skip video playback.

Fallback should preserve the current journey:

- The guest still reaches the Event Details screen.
- The guest is not stuck on the Film screen.
- The Skip action still works.

### Skip

The Skip action remains on the Film screen.

If the guest taps Skip:

- Stop/pause the video if it is running.
- Clear any video wait timers.
- Advance to Event Details.

## Event Details Typography And Layout

The Event Details screen should be redesigned subtly around Aviano.

Requirements:

- `When`, `Where`, `Who`, `Sound`, `Rules`, `Access`, `Dress code` labels become slightly larger than they are now.
- The right-side detail text becomes smaller and more refined than it is now.
- The layout should feel more intentional and premium, not like a default data table.
- The current two-line `When` structure stays:
  - `Saturday 10 October`
  - `Doors open at 22:00`
  - `until 3 am`
- The right-side text must remain readable on 320px mobile widths.
- Text must not overflow, collide with labels, or create horizontal scroll.
- Labels and values should both use Aviano, with different scale, tracking, color and hierarchy.

Suggested direction:

- Labels: Aviano small caps, slightly larger than current labels, gold, restrained letter spacing.
- Values: Aviano smaller than current serif values, bone/gold-muted, calm line height.
- Names/key lines elsewhere: larger Aviano with cinematic spacing.

## Asset Location And Public Access

Runtime assets should live in `assets/` with lowercase, hyphenated filenames.

Recommended runtime filenames:

- `assets/aviano-contrast.ttf`
- `assets/whispers-intro.mov`
- `assets/whispers-lockup-dark.png`
- `assets/whispers-lockup-light.png`
- `assets/whispers-logo.svg`
- `assets/whispers-wordmark.svg`
- `assets/whispers-lockup.svg`

If an optimized export is produced from `VECTOR_TYPE.eps`, use a lowercase name such as:

- `assets/whispers-type-lockup.png`
- or `assets/whispers-type-lockup.svg`

The middleware allowlist currently allows only `/assets/<lowercase-name>.png|js`. It must be expanded to allow the required asset types:

- `.ttf`
- `.mov`
- possibly `.svg` if SVG export is used

The allowlist should remain strict:

- Only lowercase asset names.
- No nested asset paths.
- No source EPS files exposed.
- No arbitrary docs, SQL, PDFs or root files exposed.

## Cloudflare And Delivery Notes

The repo root is the Pages output directory, so source files can be uploaded unless ignored or blocked.

Design intent:

- Runtime assets may be uploaded and served.
- Source files should not be served to guests.

The implementation should decide whether to:

- keep `VECTOR_TYPE.eps` and `video/` as local source files only, with `.cfignore` entries, and copy selected runtime files to `assets/`;
- or commit the source files but ensure middleware blocks them.

The preferred approach is:

- `assets/` contains only runtime-ready files.
- source files remain outside public routes.
- middleware blocks anything not explicitly allowed.

## Tests And Verification Requirements

Automated tests should cover:

- `/assets/aviano-contrast.ttf` is allowed.
- `/assets/whispers-intro.mov` is allowed.
- vector-derived logo assets in `/assets/` are allowed only with lowercase safe filenames and approved extensions.
- source files like `/VECTOR_TYPE.eps` and `/video/Timeline2.mov` are blocked if they remain outside `assets/`.
- public flow source contains the video preload.
- public flow source assigns the video `src`.
- public flow source calls `video.load()` early.
- video end advances to Event Details.
- Skip pauses/stops video and advances.
- Event Details keeps the two-line `When` structure.
- Aviano is declared and used as the primary font variable.
- the new vector-derived logo/lockup is used as the primary brand treatment where applicable.
- old logo PNGs are retained and not deleted.

Manual/browser QA should cover:

- Mobile viewport loads the seal screen.
- Vector-derived logo/lockup looks sharper than the old PNG on desktop and mobile.
- Old PNG fallback assets still exist and are not publicly exposed beyond already-approved asset routes.
- Network throttling: tap/hold seal quickly before the video has fully loaded; the Film screen waits and starts video when ready.
- Normal network: video starts immediately after seal opens.
- Video end advances automatically.
- Skip advances.
- Reduced motion behavior is acceptable.
- No console errors.
- No white flash or blank Film screen.
- No horizontal scroll at 320px.

## Non-Goals

This spec does not change:

- RSVP business logic.
- Ticket release timing.
- Database schema.
- Staff scanner behavior, except typography.
- Email content text.
- Guest list data.

This spec does not require editing or re-rendering `Timeline2.mov`.

## Implementation Planning Notes

No further product decision is needed before planning. The implementation plan should decide the exact mechanics for:

- copying/renaming runtime assets,
- updating the middleware allowlist,
- wiring early preload/load behavior,
- exporting and selecting the cleanest vector-derived logo assets,
- preserving fallback behavior,
- applying Aviano globally without breaking readability,
- and testing the flow.
