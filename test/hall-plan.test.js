import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const migration = read("sql/2026-10-08-hall-map-positions.sql");
const editStatusMigration = read("sql/2026-10-10-map-edit-status.sql");
const schema = read("sql/schema.sql");
const api = read("functions/api/staff/hall-map.js");
const markupSource = read("functions/_shared/hall-plan-markup.js");
const sourceHtml = read("docs/floor-plan/whispers-floor-plan-rev-d.html");
const sourceLines = sourceHtml.split(/\r?\n/);
const lines = (from, to) => sourceLines.slice(from - 1, to).join("\n");
const asset = read("assets/hall-plan.js");
const staffPage = read("functions/staff/rose-door-10.js");
const fallback = read("assets/staff-admin-fallback.js");

test("staff page cache-busts the combined MAP search asset", () => {
  assert.match(staffPage, /hall-plan\.js\?v=20261010-grouped-rows1/);
});

function seeds(sql) {
  return [...sql.matchAll(/\('t(\d+)', ([\d.]+), ([\d.]+)\)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
}

test("hall map migration adds separate nullable positions", () => {
  assert.match(migration, /add column if not exists hall_x numeric\(5,2\) check \(hall_x between 0 and 100\)/);
  assert.match(migration, /add column if not exists hall_y numeric\(5,2\) check \(hall_y between 0 and 100\)/);
  assert.doesNotMatch(migration, /map_x|map_y/);
  assert.match(migration, /where t\.id = v\.id and \(t\.hall_x is null or t\.hall_y is null\)/);
});

test("hall map seeds match the floor plan for tables 1-30 only", () => {
  const rows = seeds(migration);
  assert.equal(rows.length, 30);
  assert.deepEqual(rows.map((r) => r[0]), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(rows[0], [1, 10.31, 14.49]);
  assert.deepEqual(rows[15], [16, 21.68, 30.45]);
  assert.deepEqual(rows[29], [30, 83.77, 59.54]);
});

test("schema has hall positions and the same seeds", () => {
  assert.match(schema, /hall_x numeric\(5,2\) check \(hall_x between 0 and 100\)/);
  assert.match(schema, /hall_y numeric\(5,2\) check \(hall_y between 0 and 100\)/);
  assert.deepEqual(seeds(schema.slice(schema.indexOf("update public.staff_tables as t"))), seeds(migration));
});

test("map edit status migration keeps independent nullable timestamps", () => {
  assert.match(editStatusMigration, /add column if not exists hall_map_edited_at timestamptz/);
  assert.match(editStatusMigration, /add column if not exists table_map_edited_at timestamptz/);
  assert.doesNotMatch(editStatusMigration, /update public\.staff_tables/);
  assert.match(schema, /hall_map_edited_at timestamptz/);
  assert.match(schema, /table_map_edited_at timestamptz/);
});

test("hall map API reads with service and writes with door, only hall columns", () => {
  assert.match(api, /export async function onRequestGet[\s\S]*requireStaff\(request, env, "service"\)/);
  assert.match(api, /export async function onRequestPatch[\s\S]*requireStaff\(request, env, "door"\)/);
  assert.match(api, /select=id,label,sort_order,hall_x,hall_y,hall_map_edited_at&order=sort_order\.asc/);
  assert.match(api, /hallMapEditedAt: table\.hall_map_edited_at \|\| null/);
  assert.match(api, /validateHallPositionPayload\(body\)/);
  assert.match(api, /hall_map_edited_at: editedAt/);
  assert.match(api, /hallMapEditedAt: rows\[0\]\.hall_map_edited_at/);
  assert.match(api, /id=eq\.\$\{encodeURIComponent\(position\.tableId\)\}/);
  assert.doesNotMatch(api, /map_x|map_y|minimum_spend/);
  assert.match(api, /catch \{\s*return json\(\{ error: "Invalid table position" \}, 400\);/);
  assert.match(api, /return json\(\{ error: "Table not found" \}, 404\)/);
});

test("MAP fonts are self-hosted", () => {
  for (const file of ["assets/hm-ibm-plex-mono-400.ttf", "assets/hm-ibm-plex-mono-500.ttf", "assets/hm-cormorant-garamond.ttf"]) {
    assert.ok(existsSync(file), file);
  }
});

test("MAP markup copies the floor plan verbatim", async () => {
  const { renderHallPlanView } = await import("../functions/_shared/hall-plan-markup.js");
  const html = renderHallPlanView().replace(/\r\n/g, "\n");
  for (const [from, to] of [[99, 173], [384, 395], [397, 444], [446, 447]]) {
    assert.ok(html.includes(lines(from, to)), `source lines ${from}-${to}`);
  }
  // Owner decision: the sheet header (title, venue line, totals) is left out.
  assert.doesNotMatch(html, /<header>|<h1>|class="sub"|class="rev"/);
  assert.match(html, /<div class="view" id="view-hallmap">/);
  assert.match(html, /<svg id="hmPlan" viewBox="-56 -52 849 895"/);
  assert.match(html, /<g id="hmTables"><\/g>/);
  assert.match(html, /id="hmState" aria-live="polite"/);
  assert.match(html, /id="hmOffPlan" hidden/);
  assert.match(html, /<section class="hm-detail" id="hmDetail" aria-live="polite" hidden>/);
  assert.doesNotMatch(html, /class="occ"|class="stool|class="t( prem)?"|class="tn"/);
  assert.ok(html.indexOf('<g id="hmTables">') < html.indexOf('class="wall"'), "wall drawn on top of tables");
});

test("MAP right column sits behind a collapsed Legend button", async () => {
  const { renderHallPlanView } = await import("../functions/_shared/hall-plan-markup.js");
  const html = renderHallPlanView().replace(/\r\n/g, "\n");
  assert.match(html, /<button type="button" class="hm-legend-toggle" id="hmLegendToggle" aria-expanded="false" aria-controls="hmLegend">Legend<\/button>/);
  assert.match(html, /<div class="hm-legend" id="hmLegend" hidden>\n\s*<aside>/);
  assert.match(html, /<div class="cols" id="hmCols">/);
  assert.match(asset, /legendToggle\.setAttribute\('aria-expanded',String\(open\)\)/);
  assert.match(asset, /legend\.hidden=!open/);
  assert.match(asset, /cols\.classList\.toggle\('hm-legend-open',open\)/);
});

test("MAP CSS is scoped and uses MAP-only font names", async () => {
  const { HALL_PLAN_STYLE } = await import("../functions/_shared/hall-plan-markup.js");
  const rules = HALL_PLAN_STYLE.replace(/@font-face\{[^}]*\}/g, "").split("}").map((r) => r.trim()).filter(Boolean);
  for (const rule of rules) {
    const selectors = rule.split("{")[0];
    if (selectors.startsWith("@")) continue;
    for (const selector of selectors.split(",")) assert.match(selector.trim(), /^\.hm\b/, selector);
  }
  assert.match(HALL_PLAN_STYLE, /font-family:"HM Cormorant";src:url\("\/assets\/hm-cormorant-garamond\.ttf"\)/);
  assert.match(HALL_PLAN_STYLE, /font-family:"HM Plex Mono";src:url\("\/assets\/hm-ibm-plex-mono-400\.ttf"\)/);
  assert.match(HALL_PLAN_STYLE, /font-family:"HM Plex Mono";src:url\("\/assets\/hm-ibm-plex-mono-500\.ttf"\)/);
  assert.doesNotMatch(HALL_PLAN_STYLE, /fonts\.googleapis|font-family:"Cormorant Garamond"|font-family:"IBM Plex Mono"/);
  assert.match(HALL_PLAN_STYLE, /\.hm table\{min-width:0;/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.draw svg\{display:block;width:100%;height:auto;min-width:580px\}/);
  assert.match(HALL_PLAN_STYLE, /\.hm\.hm-drag \.hm-t\{touch-action:none\}/);
  assert.match(markupSource, /docs\/floor-plan\/whispers-floor-plan-rev-d\.html/);
});

test("MAP asset draws tables like the floor plan", () => {
  assert.match(asset, /const VB=\{x:-56,y:-52,w:849,h:895\}/);
  assert.match(asset, /width="63" height="63" class="occ"/);
  assert.match(asset, /width="29\.4" height="29\.4" class="t'\+p\+'"/);
  assert.match(asset, /n>=1&&n<=7\?' prem':''/);
  assert.match(asset, /class="tn" text-anchor="middle"/);
  assert.match(asset, /esc\(/);
});

test("MAP asset drags with pointer events and saves to its own API", () => {
  assert.match(asset, /const DRAG_THRESHOLD=6/);
  assert.match(asset, /setPointerCapture/);
  assert.match(asset, /addEventListener\('pointercancel'/);
  assert.match(asset, /getScreenCTM\(\)\.inverse\(\)/);
  assert.match(asset, /fetch\('\/api\/staff\/hall-map',\{method:'PATCH'/);
  assert.match(asset, /JSON\.stringify\(\{tableId:entry\.id,hallX:entry\.position\.x,hallY:entry\.position\.y\}\)/);
  assert.doesNotMatch(asset, /mapX|mapY/);
  assert.match(asset, /const CAN_DRAG=\['owner','admin','door'\]\.includes\(app\.dataset\.staffRole\)/);
  assert.match(asset, /if\(CAN_DRAG\)root\.classList\.add\('hm-drag'\)/);
});

test("MAP asset opens a closable detail panel under the map", () => {
  assert.match(asset, /fetch\('\/api\/staff\/tables'\)/);
  assert.match(asset, /class="hm-close" id="hmClose" aria-label="Close"/);
  assert.match(asset, /function closeDetail\(\)/);
  assert.match(asset, /detail\.scrollIntoView\(\{behavior:smooth\(\),block:'start'\}\)/);
  assert.match(asset, /prefers-reduced-motion: reduce/);
  assert.match(asset, /Not on the plan/);
  assert.match(asset, /'€'\+Number\(v\|\|0\)\.toLocaleString\('en-US'\)/);
});

test("MAP asset loads when its view becomes active", () => {
  assert.match(asset, /new MutationObserver/);
  assert.match(asset, /attributeFilter:\['class'\]/);
  assert.match(asset, /addEventListener\('hashchange'/);
});

test("MAP polish: hint, hover, selection, detail motion, saved fade", async () => {
  const { HALL_PLAN_STYLE, renderHallPlanView } = await import("../functions/_shared/hall-plan-markup.js");
  assert.match(renderHallPlanView(), /<div class="hm-bar"><p class="hm-hint" id="hmHint">Tap a table for details<\/p><div class="hm-tools"/);
  assert.match(asset, /hint\.textContent=CAN_DRAG\?'Drag a table to move it · tap for details':'Tap a table for details'/);
  assert.match(asset, /setTimeout\(\(\)=>\{if\(state\.textContent==='Saved\.'\)setState\(''\);\},2000\)/);
  assert.match(HALL_PLAN_STYLE, /@media \(hover:hover\)\{\.hm \.hm-t:hover \.t\{stroke:var\(--parch\)\}/);
  assert.match(HALL_PLAN_STYLE, /\.hm\.hm-drag \.hm-t\{touch-action:none\}\r?\n\.hm\.hm-drag \.hm-t \*\{cursor:grab\}/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-t\.hm-sel \.t\{[^}]*filter:drop-shadow/);
  assert.match(HALL_PLAN_STYLE, /@keyframes hm-in\{from\{opacity:0;transform:translateY\(6px\)\}\}/);
  assert.match(HALL_PLAN_STYLE, /@media \(prefers-reduced-motion:reduce\)\{\.hm \.hm-detail:not\(\[hidden\]\)\{animation:none\}\}/);
});

test("MAP draws tables in layers so numbers are never covered", () => {
  assert.match(asset, /\['occ','stools','top','num'\]\.map\(k=>'<g class="hm-layer">'/);
  assert.match(asset, /function pieces\(t\)/);
  assert.match(asset, /querySelectorAll\('\[data-hm-table="'\+CSS\.escape\(t\.id\)\+'"\]'\)/);
});

test("MAP stops a dragged table before its top overlaps another table", () => {
  assert.match(asset, /const TOP_GAP=36/);
  assert.match(asset, /function collides\(id,x,y\)/);
  assert.match(asset, /if\(collides\(drag\.t\.id,nx,ny\)\)return;/);
});

test("MAP lets owner, admin and door place off-plan tables on the map", async () => {
  assert.match(asset, /CAN_DRAG&&!placed\(t\)\?'<button type="button" class="hm-place" id="hmPlace">Place on map<\/button>':''/);
  assert.match(asset, /function freeSpot\(\)/);
  assert.match(asset, /function placeOnMap\(t\)/);
  assert.match(asset, /if\(e\.target\.closest\('#hmPlace'\)\)/);
  const { HALL_PLAN_STYLE } = await import("../functions/_shared/hall-plan-markup.js");
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-place\{/);
});

test("MAP detail lists the table's guests and lets door+ search, add and remove", async () => {
  assert.match(asset, /At this table/);
  assert.match(asset, /id="hmSearch" type="search" placeholder="Search guests by name, email or phone"/);
  assert.match(asset, /function groupMatches\(g,q\)/);
  assert.match(asset, /info\.searchPeople/);
  assert.match(asset, /function searchGroupRow\(/);
  assert.match(asset, /function groupPrimaryName\(group,matchedPerson\)/);
  assert.match(asset, /candidate\.type==='Member'/);
  assert.match(asset, /groupPrimaryName\(group,person\)/);
  assert.match(asset, /function groupPeopleRows\(g,primaryName=g\.name\)/);
  assert.match(asset, /g\.peopleDetails/);
  assert.match(asset, /class="hm-person-row"/);
  assert.match(asset, /groupPeopleRows\(g\)/);
  assert.match(asset, /tableSearchStatus/);
  assert.match(asset, /p\.email,p\.phone/);
  assert.match(asset, /const CAN_ASSIGN=CAN_DRAG/);
  assert.match(asset, /data-hm-add="'\+esc\(person\.rsvpId\)/);
  assert.match(asset, /data-hm-remove="'\+esc\(g\.rsvpId\)/);
  assert.match(asset, /'Move here':'Add'/);
  assert.match(asset, /fetch\('\/api\/staff\/table-assignment',\{method:'POST'/);
  assert.match(asset, /JSON\.stringify\(\{rsvpId:Number\(rsvpId\),tableId\}\)/);
  assert.doesNotMatch(read("functions/api/staff/table-assignment.js"), /hall/);
  assert.doesNotMatch(asset, /list\.slice\(0,30\)/);
  const { HALL_PLAN_STYLE } = await import("../functions/_shared/hall-plan-markup.js");
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-search\{/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-act\{/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-person-row\{/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-person-row\+\.hm-person-row\{/);
});

test("opening MAP keeps the staff tabs in view", () => {
  assert.match(asset, /function toTop\(\)\{requestAnimationFrame\(\(\)=>window\.scrollTo\(0,0\)\);\}/);
  assert.match(asset, /if\(active&&!wasActive\)\{load\(\);toTop\(\);\}/);
  assert.match(asset, /window\.addEventListener\('load',\(\)=>\{if\(isActive\(\)\)toTop\(\);\},\{once:true\}\)/);
});

test("admin shows a MAP tab right after Tables", () => {
  assert.match(staffPage, /data-view="tables">Tables<\/a><a class="tab" href="#view-hallmap" data-view="hallmap">MAP<\/a>/);
  assert.match(staffPage, /import \{ HALL_PLAN_STYLE, renderHallPlanView \} from "\.\.\/_shared\/hall-plan-markup\.js";/);
  assert.match(staffPage, /<\/style>\r?\n<style>#view-hallmap:target\{display:block\}main:has\(#view-hallmap:target\) #view-scanner\{display:none\}\$\{HALL_PLAN_STYLE\}<\/style>/);
  assert.match(staffPage, /\$\{renderHallPlanView\(\)\}\r?\n<div class="view" id="view-invite">/);
  assert.match(staffPage, /location\.hash==='#hallmap'\|\|location\.hash==='#view-hallmap'\?'hallmap'/);
  assert.match(staffPage, /<script defer src="\/assets\/hall-plan\.js\?v=20261010-grouped-rows1"><\/script>/);
});

test("fallback admin knows the MAP view", () => {
  assert.match(fallback, /location\.hash==="#view-hallmap"\|\|location\.hash==="#hallmap"\?"hallmap"/);
});

test("Tables embedded map is hidden without affecting the dedicated MAP tab", () => {
  assert.match(staffPage, /<div class="hall-map-toolbar" hidden>/);
  assert.match(staffPage, /id="toggleHallMap" type="button">Open map/);
  assert.match(staffPage, /<div class="hall-map-shell" id="hallMapShell" hidden>/);
  assert.match(staffPage, /data-view="hallmap">MAP<\/a>/);
  assert.doesNotMatch(staffPage.slice(staffPage.indexOf('<div class="view" id="view-tables">'), staffPage.indexOf('<div class="view" id="view-invite">')), /hm-|hallPlan|view-hallmap/);
});

test("dedicated MAP edit markers are loaded from shared persisted table state", () => {
  assert.match(api, /select=id,label,sort_order,hall_x,hall_y,hall_map_edited_at/);
  assert.match(api, /hallMapEditedAt: table\.hall_map_edited_at \|\| null/);
  assert.match(api, /id=eq\.\$\{encodeURIComponent\(position\.tableId\)\}/);
  assert.doesNotMatch(api, /staff\.user|user_id|username/);
  assert.match(asset, /fetch\('\/api\/staff\/hall-map'/);
  assert.match(asset, /t\.hallMapEditedAt\?' hm-edited'/);
});

test("MAP stages table moves and edits minimum spend", async () => {
  const { renderHallPlanView } = await import("../functions/_shared/hall-plan-markup.js");
  const markup = renderHallPlanView();
  assert.match(markup, /id="hmUndo"/);
  assert.match(markup, /id="hmSave"/);
  assert.match(asset, /WhispersMapDraft\.create/);
  assert.match(asset, /registry\.register\('hall-map'/);
  assert.match(asset, /async function saveDrafts/);
  assert.match(asset, /id="hmMinimumSpend"/);
  assert.match(asset, /\/api\/staff\/tables/);
  assert.match(asset, /minimumSpendEur/);
});

test("MAP permanently marks and dates tables saved in the dedicated map", async () => {
  const { HALL_PLAN_STYLE } = await import("../functions/_shared/hall-plan-markup.js");
  assert.match(asset, /hallMapEditedAt/);
  assert.match(asset, /hm-edited/);
  assert.match(asset, /formatMapEditedAt/);
  assert.match(asset, /Last edited:/);
  assert.match(asset, /t\.hallMapEditedAt=data\.hallMapEditedAt/);
  assert.match(asset, /id="hmSaveTable"/);
  assert.match(asset, /markEdited:true,editSurface:'hall'/);
  assert.match(asset, /saveTableStatus[\s\S]*t\.hallMapEditedAt=data\.hallMapEditedAt[\s\S]*renderTables\(\);renderDetail\(\)/);
  assert.match(asset, /setState\('Saved\.'\);renderTables\(\);renderDetail\(\)/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-t\.hm-edited \.t\{/);
  assert.match(HALL_PLAN_STYLE, /\.hm \.hm-t\.hm-edited \.tn\{/);
});
