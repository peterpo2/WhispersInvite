import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const staffPage = readFileSync("functions/staff/rose-door-10.js", "utf8");
const staffLoginPage = readFileSync("functions/_shared/staff-login-page.js", "utf8");
const staffFallback = readFileSync("assets/staff-admin-fallback.js", "utf8");
const reservationStateApi = readFileSync("functions/api/staff/reservation-state.js", "utf8");
const schema = readFileSync("sql/schema.sql", "utf8");
const tablesMigrationPath = "sql/2026-10-06-twenty-staff-tables.sql";
const tablesMigration = existsSync(tablesMigrationPath) ? readFileSync(tablesMigrationPath, "utf8") : "";
const serviceRoleMigrationPath = "sql/2026-10-06-service-staff-role.sql";
const serviceRoleMigration = existsSync(serviceRoleMigrationPath) ? readFileSync(serviceRoleMigrationPath, "utf8") : "";
const minimumSpendMigrationPath = "sql/2026-10-06-table-minimum-spend.sql";
const minimumSpendMigration = existsSync(minimumSpendMigrationPath) ? readFileSync(minimumSpendMigrationPath, "utf8") : "";
const hallMapMigrationPath = "sql/2026-10-06-thirty-five-table-map.sql";
const hallMapMigration = existsSync(hallMapMigrationPath) ? readFileSync(hallMapMigrationPath, "utf8") : "";

test("tables add-to-table panel has a broad guest search", () => {
  assert.match(staffPage, /id="tableSearch"/);
  assert.match(staffPage, /placeholder="Search all guests"/);
  assert.match(staffPage, /function groupMatchesTableSearch\(g\)/);
  assert.match(staffPage, /concat\(g\.people\|\|\[\]\)/);
  assert.match(staffPage, /No matching reservation groups\./);
});

test("staff admin includes an invite registry tab", () => {
  assert.match(staffPage, /data-view="invite"/);
  assert.match(staffPage, /id="inviteForm"/);
  assert.match(staffPage, /id="inviteSearch"/);
  assert.match(staffPage, /\/api\/staff\/invites/);
  assert.match(staffPage, /inviteLink/);
  assert.match(staffPage, /confirmationLink/);
  assert.match(staffPage, /ticketLink/);
  assert.match(staffPage, /confirmationEmailSentAt/);
  assert.match(staffPage, /function linkActionCell\(i,type,link\)/);
  assert.match(staffPage, /\/api\/staff\/invite-send/);
  assert.match(staffPage, /data-send-link-type/);
  assert.match(staffPage, /placeholder="Name"/);
  assert.doesNotMatch(staffPage, /id="inviteName" maxlength="120" placeholder="Full name"/);
  assert.match(staffPage, /placeholder="Email optional"/);
  assert.match(staffPage, /placeholder="Phone optional"/);
  assert.match(staffPage, /function inviteStatusLabel\(status\)/);
  assert.match(staffPage, /Not responded/);
  assert.match(staffPage, /function filteredInvites\(\)/);
  assert.match(staffPage, /<th>Invite<\/th><th>Confirmation<\/th><th>Ticket<\/th>/);
  assert.doesNotMatch(staffPage, /<th>Send<\/th>/);
  assert.match(staffPage, /i\.inviteLink,i\.confirmationLink,i\.ticketLink/);
  assert.match(staffPage, /inviteTypeLabel/);
  assert.match(staffPage, /i\.guestOf/);
});

test("staff admin starts with scanner and exports each operational table separately", () => {
  assert.match(staffPage, /<a class="tab active" href="#view-scanner" data-view="scanner">Scanner<\/a>/);
  assert.doesNotMatch(staffPage, /data-view="all"/);
  assert.doesNotMatch(staffPage, /id="view-all"/);
  assert.doesNotMatch(staffPage, /id="exportAll"/);
  assert.doesNotMatch(staffPage, /function loadAll\(\)/);
  assert.doesNotMatch(staffPage, /function buildAllRows\(\)/);
  assert.doesNotMatch(staffPage, /function exportAllCsv\(\)/);
  assert.match(staffPage, /function exportMembersCsv\(\)/);
  assert.match(staffPage, /function exportInvitesCsv\(\)/);
  assert.match(staffPage, /function exportTablesCsv\(\)/);
  assert.match(staffPage, /const canExport = staff\.user\.role === "owner" \|\| staff\.user\.role === "admin"/);
  assert.match(staffPage, /canExport \? '<button id="exportMembers">Export CSV<\/button>' : ''/);
  assert.match(staffPage, /canExport \? '<button id="exportInvites">Export CSV<\/button>' : ''/);
  assert.match(staffPage, /canExport \? '<button id="exportTables">Export CSV<\/button>' : ''/);
  assert.match(staffPage, /if\(exportMembersButton\)exportMembersButton\.onclick=exportMembersCsv/);
  assert.match(staffPage, /if\(exportInvitesButton\)exportInvitesButton\.onclick=exportInvitesCsv/);
  assert.match(staffPage, /if\(exportTablesButton\)exportTablesButton\.onclick=exportTablesCsv/);
  assert.match(staffPage, /ROLE_VIEWS=\{owner:\['scanner','members','tables','invite','menu','staff','settings','hallmap'\],admin:\['scanner','members','tables','invite','menu','hallmap'\],door:\['scanner','members','tables','invite','menu','hallmap'\],service:\['tables','hallmap'\]\}/);
});

test("owner, admin and door can share the public menu QR", () => {
  assert.match(staffPage, /const menuTab = '<a class="tab" href="#view-menu" data-view="menu">Menu<\/a>'/);
  assert.match(staffPage, /data-view="menu">Menu<\/a>/);
  assert.match(staffPage, /id="view-menu"/);
  assert.match(staffPage, /id="menuQr"/);
  assert.match(staffPage, /id="copyMenuLink"/);
  assert.match(staffPage, /id="shareMenuLink"/);
  assert.match(staffPage, /https:\/\/whisperssociety\.com\/menu/);
  assert.match(staffPage, /QRCode\.toCanvas/);
  assert.match(staffPage, /navigator\.share/);
  assert.match(staffPage, /owner:\['scanner','members','tables','invite','menu','staff','settings','hallmap'\]/);
  assert.match(staffPage, /admin:\['scanner','members','tables','invite','menu','hallmap'\]/);
  assert.match(staffPage, /door:\['scanner','members','tables','invite','menu','hallmap'\]/);
});

test("all staff roles can download print-ready menu QR files", () => {
  assert.match(staffPage, /id="downloadMenuSvg"/);
  assert.match(staffPage, /id="downloadMenuPng"/);
  assert.match(staffPage, /id="downloadMenuPdfA4"/);
  assert.match(staffPage, /id="downloadMenuPdfSquare"/);
  assert.match(staffPage, /jspdf@2\.5\.1\/dist\/jspdf\.umd\.min\.js/);
  assert.match(staffPage, /const PRINT_SIZE=2400/);
  assert.match(staffPage, /QRCode\.toString\(MENU_URL,\{type:'svg',margin:4,color:\{dark:'#FFFFFF',light:'#000000'\}\}/);
  assert.match(staffPage, /QRCode\.toCanvas\(MENU_URL,\{width:PRINT_SIZE,margin:4,color:\{dark:'#FFFFFF',light:'#000000'\}\}/);
  assert.match(staffPage, /QRCode\.toCanvas\(MENU_URL,\{width:320,margin:4,color:\{dark:'#FFFFFF',light:'#000000'\}\}/);
  assert.match(staffPage, /\.menu-qr\{[^}]*background:#000000[^}]*color:#FFFFFF/);
  assert.match(staffPage, /whispers-menu-qr\.svg/);
  assert.match(staffPage, /whispers-menu-qr-2400\.png/);
  assert.match(staffPage, /function downloadMenuSvg\(\)/);
  assert.match(staffPage, /function downloadMenuPng\(\)/);
  assert.match(staffPage, /function downloadMenuPdfA4\(\)/);
  assert.match(staffPage, /function downloadMenuPdfSquare\(\)/);
  assert.match(staffPage, /format:'a4'/);
  assert.match(staffPage, /format:\[200,200\]/);
  assert.match(staffPage, /setFillColor\(0,0,0\);pdf\.rect\(0,0,210,297,'F'\)/);
  assert.match(staffPage, /whispers-menu-qr-a4\.pdf/);
  assert.match(staffPage, /whispers-menu-qr-square\.pdf/);
  assert.doesNotMatch(staffPage, /function buildPrintSvg\(/);
  assert.doesNotMatch(staffPage, /function spacedText\(/);
  assert.doesNotMatch(staffPage, /whisperssociety\.com\/menu<\/text>/);
});

test("owner-only invite rows can be edited and deleted from the invite registry", () => {
  const invitesApi = readFileSync("functions/api/staff/invites.js", "utf8");

  assert.match(invitesApi, /export async function onRequestPatch/);
  assert.match(invitesApi, /export async function onRequestDelete/);
  assert.match(invitesApi, /requireStaff\(request, env, "owner"\)/);
  assert.match(invitesApi, /validateInviteUpdatePayload/);
  assert.match(invitesApi, /\/rest\/v1\/guest_list\?id=eq\.\$\{encodeURIComponent\(id\)\}/);
  assert.match(staffPage, /STAFF_USER\.role==='owner'/);
  assert.match(staffPage, /<th class="invite-owner-actions">Actions<\/th>/);
  assert.match(staffPage, /function inviteActionsCell\(i\)/);
  assert.match(staffPage, /function isEditableInviteRow\(i\)/);
  assert.match(staffPage, /!String\(i\.id\|\|''\)\.startsWith\('rsvp:'\)/);
  assert.match(staffPage, /!String\(i\.id\|\|''\)\.startsWith\('companion:'\)/);
  assert.match(staffPage, /data-invite-edit-id/);
  assert.match(staffPage, /data-invite-delete-id/);
  assert.match(staffPage, /function saveInviteEdit\(id\)/);
  assert.match(staffPage, /method:'PATCH'/);
  assert.match(staffPage, /function deleteInvite\(id\)/);
  assert.match(staffPage, /method:'DELETE'/);
});

test("staff page defines an explicit clean social preview image", () => {
  assert.match(staffPage, /<meta property="og:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-preview-logo\.png\?v=20261001-logo1"\/>/);
  assert.match(staffPage, /<meta name="twitter:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-preview-logo\.png\?v=20261001-logo1"\/>/);
  assert.doesNotMatch(staffPage, /<meta property="og:image" content="[^"]*whispers-seal\.png"/);
  assert.doesNotMatch(staffPage, /<meta property="og:image" content="[^"]*whispers-lockup-dark\.png"/);
});

test("staff login page defines the same social preview image", () => {
  assert.match(staffLoginPage, /<meta property="og:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-preview-logo\.png\?v=20261001-logo1"\/>/);
  assert.match(staffLoginPage, /<meta name="twitter:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-preview-logo\.png\?v=20261001-logo1"\/>/);
});

test("invite link columns can send their own email type", () => {
  const inviteSendApi = readFileSync("functions/api/staff/invite-send.js", "utf8");
  const invitesApi = readFileSync("functions/api/staff/invites.js", "utf8");

  assert.match(inviteSendApi, /const SEND_TYPES = new Set\(\["invite", "confirmation", "ticket"\]\)/);
  assert.match(inviteSendApi, /const type = typeof body\?\.type === "string" \? body\.type\.trim\(\) : "invite"/);
  assert.match(inviteSendApi, /buildInviteEmail/);
  assert.match(inviteSendApi, /buildRsvpConfirmationEmails/);
  assert.match(inviteSendApi, /buildTicketEmail/);
  assert.match(inviteSendApi, /retryAsync/);
  assert.match(inviteSendApi, /Could not send \$\{type\} email: \$\{String\(error\?\.message \|\| error\)\}/);
  assert.match(inviteSendApi, /id\.startsWith\("rsvp:"\)/);
  assert.match(inviteSendApi, /id\.startsWith\("companion:"\)/);
  assert.match(staffPage, /JSON\.stringify\(\{id,type\}\)/);
  assert.doesNotMatch(staffPage, /alert\(data\.error\|\|'Could not send '\+type\)/);
  assert.match(staffPage, /function setInviteNotice\(message,isError\)/);
  assert.match(staffPage, /setInviteNotice\(data\.error\|\|'Could not send '\+type,true\)/);
  assert.match(staffPage, /linkActionCell\(i,'invite',i\.inviteLink\)/);
  assert.match(staffPage, /linkActionCell\(i,'confirmation',i\.confirmationLink\)/);
  assert.match(staffPage, /linkActionCell\(i,'ticket',i\.ticketLink\)/);
  assert.match(invitesApi, /buildInviteEmail/);
  assert.match(invitesApi, /sendCreatedInviteEmail/);
  assert.match(invitesApi, /emailDelivery/);
  assert.match(invitesApi, /confirmation_email_sent_at/);
  assert.match(staffPage, /data\.emailDelivery\?\.sent/);
  assert.match(staffPage, /Invite created and sent\./);
  assert.match(staffPage, /Invite created, but email was not sent:/);
});

test("members and invite tables paginate at twenty rows per page", () => {
  assert.match(staffPage, /const PAGE_SIZE=20/);
  assert.match(staffPage, /id="membersPager"/);
  assert.match(staffPage, /id="invitesPager"/);
  assert.match(staffPage, /function pageRows\(rows,page\)/);
  assert.match(staffPage, /rows\.slice\(start,start\+PAGE_SIZE\)/);
  assert.match(staffPage, /renderPager\('membersPager',rows,membersPage/);
  assert.match(staffPage, /renderPager\('invitesPager',rows,invitesPage/);
  assert.match(staffPage, /document\.getElementById\('memberSearch'\)\.oninput=\(\)=>\{membersPage=1;renderMembers\(\);\}/);
  assert.match(staffPage, /document\.getElementById\('inviteSearch'\)\.oninput=\(\)=>\{invitesPage=1;renderInvites\(\);\}/);
});

test("staff admin navigation and controls have compact phone layouts", () => {
  assert.match(staffPage, /<a class="tab active" href="#view-scanner" data-view="scanner">Scanner<\/a>/);
  assert.match(staffPage, /<a class="tab" href="#view-members" data-view="members">Members<\/a>/);
  assert.match(staffPage, /<a id="logout" href="\/api\/staff\/logout">Logout<\/a>/);
  assert.match(staffPage, /#view-scanner:target,#view-members:target,#view-tables:target,#view-invite:target,#view-menu:target,#view-staff:target,#view-settings:target\{display:block\}/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*body\{font-size:14px;[\s\S]*calc\(118px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.top\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.staff-meta\{display:grid;grid-template-columns:auto auto/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.tabs\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.tab\{width:100%;min-height:46px;padding:0 8px;letter-spacing:\.18em;font-size:11px/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*button,input\{min-height:48px/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.actions\{grid-template-columns:1fr 1fr/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.actions #start\{grid-column:1\/-1/);
  assert.match(staffPage, /@media\(max-width:520px\)\{[\s\S]*\.manual\{grid-template-columns:1fr/);
  assert.match(staffPage, /\.invite-state:empty\{min-height:0;margin:0 0 8px\}/);
});

test("staff navigation binds before scanner setup can fail", () => {
  assert.ok(staffPage.indexOf("function showView(name)") < staffPage.indexOf("canvas.getContext"));
  assert.ok(staffPage.indexOf("showView(viewFromHash())") < staffPage.indexOf("canvas.getContext"));
  assert.ok(staffPage.indexOf("querySelectorAll('.tab')") < staffPage.indexOf("canvas.getContext"));
  assert.ok(staffPage.indexOf("getElementById('refresh')") < staffPage.indexOf("canvas.getContext"));
  assert.ok(staffPage.indexOf("getElementById('logout')") < staffPage.indexOf("canvas.getContext"));
  assert.ok(staffPage.indexOf("document.getElementById('start').onclick") < staffPage.indexOf("window.__WHISPERS_STAFF_MAIN_READY=true"));
  assert.ok(staffPage.indexOf("if(currentView==='scanner')loadList();") < staffPage.indexOf("window.__WHISPERS_STAFF_MAIN_READY=true"));
  assert.match(staffPage, /document\.addEventListener\('click',e=>\{/);
  assert.match(staffPage, /e\.target\.closest\('\.tab\[data-view\]'\)/);
  assert.match(staffPage, /e\.stopImmediatePropagation\(\);if\(tab\.dataset\.view==='tables'\)/);
  assert.match(staffPage, /showView\(tab\.dataset\.view\)/);
});

test("staff fallback keeps scanner camera and manual check usable", () => {
  assert.match(staffFallback, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(staffFallback, /getUserMedia\(\{audio:false,video:\{facingMode:\{ideal:"environment"\}/);
  assert.match(staffFallback, /byId\("start"\).*startCamera\(\)\.catch/);
  assert.match(staffFallback, /byId\("manualBtn"\).*scanValue/);
  assert.match(staffFallback, /\/api\/door/);
  assert.match(staffFallback, /window\.jsQR/);
});

test("staff fallback keeps the menu QR usable for every staff role", () => {
  assert.match(staffFallback, /owner:\["scanner","members","tables","invite","menu","staff","settings","hallmap"\]/);
  assert.match(staffFallback, /admin:\["scanner","members","tables","invite","menu","hallmap"\]/);
  assert.match(staffFallback, /door:\["scanner","members","tables","invite","menu","hallmap"\]/);
  assert.match(staffFallback, /service:\["tables","hallmap"\]/);
  assert.match(staffFallback, /function renderMenuQr\(\)/);
  assert.match(staffFallback, /byId\("copyMenuLink"\)/);
  assert.match(staffFallback, /byId\("shareMenuLink"\)/);
  assert.match(staffFallback, /navigator\.share/);
  assert.match(staffFallback, /byId\("downloadMenuSvg"\)/);
  assert.match(staffFallback, /byId\("downloadMenuPng"\)/);
  assert.match(staffFallback, /byId\("downloadMenuPdfA4"\)/);
  assert.match(staffFallback, /byId\("downloadMenuPdfSquare"\)/);
  assert.match(staffFallback, /function downloadMenuSvg\(\)/);
  assert.match(staffFallback, /function downloadMenuPng\(\)/);
  assert.match(staffFallback, /function downloadMenuPdfA4\(\)/);
  assert.match(staffFallback, /function downloadMenuPdfSquare\(\)/);
  assert.match(staffFallback, /color:\{dark:"#FFFFFF",light:"#000000"\}/);
  assert.doesNotMatch(staffFallback, /function buildPrintSvg\(/);
  assert.doesNotMatch(staffFallback, /function spacedText\(/);
});

test("staff fallback renders owner invite actions and grouped members without post-render patching", () => {
  assert.match(staffPage, /staff-admin-fallback\.js\?v=20261008-settings1/);
  assert.match(staffFallback, /function groupMembersForDisplay\(rows,q\)/);
  assert.match(staffFallback, /return groupMembersForDisplay\(members,q\)/);
  assert.match(staffFallback, /m\.holder!=="guest"\?' class="member-row-companion"':""/);
  assert.match(staffFallback, /let members=\[\],membersPage=1,invites=\[\],invitesPage=1,inviteEditId=""/);
  assert.match(staffFallback, /function inviteColspan\(\)\{return role==="owner"\?9:8;\}/);
  assert.match(staffFallback, /function inviteActionsCell\(i\)/);
  assert.match(staffFallback, /data-invite-edit-id/);
  assert.match(staffFallback, /data-invite-delete-id/);
  assert.match(staffFallback, /postJson\("\/api\/staff\/invites",payload,"PATCH"\)/);
  assert.match(staffFallback, /postJson\("\/api\/staff\/invites",\{id\},"DELETE"\)/);
  assert.doesNotMatch(staffFallback, /data-hotfix/);
  assert.doesNotMatch(staffFallback, /setInterval\(patchStaffTables/);
});

test("members table edits request, confirmation and check-in through confirmed checkboxes", () => {
  assert.match(staffPage, /data-request-id/);
  assert.match(staffPage, /function confirmToggle\(cb,message\)/);
  assert.match(staffPage, /window\.confirm\(message\)/);
  assert.match(staffPage, /cb\.checked=!cb\.checked/);
  assert.match(staffPage, /if\(!checkedIn&&!confirmToggle\(cb,'Remove this guest check-in\?'\)\)return;/);
  assert.match(staffPage, /if\(!wantsTableReservation&&!confirmToggle\(cb,'Remove table request for this group\?'\)\)return;/);
  assert.match(staffPage, /if\(!reservationConfirmed&&!confirmToggle\(cb,'Remove table reservation confirmation\?'\)\)return;/);
  assert.doesNotMatch(staffPage, /checkedIn\?'Mark this guest as inside\?':'Remove this guest check-in\?'/);
  assert.doesNotMatch(staffPage, /wantsTableReservation\?'Mark table request for this group\?':'Remove table request for this group\?'/);
  assert.doesNotMatch(staffPage, /reservationConfirmed\?'Confirm this table reservation\?':'Remove table reservation confirmation\?'/);
  assert.match(staffPage, /toggleRequest\(cb,cb\.dataset\.requestId,cb\.checked\)/);
  assert.match(staffPage, /toggleReservation\(cb,cb\.dataset\.reservationId,cb\.checked\)/);
  assert.match(staffPage, /toggleMember\(cb,cb\.dataset\.checkinId,cb\.checked\)/);
});

test("members table groups table and door status columns", () => {
  assert.match(staffPage, /<tr class="member-groups">/);
  assert.match(staffPage, /<th class="member-group" colspan="3">Table<\/th>/);
  assert.match(staffPage, /<th class="member-group" colspan="2">Door<\/th>/);
  assert.match(staffPage, /<th class="group-start" data-sort="wantsTableReservation">Request<\/th>/);
  assert.match(staffPage, /<th class="group-end" data-sort="table">Table<\/th>/);
  assert.match(staffPage, /<th class="group-start" data-sort="checkedIn">In<\/th>/);
  assert.match(staffPage, /<th class="group-end" data-sort="checkedInAt">Scanned<\/th>/);
  assert.match(staffPage, /document\.querySelectorAll\('#membersTable th\[data-sort\]'\)/);
  assert.match(staffPage, /\.member-group\{/);
  assert.match(staffPage, /td\.group-start,th\.group-start/);
});

test("members table keeps guests and their added guests together", () => {
  assert.match(staffPage, /function memberGroupKey\(m\)/);
  assert.match(staffPage, /function memberPrimaryNameKey\(m\)/);
  assert.match(staffPage, /function memberResolvedGroupKey\(m,primaryKeys\)/);
  assert.match(staffPage, /primaryKeys\.set\(memberPrimaryNameKey\(m\),memberGroupKey\(m\)\)/);
  assert.match(staffPage, /return primaryKeys\.get\(memberPrimaryNameKey\(m\)\)\|\|memberGroupKey\(m\)/);
  assert.match(staffPage, /const k=memberResolvedGroupKey\(m,primaryKeys\)/);
  assert.match(staffPage, /function groupMembersForDisplay\(rows,q\)/);
  assert.match(staffPage, /const primary=group\.find\(m=>m\.holder==='guest'\)/);
  assert.match(staffPage, /return primary\?\[primary\]\.concat\(others\):others/);
  assert.match(staffPage, /group\.some\(m=>memberMatchesSearch\(m,q\)\)/);
  assert.match(staffPage, /groupMembersForDisplay\(members,q\)/);
  assert.match(staffPage, /m\.holder!=='guest'\?' class="member-row-companion"':''/);
  assert.match(staffPage, /\.member-row-companion td/);
});

test("reservation-state endpoint can update request and confirmed separately", () => {
  assert.match(reservationStateApi, /wantsTableReservation/);
  assert.match(reservationStateApi, /wants_table_reservation/);
  assert.match(reservationStateApi, /reservationConfirmed/);
  assert.match(reservationStateApi, /reservation_confirmed/);
});

test("members CSV export is Excel-safe for UTF-8 and formula-like values", () => {
  assert.match(staffPage, /function csvSafeValue\(v\)/);
  assert.ok(staffPage.includes("return /^[=+\\-@\\\\t\\\\r]/.test(s)"));
  assert.match(staffPage, /new Blob\(\["\\uFEFF"\+rows\.map/);
  assert.match(staffPage, /'\\\\r\\\\n'/);
  assert.match(staffPage, /type:'text\/csv;charset=utf-8'/);
});

test("staff page renders login and owner staff management controls", () => {
  assert.match(staffPage, /renderStaffLoginPage/);
  assert.match(staffPage, /requireStaff/);
  assert.match(staffPage, /const STAFF_USER =/);
  assert.match(staffPage, /data-view="staff"/);
  assert.match(staffPage, /id="staffUsersTable"/);
  assert.match(staffPage, /id="newStaffUsername"/);
  assert.match(staffPage, /temporaryPassword/);
  assert.match(staffPage, /copyStaffPassword/);
  assert.match(staffPage, /resetStaffPassword/);
  assert.match(staffPage, /deleteStaffUser/);
  assert.match(staffPage, /\/api\/staff\/logout/);
  assert.doesNotMatch(staffPage, /staff email/i);
});

test("door staff can use operational views without exports or owner actions", () => {
  assert.match(staffPage, /door:\['scanner','members','tables','invite','menu','hallmap'\]/);
  assert.match(staffPage, /if\(!allowedViews\.includes\(btn\.dataset\.view\)\)btn\.hidden=true/);
  assert.match(staffPage, /if\(name==='tables'\)loadTables\(\)/);
  assert.match(staffPage, /if\(currentView==='members'\)loadMembers\(\);else if\(currentView==='tables'\)loadTables\(\)/);
  assert.match(staffPage, /STAFF_USER\.role==='owner'/);
  assert.match(staffPage, /staff\.user\.role === "owner" \? '<th class="invite-owner-actions">Actions<\/th>' : ''/);
  assert.match(staffPage, /const canExport = staff\.user\.role === "owner" \|\| staff\.user\.role === "admin"/);
});

test("service staff sees only a read-only tables view", () => {
  assert.match(staffPage, /service:\['tables','hallmap'\]/);
  assert.match(staffPage, /\.tab\[hidden\]\{display:none!important\}/);
  assert.match(staffPage, /const TABLES_READ_ONLY=STAFF_USER\.role==='service'/);
  assert.match(staffPage, /const controls=TABLES_READ_ONLY\?'':/);
  assert.match(staffPage, /current\.id&&!TABLES_READ_ONLY\?/);
  assert.match(staffFallback, /service:\["tables","hallmap"\]/);
  assert.match(staffFallback, /const tablesReadOnly=role==="service"/);
  assert.match(staffFallback, /const controls=tablesReadOnly\?"":/);
  assert.match(staffFallback, /current\.id&&!tablesReadOnly\?/);
  assert.match(staffPage, /<option value="service"/);
  assert.match(staffFallback, /<option value="service"/);
});

test("database staff role constraint accepts service", () => {
  assert.match(schema, /role in \('owner', 'admin', 'door', 'service'\)/);
  assert.match(serviceRoleMigration, /drop constraint if exists staff_users_role_check/);
  assert.match(serviceRoleMigration, /add constraint staff_users_role_check\s+check \(role in \('owner', 'admin', 'door', 'service'\)\)/);
});

test("staff tables include thirty-five unlimited defaults with a backward-compatible rollout", () => {
  assert.match(schema, /\('t35', 'Table 35', 35, 90, 91\)/);
  assert.match(tablesMigration, /\('t11', 'Table 11', 6, 11\)/);
  assert.match(tablesMigration, /\('t20', 'Table 20', 4, 20\)/);
  assert.match(tablesMigration, /on conflict \(id\) do nothing/);
  assert.doesNotMatch(schema, /capacity integer/);
  assert.doesNotMatch(hallMapMigration, /drop column if exists capacity/);
  assert.match(hallMapMigration, /information_schema\.columns/);
  assert.match(hallMapMigration, /\('t35', 'Table 35', 1, 35\)/);
  assert.match(hallMapMigration, /\('t35', 'Table 35', 35\)/);
  assert.match(hallMapMigration, /on conflict \(id\) do nothing/);
});

test("staff tables store a non-negative whole-euro minimum spend", () => {
  assert.match(schema, /minimum_spend_eur integer not null default 0 check \(minimum_spend_eur >= 0\)/);
  assert.match(minimumSpendMigration, /add column if not exists minimum_spend_eur integer/);
  assert.match(minimumSpendMigration, /set default 0/);
  assert.match(minimumSpendMigration, /set not null/);
  assert.match(minimumSpendMigration, /check \(minimum_spend_eur >= 0\)/);
});

test("table minimum spend is editable for operational staff and read-only for service", () => {
  for (const source of [staffPage, staffFallback]) {
    assert.match(source, /Minimum spend \(EUR\)/);
    assert.match(source, /type="number" min="0" step="1" inputmode="numeric"/);
    assert.match(source, /data-minimum-spend/);
    assert.match(source, /data-save-minimum-spend/);
    assert.match(source, /e\.key==='Enter'|e\.key==="Enter"/);
    assert.match(source, /spendButton\.onclick|saveButton\.onclick/);
    assert.match(source, /saveMinimumSpend/);
    assert.match(source, /method:\s*['"]PATCH['"]|postJson\("\/api\/staff\/tables",\{tableId,minimumSpendEur\},"PATCH"\)/);
    assert.match(source, /Saving\.\.\./);
    assert.match(source, /Saved\./);
    assert.match(source, /Minimum spend EUR/);
  }
  assert.ok(staffPage.includes("if(!/^\\\\d*$/.test(raw)"));
  assert.ok(staffFallback.includes("if(!/^\\d*$/.test(raw)"));
  assert.match(staffPage, /TABLES_READ_ONLY\?minimumSpendReadOnly/);
  assert.match(staffFallback, /tablesReadOnly\?minimumSpendReadOnly/);
});

test("staff tables persist normalized hall map coordinates", () => {
  assert.match(schema, /map_x numeric\(5,2\) not null default 50 check \(map_x between 0 and 100\)/);
  assert.match(schema, /map_y numeric\(5,2\) not null default 50 check \(map_y between 0 and 100\)/);
  assert.match(hallMapMigration, /add column if not exists map_x numeric\(5,2\)/);
  assert.match(hallMapMigration, /add column if not exists map_y numeric\(5,2\)/);
  assert.match(hallMapMigration, /check \(map_x between 0 and 100\)/);
  assert.match(hallMapMigration, /check \(map_y between 0 and 100\)/);
});

test("tables view provides a draggable hall map with tap navigation", () => {
  assert.match(staffPage, /id=["']toggleHallMap["']/);
  assert.match(staffPage, /id=["']hallMap["']/);
  for (const source of [staffPage, staffFallback]) {
    assert.match(source, /data-map-table/);
    assert.match(source, /MAP_DRAG_THRESHOLD=6/);
    assert.match(source, /pointerdown/);
    assert.match(source, /pointermove/);
    assert.match(source, /pointerup/);
    assert.match(source, /setPointerCapture/);
    assert.match(source, /saveTablePosition/);
    assert.match(source, /mapX/);
    assert.match(source, /mapY/);
    assert.match(source, /t\.mapX\?\?50/);
    assert.match(source, /t\.mapY\?\?50/);
    assert.match(source, /scrollIntoView/);
    assert.match(source, /Open map/);
    assert.match(source, /Close map/);
  }
  assert.match(staffPage, /TABLES_READ_ONLY/);
  assert.match(staffFallback, /tablesReadOnly/);
});

test("pressing the Tables tab returns to the complete hall overview", () => {
  for (const source of [staffPage, staffFallback]) {
    assert.match(source, /function openTablesOverview\(\)/);
    assert.match(source, /selectedTableId=null/);
    assert.match(source, /tableSearch=['"]{2}/);
    assert.match(source, /hallMapOpen=true/);
    assert.match(source, /view-tables/);
    assert.match(source, /scrollIntoView/);
  }
  assert.match(staffPage, /tab\.dataset\.view==='tables'\)\{openTablesOverview\(\);return;\}/);
  assert.match(staffFallback, /tab\.dataset\.view==="tables"/);
  assert.match(staffFallback, /openTablesOverview\(\)/);
});

test("tables main search finds people and opens their assigned table", () => {
  assert.match(staffPage, /id="tablePeopleSearch"/);
  assert.match(staffPage, /placeholder="Search people by name, email or phone"/);
  assert.match(staffPage, /id="tablePeopleResults"/);
  for (const source of [staffPage, staffFallback]) {
    assert.match(source, /function renderTablePeopleSearch\(\)/);
    assert.match(source, /peopleDetails/);
    assert.match(source, /data-table-person/);
    assert.match(source, /function openTableFromSearch\(tableId,rsvpId\)/);
    assert.match(source, /data-group-rsvp/);
    assert.match(source, /scrollIntoView/);
  }
});

test("tables shows a compact scroll-to-top button only after scrolling down", () => {
  assert.match(staffPage, /id="tablesToTop"/);
  assert.match(staffPage, /aria-label="Back to top"/);
  for (const source of [staffPage, staffFallback]) {
    assert.match(source, /function updateTablesToTop\(\)/);
    assert.match(source, /currentView===['"]tables['"]/);
    assert.match(source, /window\.scrollY>400/);
    assert.match(source, /window\.addEventListener\(['"]scroll['"],updateTablesToTop/);
    assert.match(source, /window\.scrollTo\(\{top:0/);
  }
});
