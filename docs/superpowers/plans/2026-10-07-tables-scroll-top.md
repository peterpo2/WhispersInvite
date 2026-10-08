# Tables Scroll-to-Top Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tables-only floating button that appears after scrolling and returns to the top navigation and search.

**Architecture:** The staff page owns the button markup and styling. Both the primary inline runtime and fallback runtime share the same visibility rule: the active view must be Tables and `window.scrollY` must exceed 400 pixels.

**Tech Stack:** Cloudflare Pages Functions, server-rendered HTML, vanilla JavaScript, node:test.

---

### Task 1: Test the interaction contract

**Files:**
- Modify: `test/staff-admin-ui.test.js`

- [ ] Add source-level assertions for the button, accessible label, Tables-only visibility function, scroll threshold, click handler and fallback parity.
- [ ] Run `node --test test/staff-admin-ui.test.js` and confirm the new test fails before implementation.

### Task 2: Implement the control

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `assets/staff-admin-fallback.js`

- [ ] Add an icon-only button with fixed bottom-right placement, safe-area spacing and hidden state.
- [ ] Add `updateTablesToTop()` to both runtimes and call it on scroll and view changes.
- [ ] Bind the button to `window.scrollTo`, respecting `prefers-reduced-motion`.
- [ ] Keep the existing role visibility and Tables search unchanged.

### Task 3: Verify and deploy

**Files:**
- Test: `test/staff-admin-ui.test.js`

- [ ] Run the focused test and `npm test`.
- [ ] Start Wrangler locally and verify protected routes still require authentication.
- [ ] Deploy to Cloudflare Pages and smoke-test the updated public fallback asset.
