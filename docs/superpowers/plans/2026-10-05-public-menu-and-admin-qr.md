# Public Menu And Admin QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent public `/menu` placeholder and an owner/admin-only staff tab that displays, copies and shares its QR link.

**Architecture:** A new Pages Function renders the public menu page with the existing WHISPERS assets and analytics helper. The existing staff page owns the Menu tab and uses the already-approved `qrcode@1.5.1` browser library to encode one canonical URL; the fallback script mirrors navigation and sharing behavior. No database or API state is added.

**Tech Stack:** Cloudflare Pages Functions, plain HTML/CSS/JavaScript, Node `node:test`, `qrcode@1.5.1`, Playwright browser QA.

---

### Task 1: Public Menu Route

**Files:**
- Create: `functions/menu.js`
- Modify: `functions/_shared/access.js`
- Modify: `test/access.test.js`
- Modify: `test/frontend-assets.test.js`
- Modify: `test/analytics.test.js`

- [ ] **Step 1: Write failing route and page-source tests**

Add `/menu` to the allowed-path case and `/menu/`, `/menus`, and `/menu/example` to the blocked-path case in `test/access.test.js`. In the frontend tests, use `existsSync()` before `readFileSync()` so the initial red run is an assertion failure rather than a module-loading error, then assert the approved assets, copy and metadata:

```js
const menuPagePath = new URL("../functions/menu.js", import.meta.url);
const menuPage = existsSync(menuPagePath) ? readFileSync(menuPagePath, "utf8") : "";

test("public menu is a restrained WHISPERS placeholder", () => {
  assert.match(menuPage, /<title>WHISPERS Menu<\/title>/);
  assert.match(menuPage, /<link rel="canonical" href="https:\/\/whisperssociety\.com\/menu"\/>/);
  assert.match(menuPage, /<h1>Menu<\/h1>/);
  assert.match(menuPage, /The menu will be revealed soon\./);
  assert.match(menuPage, /\/assets\/whispers-lockup-transparent\.png/);
  assert.match(menuPage, /\/assets\/whispers-rose\.png/);
  assert.match(menuPage, /\/assets\/aviano-contrast\.ttf/);
  assert.doesNotMatch(menuPage, /price|starter|main course|dessert/i);
});
```

Add `menuPage` to the public social-preview and analytics source arrays.

- [ ] **Step 2: Run focused tests and confirm the intended failures**

Run:

```powershell
node --test test/access.test.js test/frontend-assets.test.js test/analytics.test.js
```

Expected: FAIL on the explicit `/menu` allowlist and non-empty menu page assertions.

- [ ] **Step 3: Allow the exact route**

Add only the exact path to `PUBLIC_PATHS` in `functions/_shared/access.js`:

```js
const PUBLIC_PATHS = new Set([
  "/",
  "/invite",
  "/menu",
  // existing routes stay unchanged
]);
```

- [ ] **Step 4: Create the public menu function**

Create `functions/menu.js` exporting `onRequestGet` and a catch-all `onRequest`. Render a no-store HTML response with:

```html
<title>WHISPERS Menu</title>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<link as="image" href="/assets/whispers-lockup-transparent.png" rel="preload"/>
<main>
  <img class="brand-lockup" src="/assets/whispers-lockup-transparent.png" alt="WHISPERS"/>
  <div class="rule" aria-hidden="true"></div>
  <h1>Menu</h1>
  <p>The menu will be revealed soon.</p>
</main>
<script src="/assets/analytics.js" defer></script>
```

Use `@font-face` for `/assets/aviano-contrast.ttf`, the existing dark/gold tokens, the rose image, grain and vignette. Bound the content width, apply safe-area padding and include `overflow-wrap:anywhere` plus a `prefers-reduced-motion` rule. Use the same 1200x630 WHISPERS preview logo metadata as other public pages. Return `405` for non-GET methods through `methodNotAllowed()`.

Include the permanent canonical link:

```html
<link rel="canonical" href="https://whisperssociety.com/menu"/>
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node --test test/access.test.js test/frontend-assets.test.js test/analytics.test.js
```

Expected: PASS.

### Task 2: Staff Menu Tab And QR Sharing

**Files:**
- Modify: `functions/staff/rose-door-10.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Write failing staff UI tests**

Add a focused test asserting the view, canonical URL, controls, QR generation and role rules:

```js
test("owner and admin can share the public menu QR", () => {
  assert.match(staffPage, /data-view="menu">Menu<\/a>/);
  assert.match(staffPage, /id="view-menu"/);
  assert.match(staffPage, /id="menuQr"/);
  assert.match(staffPage, /id="copyMenuLink"/);
  assert.match(staffPage, /id="shareMenuLink"/);
  assert.match(staffPage, /https:\/\/whisperssociety\.com\/menu/);
  assert.match(staffPage, /QRCode\.toCanvas/);
  assert.match(staffPage, /navigator\.share/);
  assert.match(staffPage, /owner:\['scanner','members','tables','invite','menu','staff'\]/);
  assert.match(staffPage, /admin:\['scanner','members','tables','invite','menu'\]/);
  assert.match(staffPage, /door:\['scanner','tables'\]/);
  assert.doesNotMatch(staffPage, /door:\[[^\]]*'menu'/);
});
```

- [ ] **Step 2: Run the focused staff test and confirm failure**

Run:

```powershell
node --test test/staff-admin-ui.test.js
```

Expected: FAIL because the Menu tab and QR controls do not exist.

- [ ] **Step 3: Add the Menu tab and responsive panel**

In `functions/staff/rose-door-10.js`:

- Add `Menu` after `Invite` in the tab navigation.
- Add `#view-menu` before `#view-staff`.
- Add `menu` to owner/admin role arrays only.
- Parse `#menu` and `#view-menu` in `viewFromHash()`.
- Include `#view-menu:target` and its scanner-hiding selector in the target CSS.

The panel markup is:

```html
<div class="view" id="view-menu">
  <section class="panel menu-panel">
    <div class="menu-qr" id="menuQr" aria-label="QR code for the public menu"></div>
    <a class="menu-url" href="https://whisperssociety.com/menu" target="_blank" rel="noopener">https://whisperssociety.com/menu</a>
    <div class="menu-actions">
      <button id="copyMenuLink" type="button">Copy Link</button>
      <button class="primary" id="shareMenuLink" type="button">Share</button>
    </div>
    <p class="invite-state" id="menuState" aria-live="polite"></p>
  </section>
</div>
```

Style `.menu-panel` as a centered unframed operational section, `.menu-qr` as a stable light 320px square with an 8px maximum border radius, and stack controls below 520px. Keep button dimensions stable while labels change.

- [ ] **Step 4: Add deterministic QR/copy/share behavior**

Load the existing approved QR library before the inline staff script:

```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
```

Add:

```js
const MENU_URL='https://whisperssociety.com/menu';
function setMenuState(message,isError){
  const state=document.getElementById('menuState');
  state.className='invite-state'+(isError?' err':'');
  state.textContent=message||'';
}
function renderMenuQr(){
  const target=document.getElementById('menuQr');
  if(target.dataset.ready==='1')return;
  target.textContent='';
  if(!window.QRCode){target.textContent=MENU_URL;setMenuState('QR code could not be loaded.',true);return;}
  QRCode.toCanvas(MENU_URL,{width:320,margin:2,color:{dark:'#0B0908',light:'#F1E9DC'}},(error,canvas)=>{
    if(error){target.textContent=MENU_URL;setMenuState('QR code could not be loaded.',true);return;}
    target.dataset.ready='1';target.appendChild(canvas);
  });
}
```

Call `renderMenuQr()` when `showView('menu')` runs. Implement `copyMenuLink()` with `navigator.clipboard.writeText(MENU_URL)` and a prompt fallback. Implement `shareMenuLink()` with `navigator.share({title:'WHISPERS Menu',url:MENU_URL})`, ignoring `AbortError`; when share is unavailable, call the copy function and set `Link copied.`.

- [ ] **Step 5: Run the focused staff tests**

Run:

```powershell
node --test test/staff-admin-ui.test.js
node --check functions/staff/rose-door-10.js
```

Expected: PASS.

### Task 3: Staff Fallback Parity

**Files:**
- Modify: `assets/staff-admin-fallback.js`
- Modify: `test/staff-admin-ui.test.js`

- [ ] **Step 1: Extend the failing fallback test**

Assert that the fallback allows `menu` only for owner/admin, renders the same QR target, and binds both controls:

```js
assert.match(staffFallback, /owner:\["scanner","members","tables","invite","menu","staff"\]/);
assert.match(staffFallback, /admin:\["scanner","members","tables","invite","menu"\]/);
assert.match(staffFallback, /function renderMenuQr\(\)/);
assert.match(staffFallback, /byId\("copyMenuLink"\)/);
assert.match(staffFallback, /byId\("shareMenuLink"\)/);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
node --test test/staff-admin-ui.test.js
```

Expected: FAIL because fallback menu behavior is absent.

- [ ] **Step 3: Mirror the menu behavior in the fallback script**

Update the fallback role arrays and hash parser. Add guarded `renderMenuQr`, copy and share functions using the same `MENU_URL`. Bind controls only when their elements exist and call QR rendering from `setView('menu')`.

- [ ] **Step 4: Run syntax and focused tests**

Run:

```powershell
node --check assets/staff-admin-fallback.js
node --test test/staff-admin-ui.test.js
```

Expected: PASS.

### Task 4: Full Verification And Deployment

**Files:**
- Verify all files changed in Tasks 1-3.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```powershell
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Start local Pages development server**

Run:

```powershell
npx wrangler pages dev . --port 8788
```

Expected: local server starts and serves Functions.

- [ ] **Step 3: Browser-check the public page**

At 390x844 and 1440x900, open `http://localhost:8788/menu` and verify:

- WHISPERS logo, `MENU`, and placeholder sentence are visible.
- No horizontal scrolling or overlapping content.
- Existing rose/grain/vignette assets render.
- Console has no page errors.

- [ ] **Step 4: Browser-check staff behavior**

Using an authenticated local owner/admin session, verify:

- Menu tab is visible for owner and admin and absent for door.
- QR canvas is nonblank and decodes to `https://whisperssociety.com/menu`.
- Copy Link and Share/fallback report success.
- Scanner, Members, Tables and Invite navigation still works.

- [ ] **Step 5: Review the scoped diff**

Run:

```powershell
git diff --check -- functions/menu.js functions/_shared/access.js functions/staff/rose-door-10.js assets/staff-admin-fallback.js test/access.test.js test/frontend-assets.test.js test/analytics.test.js test/staff-admin-ui.test.js
git status --short
```

Expected: no whitespace errors; no unrelated file has been newly modified by this feature.

- [ ] **Step 6: Deploy after verification**

Run:

```powershell
npx wrangler pages deploy . --project-name whispers-invite --branch main
```

Expected: Worker compilation and Pages deployment succeed. Do not create an implementation commit while the overlapping staff/access files contain earlier uncommitted work; report the exact deployed preview URL instead.
