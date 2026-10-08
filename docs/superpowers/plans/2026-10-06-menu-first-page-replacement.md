# Menu First Page Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the public menu's first image with the first page of `menu/MEN BERRTA.pdf` and add a restrained gold divider between both pages.

**Architecture:** Keep the existing `/menu` HTML and stable asset URLs. Render the supplied PDF page directly to `assets/menu-page-1.png`, then add the divider through the existing menu page CSS so the second image remains untouched.

**Tech Stack:** Cloudflare Pages Functions, HTML/CSS, PNG assets, Node test runner, PDF raster rendering.

---

### Task 1: Lock the divider behavior

**Files:**
- Modify: `test/frontend-assets.test.js`
- Modify: `functions/menu.js`

- [ ] Add an assertion that the second menu page has a one-pixel muted-gold top border.
- [ ] Run `node --test test/frontend-assets.test.js` and confirm the new assertion fails.
- [ ] Add the divider CSS to `functions/menu.js` and rerun the focused test.

### Task 2: Replace and verify the first menu page

**Files:**
- Source: `menu/MEN BERRTA.pdf`
- Modify: `assets/menu-page-1.png`

- [ ] Confirm the source PDF has a renderable first page.
- [ ] Render page one to a sharp PNG at the existing web asset width.
- [ ] Inspect the rendered image for clipping, blank output and incorrect orientation.
- [ ] Confirm `assets/menu-page-2.png` is unchanged.

### Task 3: Regression verification

- [ ] Run `npm test` and confirm the complete suite passes.
- [ ] Run `git diff --check` and confirm there are no whitespace errors.
- [ ] Do not deploy until the user explicitly requests deployment.
