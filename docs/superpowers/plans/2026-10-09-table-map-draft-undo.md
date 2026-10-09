# Table Map Draft And Undo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make table placement changes explicit drafts with five-step undo and manual save in both staff maps, add unsaved-change protection, make MAP minimum spend editable, and collapse the long Unassigned section by default on phones.

**Architecture:** Add one dependency-free browser controller that owns confirmed positions, draft positions, dirty IDs, and a five-entry move history. Both map UIs keep their existing endpoints and coordinate systems, but use the controller instead of saving on pointer-up. The staff shell owns the internal-navigation confirmation dialog and browser `beforeunload` guard through a small registry exposed by the controller asset. Minimum spend remains an independent immediate PATCH through `/api/staff/tables`.

**Tech Stack:** Cloudflare Pages Functions, plain browser JavaScript, server-rendered HTML/CSS, Node built-in `node:test`, Supabase PostgREST APIs already present in the project.

---

## Task 1: Add The Shared Draft Controller

**Files:**
- Create: `assets/map-draft.js`
- Create: `test/map-draft.test.js`
- Modify: `functions/staff/rose-door-10.js`

- [ ] Write failing unit tests that execute `assets/map-draft.js` in a `node:vm` browser-like context and verify: load/reset is clean; a completed move is dirty; no-op moves are ignored; undo restores the previous position; only the latest five moves are undoable; `confirm()` clears only successfully saved IDs; `discard()` restores every confirmed position; null/off-plan coordinates are supported.
- [ ] Run `node --test test/map-draft.test.js` and confirm it fails because the asset does not exist.
- [ ] Implement `window.WhispersMapDraft.create({ historyLimit: 5 })` with `load(entries)`, `move(id, position)`, `undo()`, `pending()`, `confirm(id, position)`, `discard()`, `position(id)`, `hasChanges()`, and `canUndo()`.
- [ ] Add a registry in the same asset for two map sources. It must expose `register(name, source)`, `hasChanges()`, `saveAll()`, and `discardAll()` without knowing any UI details.
- [ ] Load `/assets/map-draft.js` synchronously before the staff page's inline script so the controller and registry are available to the inline implementation and both deferred assets.
- [ ] Run `node --test test/map-draft.test.js` and confirm all controller tests pass.
- [ ] Commit the controller and tests with `git add assets/map-draft.js test/map-draft.test.js functions/staff/rose-door-10.js` and `git commit -m "feat: add table map draft controller"`.

## Task 2: Convert Tables Open Map To Draft, Undo, And Save

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add failing source-contract tests for both inline and fallback implementations. Require compact `Undo` and `Save` controls, no PATCH from pointer-up, registration with the shared dirty-state registry, and sequential PATCHes to `/api/staff/tables` only from the explicit save routine.
- [ ] Run `node --test test/staff-admin-ui.test.js` and confirm the new assertions fail for the missing controls and draft behavior.
- [ ] Add `Undo` and `Save` beside `Open map / Close map`; hide or disable them for `service`, and disable them whenever there is nothing to undo/save.
- [ ] On tables data load, initialize the embedded-map controller from each `{ id, mapX, mapY }`. Do not overwrite dirty drafts during an ordinary rerender.
- [ ] During drag, update only the visual/data-model draft. On pointer-up, record one completed move and never navigate to table detail when the threshold was crossed.
- [ ] Implement Undo by applying the controller's returned position and rerendering the embedded map.
- [ ] Implement Save by PATCHing dirty tables sequentially through the existing `/api/staff/tables` payload `{ tableId, mapX, mapY }`. Confirm each successful ID immediately; keep failed and unattempted items dirty; show the existing restrained status message.
- [ ] Keep drafts when `Close map` is pressed and keep Undo/Save available while changes remain.
- [ ] Register this map as `tables-map` with the shared registry, including `isDirty`, `save`, and `discard` callbacks.
- [ ] Mirror the behavior exactly in `assets/staff-admin-fallback.js` and bump its cache version.
- [ ] Run `node --test test/staff-admin-ui.test.js` and confirm it passes.
- [ ] Commit with `git add functions/staff/rose-door-10.js assets/staff-admin-fallback.js test/staff-admin-ui.test.js` and `git commit -m "feat: stage table overview map changes"`.

## Task 3: Collapse Unassigned On Mobile

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add failing tests requiring an accessible mobile-only Unassigned summary toggle, expanded desktop behavior, and automatic expansion when a people-search result selects an unassigned group.
- [ ] Run `node --test test/staff-admin-ui.test.js` and verify the new assertions fail.
- [ ] Add an `unassignedExpanded` UI state initialized from `matchMedia('(min-width: 760px)')`.
- [ ] On mobile, render the Unassigned detail as a compact summary with a chevron/toggle and keep its group list hidden by default. On desktop, preserve the current expanded detail.
- [ ] When the main people search chooses an unassigned person, set `unassignedExpanded=true` before rerendering and scrolling to the result.
- [ ] Preserve all existing assignment, reservation, search, and minimum-spend behavior.
- [ ] Mirror the implementation in the fallback and run `node --test test/staff-admin-ui.test.js`.
- [ ] Commit with `git add functions/staff/rose-door-10.js assets/staff-admin-fallback.js test/staff-admin-ui.test.js` and `git commit -m "feat: collapse unassigned tables on mobile"`.

## Task 4: Convert The MAP Tab And Add Minimum Spend Editing

**Files:**
- Modify: `functions/_shared/hall-plan-markup.js`
- Modify: `assets/hall-plan.js`
- Modify: `test/hall-plan.test.js`

- [ ] Add failing tests for MAP `Undo` and `Save` controls, shared draft registration, no immediate hall-map PATCH on pointer-up/place-on-map, the five-step controller integration, and a role-aware minimum-spend editor that PATCHes `/api/staff/tables`.
- [ ] Run `node --test test/hall-plan.test.js` and confirm failures identify the missing behavior.
- [ ] Add compact MAP toolbar controls in the existing `.hm` visual system; `service` remains read-only.
- [ ] Initialize the MAP controller from `{ id, hallX, hallY }`. Record drag completion and `Place on map` as draft moves; allow Undo to restore a table to its prior coordinate or off-plan state.
- [ ] Save dirty hall positions sequentially through `/api/staff/hall-map`, confirming successes and preserving failed/unattempted drafts exactly as in the embedded map.
- [ ] Register this map as `hall-map` with the shared registry.
- [ ] In the selected-table detail, render a whole-euro minimum-spend input and Save button for owner/admin/door. Reuse the existing validation/API contract with `{ tableId, minimumSpendEur }`; update `info.tables` only after success. Render only the current amount for service.
- [ ] Bump the MAP asset cache version and run `node --test test/hall-plan.test.js`.
- [ ] Commit with `git add functions/_shared/hall-plan-markup.js assets/hall-plan.js test/hall-plan.test.js functions/staff/rose-door-10.js` and `git commit -m "feat: add draft controls to floor plan"`.

## Task 5: Protect Unsaved Map Changes

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`
- Modify: `assets/map-draft.js`
- Modify: `test/map-draft.test.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add failing tests for registry aggregation, the native `beforeunload` guard, and a custom dialog containing `Save and leave`, `Leave without saving`, and `Cancel`.
- [ ] Run the focused tests and confirm they fail for the missing guard/dialog.
- [ ] Add one accessible modal to the staff shell, matching existing dark/gold controls and fitting 320px without horizontal overflow.
- [ ] Route internal tab changes, Tables overview reopening, Refresh, Logout, and dirty map reloads through one async guard. Continue the requested action only after a successful save or explicit discard; Cancel leaves the view and drafts unchanged.
- [ ] Use the browser-native `beforeunload` prompt only while either registered source is dirty. Do not attempt a network save inside `beforeunload`.
- [ ] Prevent hashchange recursion by restoring the active hash when navigation is cancelled.
- [ ] Keep external behavior unchanged when no map has drafts.
- [ ] Mirror the navigation guard in the fallback implementation and run `node --test test/map-draft.test.js test/staff-admin-ui.test.js`.
- [ ] Commit with `git add functions/staff/rose-door-10.js assets/staff-admin-fallback.js assets/map-draft.js test/map-draft.test.js test/staff-admin-ui.test.js` and `git commit -m "feat: guard unsaved table map changes"`.

## Task 6: Full Verification And Mobile QA

**Files:**
- Modify if needed: only files already in this plan

- [ ] Run `npm test` and require the complete suite to pass without warnings or encoding regressions.
- [ ] Start `npx wrangler pages dev .` with local variables and verify owner/admin/door/service permissions without exposing secret values.
- [ ] With Playwright, test desktop and 320px/iPhone-sized viewports: mobile Unassigned starts collapsed; search expands it; tap selects without a drag; drag does not open detail; five Undo operations work; sixth-oldest move is no longer undoable; Save persists after reload; Close map retains drafts; MAP minimum spend saves; service cannot edit or drag.
- [ ] Verify the custom navigation dialog for tab, Refresh, Logout, and map reload paths; verify native refresh/back prompt while dirty and no prompt after save/discard.
- [ ] Inspect browser console and failed network requests for both maps.
- [ ] Run `git diff --check`, `git status --short`, and a secret-oriented diff scan before any final commit.
- [ ] Do not deploy unless the user explicitly requests deployment after reviewing the result.

