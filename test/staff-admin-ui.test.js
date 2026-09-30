import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const staffPage = readFileSync("functions/staff/rose-door-10.js", "utf8");
const reservationStateApi = readFileSync("functions/api/staff/reservation-state.js", "utf8");

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

test("staff page defines an explicit clean social preview image", () => {
  assert.match(staffPage, /<meta property="og:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-lockup-dark\.png"\/>/);
  assert.match(staffPage, /<meta name="twitter:image" content="https:\/\/whisperssociety\.com\/assets\/whispers-lockup-dark\.png"\/>/);
  assert.doesNotMatch(staffPage, /<meta property="og:image" content="[^"]*whispers-seal\.png"/);
});

test("invite link columns can send their own email type", () => {
  const inviteSendApi = readFileSync("functions/api/staff/invite-send.js", "utf8");

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
  assert.match(staffPage, /alert\(data\.error\|\|'Could not send '\+type\)/);
  assert.match(staffPage, /linkActionCell\(i,'invite',i\.inviteLink\)/);
  assert.match(staffPage, /linkActionCell\(i,'confirmation',i\.confirmationLink\)/);
  assert.match(staffPage, /linkActionCell\(i,'ticket',i\.ticketLink\)/);
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

test("reservation-state endpoint can update request and confirmed separately", () => {
  assert.match(reservationStateApi, /wantsTableReservation/);
  assert.match(reservationStateApi, /wants_table_reservation/);
  assert.match(reservationStateApi, /reservationConfirmed/);
  assert.match(reservationStateApi, /reservation_confirmed/);
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

test("door staff can see only scanner and tables views", () => {
  assert.match(staffPage, /door:\['scanner','tables'\]/);
  assert.match(staffPage, /if\(!allowedViews\.includes\(btn\.dataset\.view\)\)btn\.hidden=true/);
  assert.match(staffPage, /if\(name==='tables'\)loadTables\(\)/);
  assert.match(staffPage, /if\(currentView==='members'\)loadMembers\(\);else if\(currentView==='tables'\)loadTables\(\)/);
  assert.doesNotMatch(staffPage, /door:\['scanner','members'/);
  assert.doesNotMatch(staffPage, /door:\['scanner','members','tables'/);
});
