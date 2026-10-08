import { renderStaffLoginPage } from "../_shared/staff-login-page.js";
import { requireStaff } from "../_shared/staff-auth.js";
import { HALL_PLAN_STYLE, renderHallPlanView } from "../_shared/hall-plan-markup.js";

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env, "service");
  if (staff.error) return renderStaffLoginPage();
  const canExport = staff.user.role === "owner" || staff.user.role === "admin";
  const membersExportButton = canExport ? '<button id="exportMembers">Export CSV</button>' : '';
  const invitesExportButton = canExport ? '<button id="exportInvites">Export CSV</button>' : '';
  const tablesExportButton = canExport ? '<button id="exportTables">Export CSV</button>' : '';
  const menuTab = '<a class="tab" href="#view-menu" data-view="menu">Menu</a>';
  const settingsTab = staff.user.role === "owner" ? '<a class="tab" href="#view-settings" data-view="settings">Settings</a>' : '';
  const settingsView = staff.user.role === "owner" ? `<div class="view" id="view-settings">
<section class="panel settings-panel">
<div class="k">RSVP access</div><p class="small settings-intro">Control new confirmations and later detail changes independently. Ticket release stays independent.</p>
<div class="settings-control">
<div class="settings-heading"><div><h2>New confirmations</h2><p class="small">Allow or stop guests who have not confirmed yet.</p></div><strong class="settings-status" id="confirmationSettingsStatus">Loading</strong></div>
<div class="settings-schedule" id="confirmationScheduledChange" hidden></div>
<label class="settings-field" for="confirmationChangeAt"><span>Optional automatic change</span><input id="confirmationChangeAt" type="datetime-local" aria-describedby="confirmationTimezone"/></label>
<p class="small settings-timezone" id="confirmationTimezone">Date and time use Europe/Sofia. Leave empty to apply immediately.</p>
<div class="settings-actions"><button class="primary" id="applyConfirmationSetting" type="button" disabled>Save</button><button id="cancelConfirmationSchedule" type="button" hidden>Cancel scheduled change</button></div>
<p class="invite-state" id="confirmationSettingsState" aria-live="polite"></p>
</div>
<div class="settings-control">
<div class="settings-heading"><div><h2>Update details</h2><p class="small">Allow or stop changes to an existing confirmation.</p></div><strong class="settings-status" id="updatesSettingsStatus">Loading</strong></div>
<div class="settings-schedule" id="updatesScheduledChange" hidden></div>
<label class="settings-field" for="updatesChangeAt"><span>Optional automatic change</span><input id="updatesChangeAt" type="datetime-local" aria-describedby="updatesTimezone"/></label>
<p class="small settings-timezone" id="updatesTimezone">Date and time use Europe/Sofia. Leave empty to apply immediately.</p>
<div class="settings-actions"><button class="primary" id="applyUpdatesSetting" type="button" disabled>Save</button><button id="cancelUpdatesSchedule" type="button" hidden>Cancel scheduled change</button></div>
<p class="invite-state" id="updatesSettingsState" aria-live="polite"></p>
</div>
</section>
</div>` : '';
  const menuView = `<div class="view" id="view-menu">
<section class="panel menu-panel">
<div class="menu-qr" id="menuQr" aria-label="QR code for the public menu"></div>
<a class="menu-url" href="https://whisperssociety.com/menu" target="_blank" rel="noopener">https://whisperssociety.com/menu</a>
<div class="menu-actions"><button id="copyMenuLink" type="button">Copy Link</button><button class="primary" id="shareMenuLink" type="button">Share</button><button id="downloadMenuSvg" type="button">Download SVG</button><button id="downloadMenuPng" type="button">Download PNG</button><button id="downloadMenuPdfA4" type="button">Download PDF A4</button><button id="downloadMenuPdfSquare" type="button">Download PDF Square</button></div>
<p class="invite-state" id="menuState" aria-live="polite"></p>
</section>
</div>`;
  const menuQrScript = '<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script><script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>';

  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<title>WHISPERS Door</title>
<meta property="og:title" content="WHISPERS Door"/>
<meta property="og:type" content="website"/>
<meta property="og:image" content="https://whisperssociety.com/assets/whispers-preview-logo.png?v=20261001-logo1"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="WHISPERS Door"/>
<meta name="twitter:image" content="https://whisperssociety.com/assets/whispers-preview-logo.png?v=20261001-logo1"/>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<link href="/assets/whispers-favicon.png" rel="apple-touch-icon"/>
<style>
:root{--bg:#070605;--gold:#D9AE78;--gold-hi:#EBCB95;--red:#A31621;--bone:#EDE6DA;--muted:#B4A99D;--line:rgba(217,174,120,.24);--serif:'Cormorant Garamond',Cambria,Georgia,serif;--sans:'Jost','Helvetica Neue',Arial,sans-serif;color-scheme:dark}
*{box-sizing:border-box}html{background:var(--bg)}
body{margin:0;min-height:100vh;min-height:100dvh;background:radial-gradient(70% 40% at 50% -6%,rgba(217,174,120,.09),transparent 62%),radial-gradient(120% 60% at 50% 112%,rgba(90,11,19,.32),transparent 64%),linear-gradient(180deg,#0A0807,#070605 55%,#060404);color:var(--bone);font-family:var(--sans);font-weight:300;font-size:16px;padding:calc(16px + env(safe-area-inset-top)) max(16px,env(safe-area-inset-right),env(safe-area-inset-left)) calc(20px + env(safe-area-inset-bottom))}
body:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:url("/assets/whispers-rose.png") 84% 36%/min(76vw,760px) auto no-repeat;opacity:.08;filter:blur(1px) saturate(1.05)}
body:after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 48%,rgba(0,0,0,.48) 100%)}
.grain{position:fixed;inset:-50%;z-index:0;pointer-events:none;opacity:.035;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>");animation:grain 1.1s steps(3) infinite}@keyframes grain{0%{transform:translate(0,0)}33%{transform:translate(-3%,2%)}66%{transform:translate(2%,-3%)}100%{transform:translate(0,0)}}@media (prefers-reduced-motion:reduce){.grain{animation:none}}
main{position:relative;z-index:1;max-width:min(1280px,calc(100vw - 32px));margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 16px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:12px;min-width:0}.brand img{width:112px;height:auto;flex:0 0 112px;filter:drop-shadow(0 0 16px rgba(163,22,33,.3))}
.staff-meta{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.staff-who{color:var(--muted);font-size:12px;letter-spacing:.14em;text-transform:uppercase}.staff-who b{color:var(--bone);font-weight:400}.staff-meta button,.staff-meta a{min-height:40px;padding:0 10px;font-size:11px;letter-spacing:.14em;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.k{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold)}h1{font-family:var(--serif);font-weight:300;font-size:32px;line-height:1.05;margin:2px 0 0}
.panel{padding:16px 0;margin:0;border-bottom:1px solid var(--line)}
.camera{position:relative;aspect-ratio:3/4;max-height:64svh;width:100%;background:#000;overflow:hidden;display:grid;place-items:center;padding:0;border:1px solid rgba(217,174,120,.4);border-radius:3px;margin-bottom:4px}
.camera video{width:100%;height:100%;object-fit:cover}
.camera:before,.camera:after{content:"";position:absolute;z-index:1;width:26px;height:26px;border:solid var(--gold);pointer-events:none}.camera:before{top:12px;left:12px;border-width:2px 0 0 2px}.camera:after{bottom:12px;right:12px;border-width:0 2px 2px 0}
.scanline{position:absolute;left:8%;right:8%;height:1px;background:var(--gold);box-shadow:0 0 18px var(--gold);animation:sweep 2.2s ease-in-out infinite}@keyframes sweep{0%,100%{top:18%}50%{top:82%}}
@media(min-width:640px){.camera{aspect-ratio:4/3;max-height:60svh}}
@media(min-width:1024px){.camera{aspect-ratio:16/9;max-height:58svh}}
@media (prefers-reduced-motion:reduce){.scanline{animation:none;top:50%}}
.actions{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:8px}.actions button{padding:0 8px;letter-spacing:.16em}button[disabled]{opacity:.4;cursor:default}
button,input,.tabs .tab,.staff-meta a{min-height:54px;border:1px solid rgba(217,174,120,.58);border-radius:3px;background:rgba(8,6,5,.4);color:var(--bone);padding:0 14px;font:400 13px var(--sans);letter-spacing:.26em;text-transform:uppercase;cursor:pointer}
button.primary{color:#1C130A;border-color:#E6C48C;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%)}
button:focus-visible,input:focus-visible,.tabs .tab:focus-visible{outline:1px solid var(--gold);outline-offset:2px}
.manual{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:10px}.manual input{text-transform:none;letter-spacing:0;font:400 18px var(--serif);min-width:0;cursor:text}
.result{min-height:112px}.result h2{font-family:var(--serif);font-weight:300;font-size:40px;line-height:1.05;margin:0 0 8px}.result p{color:#D8CEC2;font-size:18px;line-height:1.45;margin:4px 0}.result b{font-family:var(--serif);font-weight:400;font-size:26px;color:#F6EFE4}
.ok h2{color:var(--gold-hi)}.bad h2{color:#FF9F9F}
.warn{background:rgba(163,22,33,.18);border:1px solid var(--red);border-radius:3px;padding:16px;margin:12px 0}.warn h2{color:#E8808A}.warn p{color:var(--bone)}
.list{display:grid;margin-top:8px}.row.latest{background:rgba(217,174,120,.1);box-shadow:-10px 0 0 rgba(217,174,120,.1),10px 0 0 rgba(217,174,120,.1);animation:latest 1.2s ease}@keyframes latest{from{background:rgba(217,174,120,.32)}}.row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-top:1px solid rgba(217,174,120,.14);padding:12px 0}.row:first-child{border-top:0}.row b{font-family:var(--serif);font-weight:400;font-size:21px;min-width:0;overflow-wrap:anywhere}.row b small{display:block;font:300 13px var(--sans);color:var(--muted);margin-top:2px}.row span{color:var(--muted);font-size:13px;text-align:right;white-space:nowrap}
.small{color:var(--muted);font-size:14px;line-height:1.55;margin:12px 0 0}
.tabs{display:flex;gap:8px;overflow:auto;margin:0 0 14px;padding-bottom:2px}.tab{width:auto;min-width:0;min-height:44px;padding:0 12px;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}.tab[hidden]{display:none!important}.tab.active{color:#1C130A;border-color:#E6C48C;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%)}
.view{display:none}.view.active{display:block}#view-scanner:target,#view-members:target,#view-tables:target,#view-invite:target,#view-menu:target,#view-staff:target,#view-settings:target{display:block}main:has(#view-members:target) #view-scanner,main:has(#view-tables:target) #view-scanner,main:has(#view-invite:target) #view-scanner,main:has(#view-menu:target) #view-scanner,main:has(#view-staff:target) #view-scanner,main:has(#view-settings:target) #view-scanner{display:none}.toolbar{display:flex;gap:8px;align-items:center;margin:0 0 12px}.toolbar input{width:100%;text-transform:none;letter-spacing:0;font:400 16px var(--sans);cursor:text}.toolbar button{flex:0 0 142px;white-space:nowrap;letter-spacing:.16em}.toolbar-label{width:100%;color:var(--muted);font-size:14px;line-height:1.5}.grid{overflow:auto;border:1px solid var(--line);border-radius:3px;background:rgba(8,6,5,.2)}.pager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:10px 12px;border:1px solid rgba(217,174,120,.18);border-radius:3px;background:linear-gradient(90deg,rgba(217,174,120,.06),rgba(8,6,5,.18))}.pager-info{color:var(--muted);font-size:13px}.pager-buttons{display:flex;gap:8px}.pager button{min-height:38px;padding:0 10px;font-size:11px;letter-spacing:.14em}table{width:100%;border-collapse:collapse;min-width:1160px}th,td{text-align:left;border:1px solid rgba(217,174,120,.18);padding:11px 9px;font-size:13px;vertical-align:middle}th{position:sticky;top:0;background:#0D0A08;color:var(--gold);font-weight:400;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;z-index:1}td{color:#E7DED4;background:rgba(8,6,5,.18)}.member-groups th{height:38px}.member-head th{top:38px}.member-group,.member-group-spacer{cursor:default}.member-group{top:0;text-align:center;background:#120D09;color:#EBCB95;border-bottom-color:rgba(217,174,120,.34);letter-spacing:.22em}.member-group-spacer{top:0;background:#0D0A08}.member-group:hover,.member-group-spacer:hover{color:var(--gold)}td.group-start,th.group-start{border-left-color:rgba(217,174,120,.5);box-shadow:inset 1px 0 0 rgba(217,174,120,.18)}td.group-end,th.group-end{border-right-color:rgba(217,174,120,.38)}tbody tr:hover td{background:rgba(217,174,120,.06)}td input[type=checkbox]{min-height:0;width:20px;height:20px}.pill{display:inline-block;border:1px solid rgba(217,174,120,.35);padding:4px 7px;border-radius:999px;color:var(--gold-hi);font-size:12px;white-space:nowrap}.tables-layout{display:grid;gap:14px}.table-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.table-chip{min-height:72px;text-align:left;letter-spacing:.08em;text-transform:none;padding:10px 12px}.table-chip b{display:block;font:300 23px var(--serif);color:#F6EFE4}.table-chip small{display:block;margin-top:4px;color:var(--muted);font-size:12px;letter-spacing:.08em;text-transform:uppercase}.table-chip.active{color:#1C130A;border-color:#E6C48C;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%)}.table-chip.active b,.table-chip.active small{color:#1C130A}.table-detail{border:1px solid var(--line);border-radius:3px;background:rgba(8,6,5,.28);padding:14px}.table-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(217,174,120,.16);padding-bottom:12px;margin-bottom:10px}.table-detail h2{font:300 34px/1.05 var(--serif);margin:0}.capacity{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);white-space:nowrap}.minimum-spend{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,260px);gap:10px;align-items:center;margin:0 0 12px;padding:10px;border:1px solid rgba(217,174,120,.18);border-radius:3px;background:rgba(0,0,0,.16)}.minimum-spend>span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}.minimum-spend-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.minimum-spend input{width:100%;min-height:44px;text-align:right;font-size:16px;letter-spacing:0;text-transform:none}.minimum-spend button{min-height:44px;padding:0 12px}.minimum-spend strong{font:300 24px var(--serif);text-align:right;color:#F6EFE4}.minimum-spend-state{grid-column:1/-1;min-height:18px;margin:0;color:var(--muted);font-size:12px}.minimum-spend-state.err{color:#E0707A}.table-groups{display:grid;gap:8px}.group{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border:1px solid rgba(217,174,120,.16);border-radius:3px;padding:10px;background:rgba(0,0,0,.16)}.group-main{font-family:var(--serif);font-size:22px;color:#F6EFE4;overflow-wrap:anywhere}.people{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.person{border:1px solid rgba(217,174,120,.28);border-radius:999px;padding:3px 7px;color:var(--muted);font-size:12px}.group-actions{display:flex;gap:8px;align-items:center}.group-actions button{min-height:42px;padding:0 10px;letter-spacing:.12em}.group select{min-height:42px;background:#090706;color:var(--bone);border:1px solid rgba(217,174,120,.5);border-radius:3px}.table-add{margin-top:16px;border-top:1px solid rgba(217,174,120,.16);padding-top:14px}.table-add h3{margin:0 0 10px;font:300 24px var(--serif)}.available-list{display:grid;gap:8px}.available-list .group{grid-template-columns:1fr auto}.empty-state{border:1px dashed rgba(217,174,120,.28);border-radius:3px;padding:14px;color:var(--muted);font-style:italic}@media(min-width:760px){.tables-layout{grid-template-columns:300px 1fr;align-items:start}.table-list{grid-template-columns:1fr}.table-detail{position:sticky;top:12px}}@media(max-width:759px){.table-detail{order:-1}}@media(max-width:460px){.table-list{grid-template-columns:1fr}.table-detail-head{display:block}.capacity{display:block;margin-top:8px}.minimum-spend{grid-template-columns:1fr}.minimum-spend input,.minimum-spend strong{text-align:left}.group,.available-list .group{grid-template-columns:1fr}.group-actions{justify-content:flex-start;flex-wrap:wrap}.toolbar{display:grid}.toolbar button{width:100%;flex:auto}.pager{display:grid}.pager-buttons{display:grid;grid-template-columns:1fr 1fr}}
.hall-map-toolbar{display:flex;align-items:center;gap:10px;margin:0 0 14px}.hall-map-toolbar button{min-width:150px}.hall-map-state{min-height:20px;margin:0;color:var(--muted);font-size:12px}.hall-map-state.err{color:#E0707A}.hall-map-shell{margin:0 0 16px;border:1px solid rgba(217,174,120,.32);border-radius:3px;overflow:hidden;background:rgba(5,4,3,.52)}.hall-map-shell[hidden]{display:none}.hall-map{position:relative;height:720px;overflow:hidden;background:radial-gradient(68% 42% at 50% 44%,rgba(163,22,33,.1),transparent 72%),linear-gradient(rgba(217,174,120,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(217,174,120,.035) 1px,transparent 1px),rgba(8,6,5,.7);background-size:auto,48px 48px,48px 48px,auto}.hall-map:after{content:"";position:absolute;inset:10%;pointer-events:none;background:url("/assets/whispers-rose.png") center/contain no-repeat;opacity:.035}.map-table{position:absolute;z-index:1;transform:translate(-50%,-50%);width:38px;height:38px;min-height:38px;padding:0;border-radius:50%;display:grid;place-items:center;color:var(--gold-hi);background:#0C0907;border:1px solid rgba(217,174,120,.68);font-size:10px;line-height:1;letter-spacing:0;touch-action:none;user-select:none;-webkit-user-select:none}.map-table.active{color:#1C130A;background:linear-gradient(180deg,#EBCD98,#B58A57);border-color:#EBCB95}.map-table.dragging{cursor:grabbing;box-shadow:0 0 0 5px rgba(217,174,120,.12),0 8px 22px rgba(0,0,0,.55)}.guest-count{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);white-space:nowrap}@media(max-width:759px){.hall-map{height:920px}.map-table{width:30px;height:30px;min-height:30px;font-size:8px}}@media(max-width:460px){.hall-map-toolbar{display:grid}.hall-map-toolbar button{width:100%}.guest-count{display:block;margin-top:8px}}
.group-actions{flex-wrap:wrap}.mini-check{min-height:42px;display:flex;align-items:center;gap:7px;border:1px solid rgba(217,174,120,.35);border-radius:3px;padding:0 10px;color:var(--bone);font-size:12px;letter-spacing:.1em;text-transform:uppercase}.mini-check input{min-height:0;width:18px;height:18px;padding:0}.member-row-companion td{background:rgba(217,174,120,.035);border-top-color:rgba(217,174,120,.08)}
.table-people-search{margin:0 0 14px}.table-people-search>input{width:100%;min-height:52px;text-transform:none;letter-spacing:0;font:400 16px var(--sans);cursor:text}.table-people-results{display:grid;border:1px solid var(--line);border-top:0;background:#0D0A08}.table-people-results[hidden]{display:none}.table-person-result{width:100%;min-height:56px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;border:0;border-bottom:1px solid rgba(217,174,120,.16);border-radius:0;padding:9px 12px;text-align:left;text-transform:none;letter-spacing:0}.table-person-result:last-child{border-bottom:0}.table-person-result span{min-width:0}.table-person-result b,.table-person-result small{display:block;overflow-wrap:anywhere}.table-person-result b{font:400 17px var(--serif);color:#F6EFE4}.table-person-result small{margin-top:3px;color:var(--muted);font-size:12px}.table-person-result strong{color:var(--gold-hi);font-size:11px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}.table-person-empty{padding:12px;color:var(--muted);font-size:13px}.group.search-hit{border-color:var(--gold);box-shadow:0 0 0 2px rgba(217,174,120,.14)}
.tables-to-top{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:5;width:44px;height:44px;min-height:44px;padding:0;border-radius:50%;display:grid;place-items:center;background:#0D0A08;border-color:rgba(217,174,120,.72);color:var(--gold-hi);font:400 22px/1 var(--sans);letter-spacing:0;box-shadow:0 8px 24px rgba(0,0,0,.5)}.tables-to-top[hidden]{display:none}@media(max-width:520px){.tables-to-top{right:max(14px,env(safe-area-inset-right));bottom:calc(18px + env(safe-area-inset-bottom))}}
.table-add-head{display:grid;grid-template-columns:1fr minmax(220px,340px);gap:10px;align-items:center;margin-bottom:10px}.table-add-head h3{margin:0}.table-search{width:100%;min-height:44px;text-transform:none;letter-spacing:0;font:400 15px var(--sans);cursor:text}@media(max-width:460px){.table-add-head{display:block}.table-search{margin-top:10px}}
.invite-form{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;margin-bottom:12px}.invite-form input{text-transform:none;letter-spacing:0;font:400 15px var(--sans);cursor:text;min-width:0}.invite-form button{white-space:nowrap}.link-cell{max-width:260px;overflow-wrap:anywhere;color:#D8CEC2}.copy-btn{min-height:38px;padding:0 9px;letter-spacing:.1em;font-size:11px}.invite-state{min-height:20px;color:var(--muted);font-size:13px;margin:0 0 10px}.invite-state:empty{min-height:0;margin:0 0 8px}.invite-state.err{color:#E8808A}@media(max-width:900px){.invite-form{grid-template-columns:1fr}.link-cell{max-width:unset}}
.staff-create{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:12px}.staff-create input{text-transform:none;letter-spacing:0;font:400 15px var(--sans);cursor:text}.password-reveal{display:none;border:1px solid rgba(217,174,120,.35);background:rgba(217,174,120,.08);padding:12px;margin:0 0 12px}.password-reveal.on{display:grid;gap:8px}.password-reveal code{display:block;font-size:18px;overflow-wrap:anywhere;color:#F6EFE4}.staff-row-actions{display:flex;gap:6px;flex-wrap:wrap}.staff-row-actions button{min-height:36px;padding:0 8px;font-size:10px;letter-spacing:.1em}.staff-control{width:100%;min-height:38px;text-transform:none;letter-spacing:0;font:400 13px var(--sans);cursor:text}.staff-select{min-height:38px;background:#090706;color:var(--bone);border:1px solid rgba(217,174,120,.5);border-radius:3px}
.menu-panel{display:grid;justify-items:center;max-width:520px;margin:0 auto;text-align:center}.menu-qr{width:min(100%,336px);aspect-ratio:1;display:grid;place-items:center;padding:8px;border:1px solid rgba(217,174,120,.5);border-radius:6px;background:#000000;color:#FFFFFF;overflow:hidden}.menu-qr canvas{display:block;width:100%!important;height:auto!important}.menu-url{display:block;max-width:100%;margin:18px 0 14px;color:var(--gold-hi);font-size:15px;line-height:1.5;overflow-wrap:anywhere}.menu-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(100%,336px)}.menu-actions button{width:100%}@media(max-width:520px){.menu-actions{grid-template-columns:1fr}}
.settings-panel{max-width:680px}.settings-intro{margin-bottom:0}.settings-control{padding:22px 0;border-bottom:1px solid rgba(217,174,120,.2)}.settings-control:last-child{border-bottom:0;padding-bottom:0}.settings-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:18px;border-bottom:1px solid rgba(217,174,120,.2)}.settings-heading h2{margin:0;font:300 28px/1.1 var(--serif);color:#F6EFE4}.settings-heading .small{margin-top:8px}.settings-status{flex:0 0 auto;border:1px solid rgba(217,174,120,.5);padding:9px 12px;color:var(--gold-hi);font-size:12px;font-weight:400;letter-spacing:.2em}.settings-status.locked{color:#E8808A;border-color:rgba(224,112,122,.55)}.settings-schedule{margin:16px 0 0;padding:12px;border-left:2px solid var(--gold);background:rgba(217,174,120,.06);color:#D8CEC2;font-size:14px;line-height:1.5}.settings-field{display:grid;gap:8px;margin-top:18px}.settings-field span{color:var(--gold);font-size:11px;letter-spacing:.18em;text-transform:uppercase}.settings-field input{width:100%;max-width:360px;text-transform:none;letter-spacing:0;font-size:16px;cursor:text;color-scheme:dark}.settings-timezone{margin-top:8px}.settings-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.settings-actions button{min-width:190px}.settings-actions button[hidden]{display:none}@media(max-width:520px){.settings-heading{display:grid}.settings-status{justify-self:start}.settings-field input{max-width:none}.settings-actions{display:grid}.settings-actions button{width:100%;min-width:0}}
@media(max-width:520px){body{font-size:14px;padding:calc(10px + env(safe-area-inset-top)) max(12px,env(safe-area-inset-right),env(safe-area-inset-left)) calc(118px + env(safe-area-inset-bottom))}main{max-width:100%}.top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 10px;margin-bottom:10px;padding-bottom:10px;align-items:center}.brand{gap:9px;min-width:0}.brand img{width:100px;flex-basis:100px}.staff-meta{display:grid;grid-template-columns:auto auto;gap:6px;justify-content:end;justify-items:stretch}.staff-who{grid-column:1/-1;text-align:right;font-size:10px;letter-spacing:.13em}.staff-meta button,.staff-meta a{min-height:38px;padding:0 10px;font-size:10px;letter-spacing:.14em}.k{font-size:10px;letter-spacing:.26em}h1{font-size:29px}.panel{padding:12px 0}.tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;overflow:visible;margin-bottom:12px;padding-bottom:0}.tab{width:100%;min-height:46px;padding:0 8px;letter-spacing:.18em;font-size:11px}button,input{min-height:48px;padding:0 12px}.camera{max-height:min(58svh,520px);aspect-ratio:3/4}.actions{grid-template-columns:1fr 1fr}.actions #start{grid-column:1/-1}.actions button{min-height:48px;letter-spacing:.16em;font-size:11px}.manual{grid-template-columns:1fr}.staff-create{grid-template-columns:1fr}.manual input{width:100%;font-size:16px}.manual button,.staff-create button{width:100%}.invite-form{gap:8px;margin-bottom:8px}.invite-form input,.toolbar input{min-height:50px;font-size:16px}.invite-form button,.toolbar button{min-height:50px;font-size:11px;letter-spacing:.16em}.toolbar{gap:8px;margin-bottom:10px}.grid{max-width:100%;border-radius:2px}table{min-width:980px}th,td{padding:10px 8px;font-size:12px}.pager{margin-top:10px}.link-cell{font-size:12px}.copy-btn{min-height:36px;font-size:10px}}
@media(max-width:380px){.brand img{width:88px;flex-basis:88px}h1{font-size:27px}.staff-meta button,.staff-meta a{padding:0 8px;letter-spacing:.11em}.tab{letter-spacing:.15em;font-size:10px}.invite-form input,.toolbar input{min-height:48px}.invite-form button,.toolbar button{min-height:48px}}
</style>
<style>#view-hallmap:target{display:block}main:has(#view-hallmap:target) #view-scanner{display:none}${HALL_PLAN_STYLE}</style>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<main id="staffApp" data-staff-role="${staff.user.role}">
<div class="top"><div class="brand"><img src="/assets/whispers-lockup-transparent.png" alt="WHISPERS"/><div><h1>Door</h1></div></div><div class="staff-meta"><div class="staff-who"><b>${staff.user.username}</b> · ${staff.user.role}</div><a id="refresh" href="/staff/rose-door-10">Refresh</a><a id="logout" href="/api/staff/logout">Logout</a></div></div>
<nav class="tabs" aria-label="Staff sections"><a class="tab active" href="#view-scanner" data-view="scanner">Scanner</a><a class="tab" href="#view-members" data-view="members">Members</a><a class="tab" href="#view-tables" data-view="tables">Tables</a><a class="tab" href="#view-hallmap" data-view="hallmap">MAP</a><a class="tab" href="#view-invite" data-view="invite">Invite</a>${menuTab}<a class="tab" href="#view-staff" data-view="staff">Staff</a>${settingsTab}</nav>
<div class="view active" id="view-scanner">
<section class="panel camera"><video id="video" playsinline muted></video><div class="scanline"></div></section>
<section class="panel">
<div class="actions"><button class="primary" id="start">Open camera</button><button disabled id="switch">Switch</button><button id="stop">Stop</button></div>
<div class="manual"><input id="manual" aria-label="QR value or token" placeholder="Paste QR value or token" autocomplete="off" autocapitalize="off" spellcheck="false"/><button id="manualBtn">Check</button></div>
<p class="small">Camera scanning runs locally in this browser. A valid WHISPERS QR marks the ticket as checked in.</p>
</section>
<section class="panel result" id="result" aria-live="polite"><h2>Ready.</h2><p>Scan a guest ticket.</p></section>
<section class="panel"><div class="k">Scanned tonight</div><div class="list" id="list"></div></section>
</div>
<div class="view" id="view-members">
<section class="panel"><div class="toolbar"><input id="memberSearch" placeholder="Search members" autocomplete="off"/>${membersExportButton}</div><div class="grid"><table id="membersTable"><thead><tr class="member-groups"><th class="member-group-spacer" colspan="5" aria-hidden="true"></th><th class="member-group" colspan="3">Table</th><th class="member-group" colspan="2">Door</th><th class="member-group-spacer" aria-hidden="true"></th></tr><tr class="member-head"><th data-sort="name">Name</th><th data-sort="type">Type</th><th data-sort="guestOf">Guest of</th><th data-sort="email">Email</th><th data-sort="phone">Phone</th><th class="group-start" data-sort="wantsTableReservation">Request</th><th data-sort="reservationConfirmed">Confirmed</th><th class="group-end" data-sort="table">Table</th><th class="group-start" data-sort="checkedIn">In</th><th class="group-end" data-sort="checkedInAt">Scanned</th><th data-sort="submittedAt">Registered</th></tr></thead><tbody></tbody></table></div><div class="pager" id="membersPager"></div></section>
</div>
<div class="view" id="view-tables">
<section class="panel"><div class="toolbar"><div class="toolbar-label">All attending groups can be assigned to tables. Reservation requests are marked.</div>${tablesExportButton}</div><div class="table-people-search"><input id="tablePeopleSearch" placeholder="Search people by name, email or phone" autocomplete="off"/><div class="table-people-results" id="tablePeopleResults" hidden></div></div><div class="hall-map-toolbar"><button class="primary" id="toggleHallMap" type="button">Open map</button><p class="hall-map-state" id="hallMapState" aria-live="polite"></p></div><div class="hall-map-shell" id="hallMapShell" hidden><div class="hall-map" id="hallMap" aria-label="Hall table map"></div></div><div class="tables-layout" id="tablesView"></div></section>
</div>
${renderHallPlanView()}
<div class="view" id="view-invite">
<section class="panel">
<form class="invite-form" id="inviteForm"><input id="inviteName" maxlength="120" placeholder="Name" autocomplete="name"/><input id="inviteEmail" maxlength="254" placeholder="Email optional" autocomplete="email" inputmode="email"/><input id="invitePhone" maxlength="40" placeholder="Phone optional" autocomplete="tel" inputmode="tel"/><button class="primary" type="submit">Create Invite</button></form>
<p class="invite-state" id="inviteState" aria-live="polite"></p>
<div class="toolbar"><input id="inviteSearch" placeholder="Search invites" autocomplete="off"/>${invitesExportButton}<button id="reloadInvites">Reload</button></div>
<div class="grid"><table id="invitesTable"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Invite</th><th>Confirmation</th><th>Ticket</th><th>Created</th>${staff.user.role === "owner" ? '<th class="invite-owner-actions">Actions</th>' : ''}</tr></thead><tbody></tbody></table></div><div class="pager" id="invitesPager"></div>
</section>
</div>
${menuView}
<div class="view" id="view-staff">
<section class="panel">
<form class="staff-create" id="staffCreate"><input id="newStaffUsername" maxlength="40" placeholder="Username" autocomplete="off" autocapitalize="none" spellcheck="false"/><button class="primary" type="submit">Create Admin</button></form>
<div class="password-reveal" id="staffPasswordReveal"><div class="small">Password is shown once. Copy it now.</div><code id="staffPasswordValue"></code><button id="copyStaffPassword" type="button">Copy Password</button></div>
<div class="grid"><table id="staffUsersTable"><thead><tr><th>Username</th><th>Role</th><th>Active</th><th>Created</th><th>Last login</th><th>Actions</th></tr></thead><tbody></tbody></table></div>
<p class="invite-state" id="staffState" aria-live="polite"></p>
</section>
</div>
${settingsView}
</main>
<button class="tables-to-top" id="tablesToTop" type="button" aria-label="Back to top" title="Back to top" hidden>&#8593;</button>
<canvas id="canvas" hidden></canvas>
${menuQrScript}
<script>
const STAFF_USER = ${JSON.stringify(staff.user)};
const video=document.getElementById('video'),canvas=document.getElementById('canvas'),result=document.getElementById('result'),list=document.getElementById('list');
let stream=null,loop=null,pass=0;const seen=new Map(),REPEAT_MS=4000;
const PAGE_SIZE=20;
const MENU_URL='https://whisperssociety.com/menu';
const PRINT_SIZE=2400;
let members=[],membersPage=1,sortKey='submittedAt',sortDir=-1,tablesData=null,selectedTableId=null,tableSearch='',tablePeopleSearch='',tableSpendNotice=null,hallMapOpen=false,mapDrag=null,invites=[],invitesPage=1,inviteEditId=null,staffUsers=[],rsvpSettings={confirmation:null,updates:null},currentView='scanner';
const MAP_DRAG_THRESHOLD=6;
const RSVP_SETTING_UI={confirmation:{status:'confirmationSettingsStatus',scheduled:'confirmationScheduledChange',input:'confirmationChangeAt',apply:'applyConfirmationSetting',cancel:'cancelConfirmationSchedule',state:'confirmationSettingsState'},updates:{status:'updatesSettingsStatus',scheduled:'updatesScheduledChange',input:'updatesChangeAt',apply:'applyUpdatesSetting',cancel:'cancelUpdatesSchedule',state:'updatesSettingsState'}};
const ROLE_VIEWS={owner:['scanner','members','tables','invite','menu','staff','settings','hallmap'],admin:['scanner','members','tables','invite','menu','hallmap'],door:['scanner','members','tables','invite','menu','hallmap'],service:['tables','hallmap']};
const allowedViews=ROLE_VIEWS[STAFF_USER.role]||['scanner'];
const IS_OWNER=STAFF_USER.role==='owner';
const TABLES_READ_ONLY=STAFF_USER.role==='service';
function viewFromHash(){return location.hash==='#members'||location.hash==='#view-members'?'members':location.hash==='#tables'||location.hash==='#view-tables'?'tables':location.hash==='#invite'||location.hash==='#view-invite'?'invite':location.hash==='#menu'||location.hash==='#view-menu'?'menu':location.hash==='#staff'||location.hash==='#view-staff'?'staff':location.hash==='#settings'||location.hash==='#view-settings'?'settings':location.hash==='#hallmap'||location.hash==='#view-hallmap'?'hallmap':location.hash==='#scanner'||location.hash==='#view-scanner'?'scanner':allowedViews[0]||'scanner';}
function showView(name){
  if(!allowedViews.includes(name))name=allowedViews[0]||'scanner';
  currentView=name;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));
  location.hash='#view-'+name;
  if(name==='members')loadMembers();
  if(name==='tables')loadTables();
  if(name==='invite')loadInvites();
  if(name==='menu')renderMenuQr();
  if(name==='staff')loadStaffUsers();
  if(name==='settings')loadSettings();
  updateTablesToTop();
}
function updateTablesToTop(){const button=document.getElementById('tablesToTop');if(button)button.hidden=!(currentView==='tables'&&window.scrollY>400);}
function openTablesOverview(){
  selectedTableId=null;tableSearch='';tablePeopleSearch='';tableSpendNotice=null;hallMapOpen=true;const peopleSearch=document.getElementById('tablePeopleSearch');if(peopleSearch)peopleSearch.value='';
  showView('tables');
  requestAnimationFrame(()=>document.getElementById('view-tables')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
}
function refreshCurrent(){if(currentView==='members')loadMembers();else if(currentView==='tables')loadTables();else if(currentView==='invite')loadInvites();else if(currentView==='menu')renderMenuQr();else if(currentView==='staff')loadStaffUsers();else if(currentView==='settings')loadSettings();else loadList();}
async function logoutStaff(){await fetch('/api/staff/logout',{method:'POST'});location.reload();}
document.querySelectorAll('.tab').forEach(btn=>{if(!allowedViews.includes(btn.dataset.view))btn.hidden=true;});
document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab[data-view]');
  if(tab){e.preventDefault();e.stopImmediatePropagation();if(tab.dataset.view==='tables'){openTablesOverview();return;}showView(tab.dataset.view);return;}
  if(e.target.closest('#refresh')){e.preventDefault();e.stopImmediatePropagation();refreshCurrent();return;}
  if(e.target.closest('#logout')){e.preventDefault();e.stopImmediatePropagation();logoutStaff();}
},true);
window.addEventListener('hashchange',()=>showView(viewFromHash()));
document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>showView(btn.dataset.view));
document.getElementById('refresh').onclick=refreshCurrent;
document.getElementById('logout').onclick=logoutStaff;
showView(viewFromHash());
function show(kind,title,body){result.className='panel result '+kind;result.innerHTML='<h2>'+title+'</h2>'+body;}
function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function hhmm(iso){return new Date(iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
async function scanValue(value,manual){
  if(!value) return;
  if(!manual){const last=seen.get(value),now=Date.now();seen.set(value,now);if(last&&now-last<REPEAT_MS) return;stopCamera();}
  show('', 'Checking…', '<p>Reading the seal.</p>');
  revealResult();
  let res,data;
  try{res=await fetch('/api/door',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({value})});data=await res.json().catch(()=>({}));}
  catch(e){seen.delete(value);show('warn','No connection.','<p>Try again.</p>');return;}
  if(!res.ok){if(res.status>=500)seen.delete(value);show('bad','Invalid.', '<p>'+esc(data.error||'This ticket could not be confirmed.')+'</p>');return;}
  const t=data.ticket||{};
  const who=t.brought_by?'<p>Guest of '+esc(t.brought_by)+'</p>':(t.bringing?'<p>Bringing '+esc(t.bringing)+' (own ticket)</p>':'');
  if(data.status==='already_checked_in'){
    if(navigator.vibrate)navigator.vibrate([80,60,80]);
    show('warn','Already inside.','<p><b>'+esc(t.guest_name)+'</b></p>'+who+(t.checked_in_at?'<p>First checked in at '+esc(hhmm(t.checked_in_at))+'.</p>':'')+'<p>'+esc(t.seal_code||'')+'</p>');
  }else{
    show('ok','Confirmed.','<p><b>'+esc(t.guest_name)+'</b></p>'+who+'<p>'+esc(t.seal_code||'')+'</p>');
  }
  await loadList(data.status==='checked_in');
  revealResult();
}
function revealResult(){result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
// Native detector where the browser has one (Android Chrome); jsQR everywhere else (iPhone).
let detector=null;
try{if('BarcodeDetector' in window)detector=new BarcodeDetector({formats:['qr_code']});}catch(_){detector=null;}
let ctx=null;
try{ctx=canvas.getContext('2d',{willReadFrequently:true});}catch(_){ctx=null;}
async function readFrame(){
  if(detector){try{const found=await detector.detect(video);if(found.length)return found[0].rawValue;}catch(_){detector=null;}}
  if(!window.jsQR||!ctx)return null;
  const vw=video.videoWidth,vh=video.videoHeight;
  // Alternate a centre crop (where staff hold the ticket) with the whole frame, both scaled
  // down so each pass is fast on a phone and the QR fills more of the picture.
  pass=(pass+1)%3;
  let sx=0,sy=0,sw=vw,sh=vh;
  if(pass!==2){const side=Math.min(vw,vh)*(pass===0?0.6:0.85);sx=(vw-side)/2;sy=(vh-side)/2;sw=sh=side;}
  const scale=Math.min(1,640/Math.max(sw,sh));
  canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);
  ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  const img=ctx.getImageData(0,0,canvas.width,canvas.height);
  const code=jsQR(img.data,img.width,img.height,{inversionAttempts:'attemptBoth'});
  return code&&code.data;
}
function scheduleScan(){loop=setTimeout(scanTick,90);}
async function scanTick(){
  if(!stream)return;
  if(video.readyState>=2&&video.videoWidth){
    try{const value=await readFrame();if(value)scanValue(value,false);}catch(_){}
  }
  if(stream)scheduleScan();
}
// Focus. iPhone Pro main cameras cannot focus closer than ~20 cm, so prefer the multi-lens
// "Back Triple/Dual (Wide) Camera", which switches to macro by itself. Labels may be localised.
const MULTI_LENS=/triple|dual|тройна|двойна/i,FRONT=/front|user|предна|селфи|facetime/i;
let cameras=[],cameraIndex=-1;
async function backCameras(){
  try{const all=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');const back=all.filter(d=>!FRONT.test(d.label));return back.length?back:all;}catch(_){return [];}
}
async function tuneTrack(track){
  let caps={};try{caps=track.getCapabilities?track.getCapabilities():{};}catch(_){}
  const advanced=[];
  if(caps.focusMode&&caps.focusMode.includes('continuous'))advanced.push({focusMode:'continuous'});
  if(caps.zoom&&caps.zoom.max>=1.5)advanced.push({zoom:Math.min(1.6,caps.zoom.max)});
  for(const c of advanced){try{await track.applyConstraints({advanced:[c]});}catch(_){}}
}
async function openStream(deviceId){
  const video={width:{ideal:1920},height:{ideal:1080}};
  if(deviceId)video.deviceId={exact:deviceId};else video.facingMode={ideal:'environment'};
  return navigator.mediaDevices.getUserMedia({audio:false,video});
}
async function startCamera(deviceId){
  if(stream)return;
  stream=await openStream(deviceId);
  if(!deviceId){
    // Labels are only readable after permission, so pick the best back camera now.
    cameras=await backCameras();
    const current=stream.getVideoTracks()[0].getSettings().deviceId;
    const multi=cameras.findIndex(d=>MULTI_LENS.test(d.label));
    cameraIndex=cameras.findIndex(d=>d.deviceId===current);
    if(multi>=0&&cameras[multi].deviceId!==current){
      stream.getTracks().forEach(t=>t.stop());
      try{stream=await openStream(cameras[multi].deviceId);cameraIndex=multi;}catch(_){stream=await openStream();}
    }
  }
  await tuneTrack(stream.getVideoTracks()[0]);
  video.setAttribute('playsinline','');video.muted=true;
  video.srcObject=stream;await video.play();
  document.getElementById('switch').disabled=cameras.length<2;
  show('', 'Scanning…', '<p>Hold the QR inside the frame, 20–40 cm away. Tap the picture to refocus.</p>');
  scheduleScan();
}
async function switchCamera(){
  if(cameras.length<2)return;
  cameraIndex=(cameraIndex+1)%cameras.length;
  const id=cameras[cameraIndex].deviceId;
  stopCamera();
  startCamera(id).catch(()=>{stopCamera();show('bad','Camera blocked.','<p>Allow camera access or paste the QR value manually.</p>');});
}
// Tap to refocus where the browser allows it.
video.addEventListener('click',async(e)=>{
  if(!stream)return;const track=stream.getVideoTracks()[0];let caps={};try{caps=track.getCapabilities?track.getCapabilities():{};}catch(_){}
  const r=video.getBoundingClientRect(),point={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};
  try{if(caps.focusMode&&caps.focusMode.includes('single-shot'))await track.applyConstraints({advanced:[{pointsOfInterest:[point],focusMode:'single-shot'}]});}catch(_){}
  try{if(caps.focusMode&&caps.focusMode.includes('continuous'))await track.applyConstraints({advanced:[{focusMode:'continuous'}]});}catch(_){}
});
function stopCamera(){if(loop)clearTimeout(loop);loop=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;document.getElementById('start').textContent='Scan next';}video.srcObject=null;}
async function loadList(markLatest){
  let res,data;
  try{res=await fetch('/api/door',{headers:{'Accept':'application/json'}});data=await res.json().catch(()=>({}));}
  catch(e){list.innerHTML='<p class="small">No connection. Try again.</p>';return;}
  if(!res.ok){list.innerHTML='<p class="small">Could not load the list. Try again.</p>';return;}
  list.innerHTML=(data.scans||[]).map(s=>'<div class="row"><b>'+esc(s.guest_name)+(s.brought_by?'<small>Guest of '+esc(s.brought_by)+'</small>':'')+'</b><span>'+esc(s.seal_code||'')+'<br>'+esc(hhmm(s.checked_in_at))+'</span></div>').join('')||'<p class="small">No scanned tickets yet.</p>';
  const first=list.querySelector('.row');if(markLatest&&first)first.classList.add('latest');
}
document.getElementById('switch').onclick=switchCamera;
function toTop(){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
document.getElementById('start').onclick=()=>{toTop();startCamera().catch(e=>{stopCamera();show('bad','Camera blocked.','<p>Allow camera access or paste the QR value manually.</p>');});};
document.getElementById('stop').onclick=stopCamera;
document.getElementById('manualBtn').onclick=()=>scanValue(document.getElementById('manual').value.trim(),true);
function csvSafeValue(v){const s=String(v??'');return /^[=+\-@\\t\\r]/.test(s)?"'"+s:s;}
function csvCell(v){return '"'+csvSafeValue(v).replace(/"/g,'""')+'"';}
function downloadCsv(filename,rows){const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(csvCell).join(',')).join('\\r\\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function pageRows(rows,page){const start=(page-1)*PAGE_SIZE;return rows.slice(start,start+PAGE_SIZE);}
function renderPager(id,rows,page,onPage){
  const el=document.getElementById(id),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)),safe=Math.min(Math.max(1,page),pages),start=rows.length?((safe-1)*PAGE_SIZE)+1:0,end=Math.min(rows.length,safe*PAGE_SIZE);
  if(safe!==page){onPage(safe);return;}
  el.innerHTML='<div class="pager-info">'+start+'-'+end+' of '+rows.length+' · page '+safe+' / '+pages+'</div><div class="pager-buttons"><button '+(safe<=1?'disabled':'')+' data-page="'+(safe-1)+'">Prev</button><button '+(safe>=pages?'disabled':'')+' data-page="'+(safe+1)+'">Next</button></div>';
  el.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>onPage(Number(b.dataset.page)));
}
function memberDate(v){return v?new Date(v).toLocaleString():'';}
function exportMembersCsv(){
  const rows=[['Name','Type','Guest of','Email','Phone','Reservation requested','Reservation confirmed','Table','Checked in','Scanned at','Registered at']].concat(filteredMembers().map(m=>[m.name,m.type,m.guestOf,m.email,m.phone,m.wantsTableReservation?'yes':'no',m.reservationConfirmed?'yes':'no',m.table,m.checkedIn?'yes':'no',m.checkedInAt,m.submittedAt]));
  downloadCsv('whispers-members.csv',rows);
}
function memberPrimaryNameKey(m){return String(m.holder==='guest'?m.name:m.guestOf||'').trim().toLowerCase();}
function memberGroupKey(m){return String(m.rsvpId||m.id||'');}
function memberResolvedGroupKey(m,primaryKeys){return primaryKeys.get(memberPrimaryNameKey(m))||memberGroupKey(m);}
function memberMatchesSearch(m,q){return !q||[m.name,m.type,m.guestOf,m.email,m.phone,m.table].some(v=>String(v||'').toLowerCase().includes(q));}
function memberGroups(rows){const primaryKeys=new Map();rows.forEach(m=>{if(m.holder==='guest')primaryKeys.set(memberPrimaryNameKey(m),memberGroupKey(m));});const groups=new Map();rows.forEach(m=>{const k=memberResolvedGroupKey(m,primaryKeys);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});return Array.from(groups.values());}
function groupMembersForDisplay(rows,q){return memberGroups(rows).filter(group=>group.some(m=>memberMatchesSearch(m,q))).sort((a,b)=>{const ap=a.find(m=>m.holder==='guest')||a[0],bp=b.find(m=>m.holder==='guest')||b[0];return String(ap[sortKey]??'').localeCompare(String(bp[sortKey]??''))*sortDir;}).flatMap(group=>{const primary=group.find(m=>m.holder==='guest'),others=group.filter(m=>m!==primary);others.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));return primary?[primary].concat(others):others;});}
function filteredMembers(){const q=document.getElementById('memberSearch').value.trim().toLowerCase();return groupMembersForDisplay(members,q);}
async function loadMembers(){
  const body=document.querySelector('#membersTable tbody');body.innerHTML='<tr><td colspan="11">Loading...</td></tr>';
  let res,data;try{res=await fetch('/api/staff/members');data=await res.json();}catch(e){body.innerHTML='<tr><td colspan="11">No connection.</td></tr>';return;}
  if(!res.ok){body.innerHTML='<tr><td colspan="11">'+esc(data.error||'Could not load members')+'</td></tr>';return;}
  members=data.members||[];renderMembers();
}
function renderMembers(){
  const body=document.querySelector('#membersTable tbody'),rows=filteredMembers();
  const visible=pageRows(rows,membersPage);
  body.innerHTML=visible.map(m=>'<tr'+(m.holder!=='guest'?' class="member-row-companion"':'')+'><td>'+esc(m.name)+'</td><td>'+esc(m.type)+'</td><td>'+esc(m.guestOf||'')+'</td><td>'+esc(m.email)+(m.emailIsFallback?' <span class="pill">fallback</span>':'')+'</td><td>'+esc(m.phone)+'</td><td class="group-start"><input type="checkbox" '+(m.wantsTableReservation?'checked':'')+' data-request-id="'+esc(m.rsvpId)+'"/></td><td><input type="checkbox" '+(m.reservationConfirmed?'checked':'')+' data-reservation-id="'+esc(m.rsvpId)+'"/></td><td class="group-end">'+esc(m.table||'')+'</td><td class="group-start"><input type="checkbox" '+(m.checkedIn?'checked':'')+' data-checkin-id="'+esc(m.id)+'"/></td><td class="group-end">'+esc(m.checkedInAt?new Date(m.checkedInAt).toLocaleString():'')+'</td><td>'+esc(m.submittedAt?new Date(m.submittedAt).toLocaleString():'')+'</td></tr>').join('')||'<tr><td colspan="11">No members.</td></tr>';
  renderPager('membersPager',rows,membersPage,p=>{membersPage=p;renderMembers();});
  body.querySelectorAll('[data-checkin-id]').forEach(cb=>cb.onchange=()=>toggleMember(cb,cb.dataset.checkinId,cb.checked));
  body.querySelectorAll('[data-request-id]').forEach(cb=>cb.onchange=()=>toggleRequest(cb,cb.dataset.requestId,cb.checked));
  body.querySelectorAll('[data-reservation-id]').forEach(cb=>cb.onchange=()=>toggleReservation(cb,cb.dataset.reservationId,cb.checked));
}
function confirmToggle(cb,message){if(window.confirm(message))return true;cb.checked=!cb.checked;return false;}
async function toggleMember(cb,id,checkedIn){
  if(!checkedIn&&!confirmToggle(cb,'Remove this guest check-in?'))return;
  const m=members.find(x=>x.id===id);if(!m)return;
  await fetch('/api/staff/checkin-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rsvpId:m.rsvpId,companionId:m.companionId,holder:m.holder,checkedIn})});
  await loadMembers();await loadList();
}
async function toggleRequest(cb,rsvpId,wantsTableReservation){
  if(!wantsTableReservation&&!confirmToggle(cb,'Remove table request for this group?'))return;
  await fetch('/api/staff/reservation-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rsvpId:Number(rsvpId),wantsTableReservation})});
  await loadTables();await loadMembers();
}
async function toggleReservation(cb,rsvpId,reservationConfirmed){
  if(!reservationConfirmed&&!confirmToggle(cb,'Remove table reservation confirmation?'))return;
  await fetch('/api/staff/reservation-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rsvpId:Number(rsvpId),reservationConfirmed})});
  await loadTables();await loadMembers();
}
document.getElementById('memberSearch').oninput=()=>{membersPage=1;renderMembers();};
const exportMembersButton=document.getElementById('exportMembers');
if(exportMembersButton)exportMembersButton.onclick=exportMembersCsv;
document.querySelectorAll('#membersTable th[data-sort]').forEach(th=>th.onclick=()=>{const k=th.dataset.sort;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=1;}membersPage=1;renderMembers();});
async function loadTables(){
  const box=document.getElementById('tablesView');box.innerHTML='<p class="small">Loading...</p>';
  let res,data;try{res=await fetch('/api/staff/tables');data=await res.json();}catch(e){box.innerHTML='<p class="small">No connection.</p>';return;}
  if(!res.ok){box.innerHTML='<p class="small">'+esc(data.error||'Could not load tables')+'</p>';return;}
  tablesData=data;renderHallMap();renderTables();renderTablePeopleSearch();
}
function tableNumber(table){return String(table.sortOrder||table.label||'').replace(/\D/g,'')||table.label;}
function renderHallMap(){
  const button=document.getElementById('toggleHallMap'),shell=document.getElementById('hallMapShell'),map=document.getElementById('hallMap');if(!button||!shell||!map)return;
  button.textContent=hallMapOpen?'Close map':'Open map';shell.hidden=!hallMapOpen;if(!hallMapOpen||!tablesData)return;
  map.innerHTML=(tablesData.tables||[]).map(t=>'<button type="button" class="map-table '+(selectedTableId===t.id?'active':'')+'" data-map-table="'+esc(t.id)+'" style="left:'+Number(t.mapX??50)+'%;top:'+Number(t.mapY??50)+'%" aria-label="'+esc(t.label)+'">'+esc(tableNumber(t))+'</button>').join('');
  map.querySelectorAll('[data-map-table]').forEach(el=>bindMapTable(el));
}
function bindMapTable(el){
  if(TABLES_READ_ONLY){el.onclick=()=>openTableFromMap(el.dataset.mapTable);return;}
  el.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();el.setPointerCapture(e.pointerId);mapDrag={pointerId:e.pointerId,tableId:el.dataset.mapTable,startX:e.clientX,startY:e.clientY,dragged:false,el};});
  el.addEventListener('pointermove',e=>{if(!mapDrag||mapDrag.pointerId!==e.pointerId||mapDrag.el!==el)return;if(!mapDrag.dragged&&Math.hypot(e.clientX-mapDrag.startX,e.clientY-mapDrag.startY)<MAP_DRAG_THRESHOLD)return;mapDrag.dragged=true;el.classList.add('dragging');const map=document.getElementById('hallMap'),rect=map.getBoundingClientRect(),padX=el.offsetWidth/2/rect.width*100,padY=el.offsetHeight/2/rect.height*100,mapX=Math.max(padX,Math.min(100-padX,(e.clientX-rect.left)/rect.width*100)),mapY=Math.max(padY,Math.min(100-padY,(e.clientY-rect.top)/rect.height*100));el.style.left=mapX+'%';el.style.top=mapY+'%';const table=(tablesData.tables||[]).find(t=>t.id===mapDrag.tableId);if(table){table.mapX=Math.round(mapX*100)/100;table.mapY=Math.round(mapY*100)/100;}});
  el.addEventListener('pointerup',e=>{if(!mapDrag||mapDrag.pointerId!==e.pointerId||mapDrag.el!==el)return;const drag=mapDrag;mapDrag=null;el.classList.remove('dragging');if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);if(drag.dragged){const table=(tablesData.tables||[]).find(t=>t.id===drag.tableId);if(table)saveTablePosition(table.id,table.mapX,table.mapY);}else openTableFromMap(drag.tableId);});
  el.addEventListener('pointercancel',e=>{if(mapDrag&&mapDrag.pointerId===e.pointerId&&mapDrag.el===el){mapDrag=null;el.classList.remove('dragging');}});
}
async function saveTablePosition(tableId,mapX,mapY){
  const state=document.getElementById('hallMapState');state.className='hall-map-state';state.textContent='Saving...';let res,data;try{res=await fetch('/api/staff/tables',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({tableId,mapX,mapY})});data=await res.json();}catch(_){state.className='hall-map-state err';state.textContent='No connection.';return;}if(!res.ok){state.className='hall-map-state err';state.textContent=data.error||'Could not save table position.';return;}const table=(tablesData.tables||[]).find(t=>t.id===tableId);if(table){table.mapX=data.mapX;table.mapY=data.mapY;}state.textContent='Saved.';
}
function openTableFromMap(tableId){hallMapOpen=false;selectedTableId=tableId;tableSpendNotice=null;renderHallMap();renderTables();requestAnimationFrame(()=>document.getElementById('selectedTableDetail')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));}
function renderTablePeopleSearch(){
  const input=document.getElementById('tablePeopleSearch'),results=document.getElementById('tablePeopleResults');if(!input||!results)return;tablePeopleSearch=input.value;const q=tablePeopleSearch.trim().toLowerCase();results.hidden=!q;if(!q){results.innerHTML='';return;}
  const tables=tablesData?.tables||[],matches=[];for(const group of tablesData?.groups||[]){for(const person of group.peopleDetails||[]){if([person.name,person.email,person.phone].some(value=>String(value||'').toLowerCase().includes(q)))matches.push({group,person});}}
  results.innerHTML=matches.slice(0,30).map(({group,person})=>{const table=tables.find(item=>item.id===group.tableId),contact=[person.email,person.phone].filter(Boolean).join(' · ')||'No contact details';return '<button type="button" class="table-person-result" data-table-person data-table-id="'+esc(group.tableId||'')+'" data-rsvp-id="'+esc(group.rsvpId)+'"><span><b>'+esc(person.name)+'</b><small>'+esc(contact)+'</small></span><strong>'+esc(table?.label||'Unassigned')+'</strong></button>';}).join('')||'<div class="table-person-empty">No matching people.</div>';
  results.querySelectorAll('[data-table-person]').forEach(button=>button.onclick=()=>openTableFromSearch(button.dataset.tableId||null,button.dataset.rsvpId));
}
function openTableFromSearch(tableId,rsvpId){
  hallMapOpen=false;selectedTableId=tableId||null;tableSpendNotice=null;renderHallMap();renderTables();const results=document.getElementById('tablePeopleResults');if(results)results.hidden=true;requestAnimationFrame(()=>{const target=Array.from(document.querySelectorAll('[data-group-rsvp]')).find(element=>element.dataset.groupRsvp===String(rsvpId))||document.getElementById('selectedTableDetail');if(!target)return;target.classList.add('search-hit');target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});setTimeout(()=>target.classList.remove('search-hit'),1400);});
}
function renderTables(){
  const box=document.getElementById('tablesView'),tables=tablesData.tables||[],groups=tablesData.groups||[];
  const cards=[{id:null,label:'Unassigned'}].concat(tables);
  if(selectedTableId!==null&&!tables.some(t=>t.id===selectedTableId))selectedTableId=null;
  const current=cards.find(t=>(t.id||null)===selectedTableId)||cards[0],assigned=groups.filter(g=>(g.tableId||null)===(current.id||null)),available=groups.filter(g=>(g.tableId||null)!==(current.id||null)).filter(groupMatchesTableSearch).sort((a,b)=>Number(b.wantsTableReservation)-Number(a.wantsTableReservation));
  const used=assigned.reduce((s,g)=>s+g.size,0);
  const spend=current.id?(TABLES_READ_ONLY?minimumSpendReadOnly(current):minimumSpendEditor(current)):'';
  box.innerHTML='<div class="table-list">'+cards.map(t=>{const rows=groups.filter(g=>(g.tableId||null)===(t.id||null)),guests=rows.reduce((s,g)=>s+g.size,0),active=(t.id||null)===(current.id||null);return '<button class="table-chip '+(active?'active':'')+'" data-table-id="'+esc(t.id||'')+'"><b>'+esc(t.label)+'</b><small>'+(t.id?guests+' guest'+(guests===1?'':'s')+' · '+formatMinimumSpend(t.minimumSpendEur)+' min':rows.length+' waiting')+'</small></button>';}).join('')+'</div><div class="table-detail" id="selectedTableDetail"><div class="table-detail-head"><div><h2>'+esc(current.label)+'</h2><p class="small">'+(current.id?'Assigned reservation groups':'Attending groups waiting for a table')+'</p></div><div class="guest-count">'+(current.id?used+' guest'+(used===1?'':'s'):'Unassigned')+'</div></div>'+spend+'<div class="table-groups">'+(assigned.map(g=>groupCard(g,current.id,tables)).join('')||'<div class="empty-state">No groups here.</div>')+'</div>'+(current.id&&!TABLES_READ_ONLY?'<div class="table-add"><div class="table-add-head"><h3>Add to '+esc(current.label)+'</h3><input class="table-search" id="tableSearch" placeholder="Search all guests" value="'+esc(tableSearch)+'" autocomplete="off"/></div><div class="available-list">'+(available.map(g=>groupCard(g,current.id,tables,true)).join('')||'<div class="empty-state">'+(tableSearch?'No matching reservation groups.':'No other reservation groups.')+'</div>')+'</div></div>':'')+'</div>';
  box.querySelectorAll('.table-chip').forEach(b=>b.onclick=()=>{selectedTableId=b.dataset.tableId||null;tableSpendNotice=null;renderTables();});
  const spendInput=box.querySelector('[data-minimum-spend]'),spendButton=box.querySelector('[data-save-minimum-spend]');if(spendInput&&spendButton){spendButton.onclick=()=>saveMinimumSpend(spendInput);spendInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();saveMinimumSpend(spendInput);}};}
  const search=box.querySelector('#tableSearch');if(search)search.oninput=()=>{tableSearch=search.value;renderTables();};
  box.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>assignTable(b.dataset.rsvpId,b.dataset.assign||null));
  box.querySelectorAll('select').forEach(s=>s.onchange=()=>assignTable(s.dataset.rsvpId,s.value||null));
  box.querySelectorAll('[data-reservation-id]').forEach(cb=>cb.onchange=()=>toggleReservation(cb,cb.dataset.reservationId,cb.checked));
}
function formatMinimumSpend(value){return '€'+Number(value||0).toLocaleString('en-US');}
function minimumSpendReadOnly(table){return '<div class="minimum-spend"><span>Minimum spend (EUR)</span><strong>'+formatMinimumSpend(table.minimumSpendEur)+'</strong></div>';}
function minimumSpendEditor(table){const notice=tableSpendNotice?.tableId===table.id?tableSpendNotice:null;return '<div class="minimum-spend"><span>Minimum spend (EUR)</span><div class="minimum-spend-controls"><input type="number" min="0" step="1" inputmode="numeric" data-minimum-spend="'+esc(table.id)+'" value="'+esc(table.minimumSpendEur||0)+'" aria-label="Minimum spend in EUR"/><button type="button" data-save-minimum-spend>Save</button></div><p class="minimum-spend-state '+(notice?.error?'err':'')+'" aria-live="polite">'+esc(notice?.text||'')+'</p></div>';}
async function saveMinimumSpend(input){
  const raw=input.value.trim(),minimumSpendEur=raw===''?0:Number(raw),tableId=input.dataset.minimumSpend;
  if(!/^\\d*$/.test(raw)||!Number.isSafeInteger(minimumSpendEur)||minimumSpendEur<0){tableSpendNotice={tableId,text:'Enter a whole euro amount.',error:true};renderTables();return;}
  tableSpendNotice={tableId,text:'Saving...',error:false};input.disabled=true;const editor=input.closest('.minimum-spend'),button=editor?.querySelector('[data-save-minimum-spend]'),state=editor?.querySelector('.minimum-spend-state');if(button)button.disabled=true;if(state)state.textContent='Saving...';
  let res,data;try{res=await fetch('/api/staff/tables',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({tableId,minimumSpendEur})});data=await res.json();}catch(_){tableSpendNotice={tableId,text:'No connection.',error:true};renderTables();return;}
  if(!res.ok){tableSpendNotice={tableId,text:data.error||'Could not update minimum spend.',error:true};renderTables();return;}
  const table=(tablesData.tables||[]).find(t=>t.id===tableId);if(table)table.minimumSpendEur=data.minimumSpendEur;tableSpendNotice={tableId,text:'Saved.',error:false};renderTables();
}
function groupMatchesTableSearch(g){
  const q=tableSearch.trim().toLowerCase();if(!q)return true;
  return [g.name,g.size,g.wantsTableReservation?'requested table':'',g.reservationConfirmed?'confirmed':'unconfirmed',g.tableId?'assigned':'unassigned'].concat(g.people||[]).some(v=>String(v||'').toLowerCase().includes(q));
}
function groupCard(g,currentId,tables,asAdd){
  const people=(g.people&&g.people.length?g.people:[g.name]).map(p=>'<span class="person">'+esc(p)+'</span>').join('');
  const request=g.wantsTableReservation?' <span class="pill">requested table</span>':'';
  const confirmed=g.reservationConfirmed?' <span class="pill">confirmed</span>':'';
  const action=asAdd?'<button class="primary" data-rsvp-id="'+esc(g.rsvpId)+'" data-assign="'+esc(currentId)+'">Add</button>':(currentId?'<button data-rsvp-id="'+esc(g.rsvpId)+'" data-assign="">Remove</button>':'');
  const controls=TABLES_READ_ONLY?'':'<label class="mini-check"><input type="checkbox" '+(g.reservationConfirmed?'checked':'')+' data-reservation-id="'+esc(g.rsvpId)+'"/>Confirmed</label>'+action+(asAdd?'':tableSelect(g,tables));
  return '<div class="group" data-group-rsvp="'+esc(g.rsvpId)+'"><div><div class="group-main">'+esc(g.name)+' <span class="pill">'+g.size+'</span>'+request+confirmed+'</div><div class="people">'+people+'</div></div><div class="group-actions">'+controls+'</div></div>';
}
function tableSelect(g,tables){return '<select aria-label="Move group" data-rsvp-id="'+esc(g.rsvpId)+'"><option value="">Unassigned</option>'+tables.map(t=>'<option value="'+esc(t.id)+'" '+(g.tableId===t.id?'selected':'')+'>'+esc(t.label)+'</option>').join('')+'</select>';}
async function assignTable(rsvpId,tableId){await fetch('/api/staff/table-assignment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rsvpId:Number(rsvpId),tableId})});await loadTables();await loadMembers();}
function exportTablesCsv(){
  const tables=tablesData?.tables||[],groups=tablesData?.groups||[];
  const tableName=id=>{const table=tables.find(t=>t.id===id);return table?table.label:'Unassigned';};
  const rows=[['Table','Minimum spend EUR','Guests','Group','People','Reservation requested','Reservation confirmed']].concat(groups.map(g=>{const table=tables.find(t=>t.id===g.tableId),same=groups.filter(x=>(x.tableId||null)===(g.tableId||null)),used=same.reduce((s,x)=>s+x.size,0);return [tableName(g.tableId),table?.minimumSpendEur||0,used,g.name,(g.people||[]).join(' | '),g.wantsTableReservation?'yes':'no',g.reservationConfirmed?'yes':'no'];}));
  downloadCsv('whispers-tables.csv',rows);
}
async function loadInvites(){
  const body=document.querySelector('#invitesTable tbody');body.innerHTML='<tr><td colspan="'+inviteColspan()+'">Loading...</td></tr>';
  let res,data;try{res=await fetch('/api/staff/invites',{headers:{'Accept':'application/json'}});data=await res.json();}catch(e){body.innerHTML='<tr><td colspan="'+inviteColspan()+'">No connection.</td></tr>';return;}
  if(!res.ok){body.innerHTML='<tr><td colspan="'+inviteColspan()+'">'+esc(data.error||'Could not load invites')+'</td></tr>';return;}
  invites=data.invites||[];renderInvites();
}
function inviteColspan(){return IS_OWNER?9:8;}
function inviteStatusLabel(status){return status==='attending'?'Attending':status==='declined'?'Declined':'Not responded';}
function inviteTypeLabel(i){return i.source==='companion'?'Added guest':i.source==='rsvp'?'Direct RSVP':'Admin invite';}
function inviteNameCell(i){const extra=[inviteTypeLabel(i),i.guestOf?'Guest of '+i.guestOf:''].filter(Boolean).join(' - ');return esc(i.name)+(extra?'<br><span class="small">'+esc(extra)+'</span>':'');}
function inviteEditableCell(i,field){if(inviteEditId!==i.id)return esc(i[field]||'');const max=field==='email'?254:field==='phone'?40:120,inputmode=field==='email'?' inputmode="email"':field==='phone'?' inputmode="tel"':'';return '<input class="staff-control" data-invite-field="'+field+'" value="'+esc(i[field]||'')+'" maxlength="'+max+'"'+inputmode+'/>';}
function filteredInvites(){const q=document.getElementById('inviteSearch').value.trim().toLowerCase();return invites.filter(i=>!q||[i.name,i.email,i.phone,i.status,inviteStatusLabel(i.status),inviteTypeLabel(i),i.guestOf,i.confirmationEmailSentAt?'sent':'not sent',i.inviteLink,i.confirmationLink,i.ticketLink].some(v=>String(v||'').toLowerCase().includes(q)));}
function exportInvitesCsv(){const rows=[['Name','Type','Guest of','Email','Phone','Status','Invite link','Confirmation link','Ticket link','Invite email sent','Send count','Created','Submitted']].concat(filteredInvites().map(i=>[i.name,inviteTypeLabel(i),i.guestOf,i.email,i.phone,inviteStatusLabel(i.status),i.inviteLink,i.confirmationLink,i.ticketLink,i.confirmationEmailSentAt,i.confirmationEmailSendCount,i.createdAt,i.submittedAt]));downloadCsv('whispers-invites.csv',rows);}
function renderInvites(){
  const body=document.querySelector('#invitesTable tbody'),rows=filteredInvites();
  const visible=pageRows(rows,invitesPage);
  body.innerHTML=visible.map(i=>'<tr><td>'+(inviteEditId===i.id?inviteEditableCell(i,'name'):inviteNameCell(i))+'</td><td>'+inviteEditableCell(i,'email')+'</td><td>'+inviteEditableCell(i,'phone')+'</td><td>'+esc(inviteStatusLabel(i.status))+(i.submittedAt?'<br><span class="pill">'+esc(new Date(i.submittedAt).toLocaleString())+'</span>':'')+'</td><td>'+linkActionCell(i,'invite',i.inviteLink)+'</td><td>'+linkActionCell(i,'confirmation',i.confirmationLink)+'</td><td>'+linkActionCell(i,'ticket',i.ticketLink)+'</td><td>'+esc(i.createdAt?new Date(i.createdAt).toLocaleString():'')+'</td>'+(IS_OWNER?'<td>'+inviteActionsCell(i)+'</td>':'')+'</tr>').join('')||'<tr><td colspan="'+inviteColspan()+'">No invites.</td></tr>';
  renderPager('invitesPager',rows,invitesPage,p=>{invitesPage=p;renderInvites();});
  body.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyText(b.dataset.copy,b));
  body.querySelectorAll('[data-send-link-id]').forEach(b=>b.onclick=()=>sendLinkEmail(b.dataset.sendLinkId,b.dataset.sendLinkType,b));
  body.querySelectorAll('[data-invite-edit-id]').forEach(b=>b.onclick=()=>{inviteEditId=b.dataset.inviteEditId;renderInvites();});
  body.querySelectorAll('[data-invite-save-id]').forEach(b=>b.onclick=()=>saveInviteEdit(b.dataset.inviteSaveId));
  body.querySelectorAll('[data-invite-delete-id]').forEach(b=>b.onclick=()=>deleteInvite(b.dataset.inviteDeleteId));
}
function isEditableInviteRow(i){return Boolean(i&&i.inviteLink&&!String(i.id||'').startsWith('rsvp:')&&!String(i.id||'').startsWith('companion:'));}
function inviteActionsCell(i){
  if(!IS_OWNER||!isEditableInviteRow(i))return '';
  if(inviteEditId===i.id)return '<div class="staff-row-actions"><button class="copy-btn primary" data-invite-save-id="'+esc(i.id)+'">Save</button><button class="copy-btn" data-invite-edit-id="">Cancel</button></div>';
  return '<div class="staff-row-actions"><button class="copy-btn" data-invite-edit-id="'+esc(i.id)+'">Edit</button><button class="copy-btn" data-invite-delete-id="'+esc(i.id)+'">Delete</button></div>';
}
async function saveInviteEdit(id){
  const row=document.querySelector('[data-invite-save-id="'+CSS.escape(id)+'"]')?.closest('tr');if(!row)return;
  const payload={id};row.querySelectorAll('[data-invite-field]').forEach(input=>payload[input.dataset.inviteField]=input.value);
  setInviteNotice('Saving invite...',false);
  let res,data;try{res=await fetch('/api/staff/invites',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});data=await res.json();}catch(_){setInviteNotice('No connection.',true);return;}
  if(!res.ok){setInviteNotice(data.error||'Could not save invite',true);return;}
  inviteEditId=null;setInviteNotice('Invite saved.',false);await loadInvites();
}
async function deleteInvite(id){
  if(!window.confirm('Delete this invite and any linked RSVP record?'))return;
  setInviteNotice('Deleting invite...',false);
  let res,data;try{res=await fetch('/api/staff/invites',{method:'DELETE',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id})});data=await res.json();}catch(_){setInviteNotice('No connection.',true);return;}
  if(!res.ok){setInviteNotice(data.error||'Could not delete invite',true);return;}
  if(inviteEditId===id)inviteEditId=null;setInviteNotice('Invite deleted.',false);await loadInvites();await loadMembers();await loadTables();
}
function linkActionCell(i,type,link){
  const canSend=type==='invite'?Boolean(i.email):Boolean(link&&(i.rsvpEmail||i.email));
  const stamp=type==='invite'&&i.confirmationEmailSentAt?'<br><span class="pill">'+esc(new Date(i.confirmationEmailSentAt).toLocaleString())+'</span>':'';
  return '<div class="link-cell">'+esc(link)+'</div><button class="copy-btn" data-copy="'+esc(link)+'" '+(link?'':'disabled')+'>Copy</button> <button class="copy-btn" data-send-link-id="'+esc(i.id)+'" data-send-link-type="'+esc(type)+'" '+(canSend?'':'disabled')+'>Send</button>'+stamp;
}
function setInviteNotice(message,isError){
  const state=document.getElementById('inviteState');
  state.className='invite-state'+(isError?' err':'');
  state.textContent=message||'';
}
async function sendLinkEmail(id,type,button){
  button.disabled=true;button.textContent='Sending';
  setInviteNotice('Sending '+type+'...',false);
  let res,data;try{res=await fetch('/api/staff/invite-send',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id,type})});data=await res.json();}catch(e){button.disabled=false;button.textContent='Send';setInviteNotice('No connection.',true);return;}
  if(!res.ok){button.disabled=false;button.textContent='Send';setInviteNotice(data.error||'Could not send '+type,true);return;}
  const item=invites.find(i=>i.id===id);if(item&&type==='invite'){item.confirmationEmailSentAt=data.confirmationEmailSentAt;item.confirmationEmailSendCount=data.confirmationEmailSendCount;}
  setInviteNotice('Sent.',false);
  renderInvites();
}
async function copyText(value,button){if(!value)return;try{await navigator.clipboard.writeText(value);button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1200);}catch(_){window.prompt('Copy link',value);}}
function setMenuState(message,isError){const state=document.getElementById('menuState');state.className='invite-state'+(isError?' err':'');state.textContent=message||'';}
function renderMenuQr(){
  const target=document.getElementById('menuQr');if(!target||target.dataset.ready==='1')return;target.textContent='';
  if(!window.QRCode){target.textContent=MENU_URL;setMenuState('QR code could not be loaded.',true);return;}
  QRCode.toCanvas(MENU_URL,{width:320,margin:4,color:{dark:'#FFFFFF',light:'#000000'}},(error,qrCanvas)=>{if(error){target.textContent=MENU_URL;setMenuState('QR code could not be loaded.',true);return;}target.dataset.ready='1';target.appendChild(qrCanvas);setMenuState('',false);});
}
async function copyMenuLink(){
  const button=document.getElementById('copyMenuLink');
  try{await navigator.clipboard.writeText(MENU_URL);button.textContent='Copied';setMenuState('Link copied.',false);setTimeout(()=>button.textContent='Copy Link',1200);return true;}catch(_){window.prompt('Copy link',MENU_URL);setMenuState('Copy the link above.',false);return false;}
}
async function shareMenuLink(){
  if(navigator.share){try{await navigator.share({title:'WHISPERS Menu',url:MENU_URL});setMenuState('Shared.',false);return;}catch(error){if(error&&error.name==='AbortError')return;setMenuState('Could not open sharing.',true);return;}}
  await copyMenuLink();
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function qrSvgString(){return new Promise((resolve,reject)=>QRCode.toString(MENU_URL,{type:'svg',margin:4,color:{dark:'#FFFFFF',light:'#000000'}},(error,svg)=>error?reject(error):resolve(svg)));}
function qrPrintCanvas(){return new Promise((resolve,reject)=>QRCode.toCanvas(MENU_URL,{width:PRINT_SIZE,margin:4,color:{dark:'#FFFFFF',light:'#000000'}},(error,canvas)=>error?reject(error):resolve(canvas)));}
async function downloadMenuSvg(){
  if(!window.QRCode){setMenuState('QR code could not be loaded.',true);return;}
  setMenuState('Preparing SVG...',false);
  try{const svg=await qrSvgString();downloadBlob(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),'whispers-menu-qr.svg');setMenuState('SVG downloaded.',false);}catch(_){setMenuState('Could not create the SVG.',true);}
}
async function downloadMenuPng(){
  if(!window.QRCode){setMenuState('QR code could not be loaded.',true);return;}
  setMenuState('Preparing PNG...',false);
  try{
    const canvas=await qrPrintCanvas(),blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not create PNG')),'image/png'));downloadBlob(blob,'whispers-menu-qr-2400.png');setMenuState('PNG downloaded.',false);
  }catch(_){setMenuState('Could not create the PNG.',true);}
}
async function downloadMenuPdfA4(){
  if(!window.QRCode||!window.jspdf||!window.jspdf.jsPDF){setMenuState('PDF could not be loaded.',true);return;}
  setMenuState('Preparing A4 PDF...',false);
  try{const canvas=await qrPrintCanvas(),pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),size=180;pdf.setFillColor(0,0,0);pdf.rect(0,0,210,297,'F');pdf.addImage(canvas,'PNG',(210-size)/2,(297-size)/2,size,size,undefined,'FAST');pdf.save('whispers-menu-qr-a4.pdf');setMenuState('A4 PDF downloaded.',false);}catch(_){setMenuState('Could not create the A4 PDF.',true);}
}
async function downloadMenuPdfSquare(){
  if(!window.QRCode||!window.jspdf||!window.jspdf.jsPDF){setMenuState('PDF could not be loaded.',true);return;}
  setMenuState('Preparing square PDF...',false);
  try{const canvas=await qrPrintCanvas(),pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:[200,200],compress:true});pdf.addImage(canvas,'PNG',0,0,200,200,undefined,'FAST');pdf.save('whispers-menu-qr-square.pdf');setMenuState('Square PDF downloaded.',false);}catch(_){setMenuState('Could not create the square PDF.',true);}
}
const copyMenuButton=document.getElementById('copyMenuLink'),shareMenuButton=document.getElementById('shareMenuLink'),downloadMenuSvgButton=document.getElementById('downloadMenuSvg'),downloadMenuPngButton=document.getElementById('downloadMenuPng'),downloadMenuPdfA4Button=document.getElementById('downloadMenuPdfA4'),downloadMenuPdfSquareButton=document.getElementById('downloadMenuPdfSquare');
if(copyMenuButton)copyMenuButton.onclick=copyMenuLink;
if(shareMenuButton)shareMenuButton.onclick=shareMenuLink;
if(downloadMenuSvgButton)downloadMenuSvgButton.onclick=downloadMenuSvg;
if(downloadMenuPngButton)downloadMenuPngButton.onclick=downloadMenuPng;
if(downloadMenuPdfA4Button)downloadMenuPdfA4Button.onclick=downloadMenuPdfA4;
if(downloadMenuPdfSquareButton)downloadMenuPdfSquareButton.onclick=downloadMenuPdfSquare;
document.getElementById('inviteSearch').oninput=()=>{invitesPage=1;renderInvites();};
const exportInvitesButton=document.getElementById('exportInvites');
if(exportInvitesButton)exportInvitesButton.onclick=exportInvitesCsv;
document.getElementById('reloadInvites').onclick=loadInvites;
const exportTablesButton=document.getElementById('exportTables');
if(exportTablesButton)exportTablesButton.onclick=exportTablesCsv;
document.getElementById('toggleHallMap').onclick=()=>{hallMapOpen=!hallMapOpen;document.getElementById('hallMapState').textContent='';renderHallMap();if(hallMapOpen)requestAnimationFrame(()=>document.getElementById('hallMap')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));};
document.getElementById('tablePeopleSearch').oninput=renderTablePeopleSearch;
document.getElementById('tablesToTop').onclick=()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
window.addEventListener('scroll',updateTablesToTop,{passive:true});
document.getElementById('inviteForm').onsubmit=async(e)=>{
  e.preventDefault();
  const state=document.getElementById('inviteState');state.className='invite-state';state.textContent='Creating invite...';
  const payload={name:document.getElementById('inviteName').value,email:document.getElementById('inviteEmail').value,phone:document.getElementById('invitePhone').value};
  let res,data;try{res=await fetch('/api/staff/invites',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});data=await res.json();}catch(err){state.className='invite-state err';state.textContent='No connection.';return;}
  if(!res.ok){state.className='invite-state err';state.textContent=data.error||'Could not create invite';return;}
  document.getElementById('inviteForm').reset();
  if(data.emailDelivery?.error){state.className='invite-state err';state.textContent='Invite created, but email was not sent: '+data.emailDelivery.error;}
  else state.textContent=data.emailDelivery?.sent?'Invite created and sent.':'Invite created.';
  await loadInvites();
};
function setRsvpSettingsNotice(setting,message,isError){const state=document.getElementById(RSVP_SETTING_UI[setting]?.state);if(!state)return;state.className='invite-state'+(isError?' err':'');state.textContent=message||'';}
function setRsvpSettingsBusy(setting,busy){const ui=RSVP_SETTING_UI[setting],input=document.getElementById(ui?.input),apply=document.getElementById(ui?.apply),cancel=document.getElementById(ui?.cancel);if(input)input.disabled=busy;if(apply)apply.disabled=busy||!rsvpSettings[setting];if(cancel)cancel.disabled=busy;}
function updateRsvpActionLabel(setting){const ui=RSVP_SETTING_UI[setting],button=document.getElementById(ui?.apply),input=document.getElementById(ui?.input),policy=rsvpSettings[setting];if(!button||!policy)return;const action=policy.isOpen?'lock':'unlock';button.textContent=input?.value?'Schedule '+action:(policy.isOpen?'Lock now':'Unlock now');}
function renderRsvpSetting(setting,policy){
  const ui=RSVP_SETTING_UI[setting];rsvpSettings[setting]=policy;const status=document.getElementById(ui?.status),scheduled=document.getElementById(ui?.scheduled),cancel=document.getElementById(ui?.cancel);if(!status||!scheduled||!cancel)return;
  status.textContent=policy.isOpen?'OPEN':'LOCKED';status.className='settings-status'+(policy.isOpen?'':' locked');
  const change=policy.scheduledChange;if(change){const at=new Date(change.at).toLocaleString('en-GB',{timeZone:'Europe/Sofia',dateStyle:'medium',timeStyle:'short'});scheduled.textContent=(change.open?'Unlocks':'Locks')+' automatically on '+at+' (Europe/Sofia).';scheduled.hidden=false;cancel.hidden=false;}else{scheduled.textContent='';scheduled.hidden=true;cancel.hidden=true;}
  setRsvpSettingsBusy(setting,false);updateRsvpActionLabel(setting);
}
async function loadSettings(){
  if(!IS_OWNER)return;for(const setting of Object.keys(RSVP_SETTING_UI)){setRsvpSettingsNotice(setting,'Loading...',false);setRsvpSettingsBusy(setting,true);}
  let res,data;try{res=await fetch('/api/staff/settings',{headers:{'Accept':'application/json'}});data=await res.json();}catch(_){for(const setting of Object.keys(RSVP_SETTING_UI)){setRsvpSettingsNotice(setting,'No connection.',true);setRsvpSettingsBusy(setting,false);}return;}
  if(!res.ok){for(const setting of Object.keys(RSVP_SETTING_UI)){setRsvpSettingsNotice(setting,data.error||'Could not load RSVP settings',true);setRsvpSettingsBusy(setting,false);}return;}
  for(const setting of Object.keys(RSVP_SETTING_UI)){renderRsvpSetting(setting,data.rsvp[setting]);setRsvpSettingsNotice(setting,'',false);}
}
async function saveRsvpSetting(setting,targetOpen){
  const input=document.getElementById(RSVP_SETTING_UI[setting]?.input);setRsvpSettingsNotice(setting,'Saving...',false);setRsvpSettingsBusy(setting,true);
  let res,data;try{res=await fetch('/api/staff/settings',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({setting,targetOpen,changeAtLocal:input?.value||null})});data=await res.json();}catch(_){setRsvpSettingsNotice(setting,'No connection.',true);setRsvpSettingsBusy(setting,false);return;}
  if(!res.ok){setRsvpSettingsNotice(setting,data.error||'Could not save RSVP settings',true);setRsvpSettingsBusy(setting,false);return;}
  if(input)input.value='';for(const key of Object.keys(RSVP_SETTING_UI))renderRsvpSetting(key,data.rsvp[key]);setRsvpSettingsNotice(setting,data.rsvp[setting].scheduledChange?'Scheduled.':'Saved.',false);
}
async function cancelRsvpSchedule(setting){
  setRsvpSettingsNotice(setting,'Cancelling...',false);setRsvpSettingsBusy(setting,true);
  let res,data;try{res=await fetch('/api/staff/settings',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({setting,cancelScheduledChange:true})});data=await res.json();}catch(_){setRsvpSettingsNotice(setting,'No connection.',true);setRsvpSettingsBusy(setting,false);return;}
  if(!res.ok){setRsvpSettingsNotice(setting,data.error||'Could not cancel scheduled change',true);setRsvpSettingsBusy(setting,false);return;}
  for(const key of Object.keys(RSVP_SETTING_UI))renderRsvpSetting(key,data.rsvp[key]);setRsvpSettingsNotice(setting,'Scheduled change cancelled.',false);
}
for(const setting of Object.keys(RSVP_SETTING_UI)){const ui=RSVP_SETTING_UI[setting],input=document.getElementById(ui.input),apply=document.getElementById(ui.apply),cancel=document.getElementById(ui.cancel);if(input)input.oninput=()=>updateRsvpActionLabel(setting);if(apply)apply.onclick=()=>{const policy=rsvpSettings[setting];if(policy)saveRsvpSetting(setting,!policy.isOpen);};if(cancel)cancel.onclick=()=>cancelRsvpSchedule(setting);}
async function loadStaffUsers(){
  if(STAFF_USER.role!=='owner')return;
  const state=document.getElementById('staffState'),body=document.querySelector('#staffUsersTable tbody');state.className='invite-state';state.textContent='';body.innerHTML='<tr><td colspan="6">Loading...</td></tr>';
  let res,data;try{res=await fetch('/api/staff/users',{headers:{'Accept':'application/json'}});data=await res.json();}catch(_){body.innerHTML='<tr><td colspan="6">No connection.</td></tr>';return;}
  if(!res.ok){body.innerHTML='<tr><td colspan="6">'+esc(data.error||'Could not load staff users')+'</td></tr>';return;}
  staffUsers=data.users||[];renderStaffUsers();
}
function renderStaffUsers(){
  const body=document.querySelector('#staffUsersTable tbody');
  body.innerHTML=staffUsers.map(u=>'<tr><td><input class="staff-control" data-staff-username="'+esc(u.id)+'" value="'+esc(u.username)+'"/></td><td><select class="staff-select" data-staff-role="'+esc(u.id)+'"><option value="owner" '+(u.role==='owner'?'selected':'')+'>owner</option><option value="admin" '+(u.role==='admin'?'selected':'')+'>admin</option><option value="door" '+(u.role==='door'?'selected':'')+'>door</option><option value="service" '+(u.role==='service'?'selected':'')+'>service</option></select></td><td><input type="checkbox" '+(u.active?'checked':'')+' data-staff-active="'+esc(u.id)+'"/></td><td>'+esc(u.createdAt?new Date(u.createdAt).toLocaleString():'')+'</td><td>'+esc(u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString():'')+'</td><td><div class="staff-row-actions"><button data-staff-save="'+esc(u.id)+'">Save</button><button data-staff-reset="'+esc(u.id)+'">Reset Password</button><button data-staff-delete="'+esc(u.id)+'">Delete</button></div></td></tr>').join('')||'<tr><td colspan="6">No staff users.</td></tr>';
  body.querySelectorAll('[data-staff-save]').forEach(b=>b.onclick=()=>saveStaffUser(b.dataset.staffSave));
  body.querySelectorAll('[data-staff-reset]').forEach(b=>b.onclick=()=>resetStaffPassword(b.dataset.staffReset));
  body.querySelectorAll('[data-staff-delete]').forEach(b=>b.onclick=()=>deleteStaffUser(b.dataset.staffDelete));
}
function showStaffPassword(temporaryPassword){
  const box=document.getElementById('staffPasswordReveal'),value=document.getElementById('staffPasswordValue');
  value.textContent=temporaryPassword||'';box.classList.toggle('on',Boolean(temporaryPassword));box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function copyStaffPassword(){
  const value=document.getElementById('staffPasswordValue').textContent;if(!value)return;
  try{await navigator.clipboard.writeText(value);document.getElementById('copyStaffPassword').textContent='Copied';setTimeout(()=>document.getElementById('copyStaffPassword').textContent='Copy Password',1200);}catch(_){window.prompt('Copy password',value);}
}
document.getElementById('copyStaffPassword').onclick=copyStaffPassword;
document.getElementById('staffCreate').onsubmit=async(e)=>{
  e.preventDefault();const state=document.getElementById('staffState');state.className='invite-state';state.textContent='Creating staff user...';
  let res,data;try{res=await fetch('/api/staff/users',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({username:document.getElementById('newStaffUsername').value})});data=await res.json();}catch(_){state.className='invite-state err';state.textContent='No connection.';return;}
  if(!res.ok){state.className='invite-state err';state.textContent=data.error||'Could not create staff user';return;}
  document.getElementById('staffCreate').reset();state.textContent='Admin created.';showStaffPassword(data.temporaryPassword);await loadStaffUsers();
};
async function saveStaffUser(id){
  const username=document.querySelector('[data-staff-username="'+CSS.escape(id)+'"]').value,role=document.querySelector('[data-staff-role="'+CSS.escape(id)+'"]').value,active=document.querySelector('[data-staff-active="'+CSS.escape(id)+'"]').checked;
  const state=document.getElementById('staffState');state.className='invite-state';state.textContent='Saving...';
  let res,data;try{res=await fetch('/api/staff/users',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id,username,role,active})});data=await res.json();}catch(_){state.className='invite-state err';state.textContent='No connection.';return;}
  if(!res.ok){state.className='invite-state err';state.textContent=data.error||'Could not save staff user';return;}
  state.textContent='Saved.';await loadStaffUsers();
}
async function resetStaffPassword(id){
  if(!window.confirm('Generate a new password for this staff user?'))return;
  const state=document.getElementById('staffState');state.className='invite-state';state.textContent='Resetting password...';
  let res,data;try{res=await fetch('/api/staff/users/password',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id})});data=await res.json();}catch(_){state.className='invite-state err';state.textContent='No connection.';return;}
  if(!res.ok){state.className='invite-state err';state.textContent=data.error||'Could not reset password';return;}
  state.textContent='Password reset.';showStaffPassword(data.temporaryPassword);
}
async function deleteStaffUser(id){
  if(!window.confirm('Delete this staff user?'))return;
  const state=document.getElementById('staffState');state.className='invite-state';state.textContent='Deleting...';
  let res,data;try{res=await fetch('/api/staff/users',{method:'DELETE',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({id})});data=await res.json();}catch(_){state.className='invite-state err';state.textContent='No connection.';return;}
  if(!res.ok){state.className='invite-state err';state.textContent=data.error||'Could not delete staff user';return;}
  state.textContent='Deleted.';await loadStaffUsers();
}
if(currentView==='scanner')loadList();
window.__WHISPERS_STAFF_MAIN_READY=true;
</script>
    <script defer src="/assets/hall-plan.js?v=20261008-map3"></script>
    <script defer src="/assets/staff-admin-fallback.js?v=20261008-settings2"></script>
<script async src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
