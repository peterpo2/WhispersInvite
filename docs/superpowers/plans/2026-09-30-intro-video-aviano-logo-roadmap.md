# Intro Video Aviano Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use the supplied WHISPERS video, Aviano font and higher-quality logo assets across the site without breaking the invitation flow, ticket flow, staff tools, security allowlist or deploy.

**Architecture:** This project has no build step, so runtime assets must be copied into `assets/` with stable lowercase filenames and served through the existing middleware allowlist. The public invitation stays in `index.html`; ticket, personal status and staff pages stay in their Pages Functions files; canvas ticket export stays in `assets/ticket-card.js`.

**Tech Stack:** Static HTML/CSS/JS, Cloudflare Pages Functions, Node `node:test`, Supabase-backed API routes, Wrangler deploy.

---

## Phase 0: Safety Rules

- Do not commit, push or deploy until all phases and verification pass.
- Do not delete the old logo PNG assets.
- Do not edit, trim, crop, transcode or degrade `video/Timeline2.mov`.
- Do not expose `VECTOR_TYPE.eps` or source files under `/video/` as public routes.
- Keep RSVP/database/business logic unchanged.
- Keep the staff scanner route private-by-link and unlinked from public pages.

## Phase 1: Runtime Assets

**Files:**
- Copy runtime assets into `assets/`.
- Modify: `.cfignore`
- Modify: `.gitignore`

- [ ] Copy `video/Aviano Contrast.ttf` to `assets/aviano-contrast.ttf`.
- [ ] Copy `video/Timeline2.mov` to `assets/whispers-intro.mov`.
- [ ] Copy `video/Artboard 1.png` to `assets/whispers-lockup-dark.png`.
- [ ] Copy `video/Artboard 1_1.png` to `assets/whispers-lockup-light.png`.
- [ ] Because local EPS conversion tools are not installed, keep `VECTOR_TYPE.eps` as source/master and do not generate SVG in this pass.
- [ ] Add `VECTOR_TYPE.eps` and `video/` to `.cfignore` so source files are not uploaded as raw Pages output.
- [ ] Add `VECTOR_TYPE.eps` and `video/` to `.gitignore` so source/master files stay local unless explicitly requested later.
- [ ] Keep existing `assets/whispers-mark.png`, `assets/whispers-seal.png`, `assets/whispers-favicon.png` and partner logo PNGs unchanged.

**Verification:**
- [ ] `Test-Path assets/aviano-contrast.ttf` returns `True`.
- [ ] `Test-Path assets/whispers-intro.mov` returns `True`.
- [ ] `Test-Path assets/whispers-lockup-dark.png` returns `True`.
- [ ] `Test-Path assets/whispers-lockup-light.png` returns `True`.

## Phase 2: Allowlist, CSP And Tests

**Files:**
- Modify: `functions/_shared/access.js`
- Modify: `functions/_shared/security.js`
- Modify: `test/access.test.js`
- Create: `test/frontend-assets.test.js`

- [ ] Expand `ASSET_PATH_RE` from `png|js` to allow exactly `png|js|ttf|mov|svg`.
- [ ] Keep the asset regex lowercase-only and no nested paths.
- [ ] Add allowlist tests for `/assets/aviano-contrast.ttf`, `/assets/whispers-intro.mov`, `/assets/whispers-lockup-dark.png`, `/assets/whispers-lockup-light.png` and `/assets/whispers-logo.svg`.
- [ ] Add block tests for `/VECTOR_TYPE.eps`, `/video/Timeline2.mov`, uppercase extensions, nested asset paths and arbitrary root files.
- [ ] Update CSP `font-src` to allow only `'self'` for the local Aviano font.
- [ ] Keep `media-src 'self' blob:` for the local movie.
- [ ] Add source tests that verify `index.html` contains the local font face, intro video preload, intro video src, early `video.load()` call, Aviano primary CSS variable and vector/lockup asset usage.

**Verification:**
- [ ] Run `npm test`; expect all tests to pass.

## Phase 3: Public Invitation Flow

**Files:**
- Modify: `index.html`

- [ ] Add `<link rel="preload" as="font" href="/assets/aviano-contrast.ttf" type="font/ttf" crossorigin>`.
- [ ] Add `<link rel="preload" as="video" href="/assets/whispers-intro.mov" type="video/quicktime">`.
- [ ] Add `<link rel="preload" as="image" href="/assets/whispers-lockup-dark.png">`.
- [ ] Add an `@font-face` for `AvianoContrast` sourced from `/assets/aviano-contrast.ttf`.
- [ ] Make `--serif`, `--sans` and public text tokens use Aviano first, with existing fonts only as fallback.
- [ ] Replace the current separate mark + CSS wordmark brand treatment with an image lockup component where the combined lockup fits cleanly.
- [ ] Keep the old mark available for cases where a compact seal mark is still needed.
- [ ] Set `#film-video` to `src="/assets/whispers-intro.mov"`, `preload="auto"`, `muted`, `playsinline`.
- [ ] On initialization, call `filmVideo.load()` before the guest opens the seal.
- [ ] Replace the current immediate `v.play()` branch with a video gate:
  - show the film screen;
  - show a quiet loading state if `readyState < 2`;
  - start playback as soon as `canplay` or `canplaythrough` fires;
  - use a failure timer so the guest is not trapped;
  - on `ended`, advance to `#s-letter`;
  - on `error`, run the current scripted film fallback.
- [ ] Make `Skip` pause the movie, clear video listeners/timers, clear fallback timers and advance to `#s-letter`.
- [ ] Keep the existing scripted film sequence as fallback only.
- [ ] Respect reduced motion by skipping movie playback and going through the shortest acceptable fallback path.
- [ ] Redesign Event Details rows:
  - labels `When`, `Where`, `Who`, `Sound`, `Rules`, `Access`, `Dress code` slightly larger;
  - right-side values smaller and refined;
  - `When` remains stable lines: `Saturday 10 October`, `Doors open at 22:00`, and `until 3 am`;
  - no horizontal scroll at 320px.

**Verification:**
- [ ] Source tests from Phase 2 pass.
- [ ] Manual local browser: seal screen loads and video request starts before opening the seal.
- [ ] Manual local browser: if the seal is opened quickly, the Film screen waits rather than flashing blank.
- [ ] Manual local browser: video end opens Event Details.
- [ ] Manual local browser: Skip opens Event Details.

## Phase 4: Ticket, Personal Status, Staff And Canvas Branding

**Files:**
- Modify: `functions/hi/[token].js`
- Modify: `functions/ticket/[token].js`
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/ticket-card.js`

- [ ] Add local `@font-face` declarations for Aviano on server-rendered pages.
- [ ] Use Aviano first for body, labels, names, buttons, status and table/admin UI.
- [ ] Replace public-facing brand headers with the lockup asset where it fits.
- [ ] Preserve old mark PNG fallback for compact ticket/staff contexts where the full lockup would be too large.
- [ ] In `assets/ticket-card.js`, load `/assets/whispers-lockup-dark.png` for generated cards where possible.
- [ ] Keep QR generation and token logic untouched.
- [ ] Keep ticket locked/released visibility rules untouched.
- [ ] Keep scanner/admin API behavior untouched.

**Verification:**
- [ ] `npm test` passes.
- [ ] Local ticket page loads with Aviano/lockup and still hides QR/code/location while locked.
- [ ] Staff page loads with Aviano and remains usable at mobile width.

## Phase 5: Email Font/Logo Treatment

**Files:**
- Modify: `functions/_shared/email-content.js`

- [ ] Keep email copy unchanged.
- [ ] Keep buttons and links functional.
- [ ] Use the lockup image for email brand header only if it is safer than the current mark in email clients.
- [ ] Put Aviano first in inline font stacks where email clients may honor it.
- [ ] Keep Georgia/Arial fallback because email clients often block custom fonts.

**Verification:**
- [ ] Source inspection confirms email links remain buttons/anchors, not raw broken text.
- [ ] No raw EPS/video/source path appears in email HTML.

## Phase 6: Full Verification

- [ ] Run `npm test`.
- [ ] Run `npx wrangler pages dev .` and verify the local site.
- [ ] Check desktop viewport.
- [ ] Check mobile 390px viewport.
- [ ] Check mobile 320px viewport.
- [ ] Check there is no horizontal scroll.
- [ ] Check browser console for errors.
- [ ] Check `/assets/aviano-contrast.ttf`, `/assets/whispers-intro.mov`, `/assets/whispers-lockup-dark.png` return 200 locally.
- [ ] Check `/VECTOR_TYPE.eps` and `/video/Timeline2.mov` return blocked/404 locally.
- [ ] Check git status and stage only intended files.

## Phase 7: Final Commit, Push And Deploy

- [ ] Commit all intended implementation files in one final commit.
- [ ] Push `main`.
- [ ] Deploy with `npx wrangler pages deploy . --project-name whispers-invite --branch main`.
- [ ] Verify production `https://whisperssociety.com/` returns 200.
- [ ] Verify production public page loads without console-breaking asset failures.
- [ ] Verify production source does not expose `/VECTOR_TYPE.eps` or `/video/Timeline2.mov`.
