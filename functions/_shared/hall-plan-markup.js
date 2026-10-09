// MAP tab: the organizer's floor plan (docs/floor-plan/whispers-floor-plan-rev-d.html, Rev D 08.10.2026),
// reproduced 1:1. Tables are not part of the markup: assets/hall-plan.js draws them into #hmTables.
// The right-hand column sits behind the Legend button. Every CSS rule is scoped under .hm.
export const HALL_PLAN_STYLE = `@font-face{font-family:"HM Cormorant";src:url("/assets/hm-cormorant-garamond.ttf") format("truetype");font-weight:300 700;font-style:normal;font-display:swap}
@font-face{font-family:"HM Plex Mono";src:url("/assets/hm-ibm-plex-mono-400.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"HM Plex Mono";src:url("/assets/hm-ibm-plex-mono-500.ttf") format("truetype");font-weight:500;font-style:normal;font-display:swap}
.hm{--ink:#0C0B0A;--ink-2:#13120F;--brass:#C9A063;--brass-dim:#6E5A38;--parch:#E8DFCF;--parch-dim:#9A907E;--crimson:#A31621;--crimson-lt:#D4414E;--warn:#C9752A;--fd:"HM Cormorant",Georgia,"Times New Roman",serif;--fm:"HM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;color-scheme:dark;background:var(--ink);color:var(--parch);font-family:var(--fm);font-weight:400;font-size:14px;letter-spacing:0;text-transform:none;padding-block:clamp(14px,2.4vw,24px);padding-inline:clamp(12px,2vw,16px);margin:16px 0;-webkit-font-smoothing:antialiased}
.hm *{box-sizing:border-box}
.hm .sheet{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:clamp(14px,2vw,22px)}
.hm .hm-bar{display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap;width:100%;max-width:880px;margin:0 auto}
.hm .hm-bar:has(+ .hm-legend-open){max-width:none}
.hm .hm-hint{margin:0;font-size:11px;line-height:1.5;letter-spacing:.14em;text-transform:uppercase;color:var(--parch-dim)}
.hm .hm-legend-toggle{min-height:44px;padding:0 18px;font:400 11px var(--fm);letter-spacing:.22em;text-transform:uppercase;border:1px solid var(--brass-dim);border-radius:0;background:transparent;color:var(--brass)}
.hm .hm-legend-toggle[aria-expanded="true"]{background:var(--brass);border-color:var(--brass);color:var(--ink)}
.hm .hm-tools{display:flex;gap:8px;align-items:center}.hm .hm-tools button{min-height:44px;padding:0 14px;font:400 10.5px var(--fm);letter-spacing:.16em;text-transform:uppercase;border:1px solid var(--brass-dim);border-radius:0;background:transparent;color:var(--parch)}.hm .hm-tools button:disabled{opacity:.4}.hm .hm-tools[hidden]{display:none}
.hm .cols{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(20px,3vw,34px);align-items:start}
.hm .cols.hm-legend-open{grid-template-columns:minmax(0,1.62fr) minmax(0,1fr)}
@media (max-width:860px){.hm .cols.hm-legend-open{grid-template-columns:1fr}}
.hm .cols:not(.hm-legend-open) .hm-left{width:100%;max-width:880px;margin:0 auto}
.hm .hm-left{min-width:0}
.hm .draw{min-width:0;border:1px solid var(--brass-dim);background:var(--ink-2);padding:clamp(10px,1.6vw,18px);overflow-x:auto;-webkit-overflow-scrolling:touch}
.hm .draw svg{display:block;width:100%;height:auto;min-width:580px}
.hm .floor{fill:#17160F}
.hm .wall{fill:none;stroke:var(--brass);stroke-width:4.5;stroke-linejoin:miter;pointer-events:none}
.hm .core{fill:#100F0C;stroke:var(--brass-dim);stroke-width:1.4}
.hm .shaft{fill:#0E0D0B;stroke:var(--brass-dim);stroke-width:1.4}
.hm .lift{fill:#191409;stroke:var(--brass);stroke-width:1.6}
.hm .xline{stroke:var(--brass-dim);stroke-width:1}
.hm .step{stroke:var(--brass-dim);stroke-width:.8}
.hm .wine{fill:#241B09;stroke:var(--brass);stroke-width:1.4}
.hm .tech{fill:#0E0D0B;stroke:var(--brass-dim);stroke-width:1.2;stroke-dasharray:4 3}
.hm .barc{fill:#1C1710;stroke:var(--brass-dim);stroke-width:1}
.hm .counter{stroke:var(--brass);stroke-width:3.6;stroke-linecap:round}
.hm .queue{fill:var(--brass);fill-opacity:.06;stroke:var(--brass-dim);stroke-width:.9;stroke-dasharray:4 4}
.hm .concourse{fill:var(--brass);fill-opacity:.075;stroke:var(--brass-dim);stroke-width:1;stroke-dasharray:6 5}
.hm .dj{fill:var(--crimson);fill-opacity:.5;stroke:var(--crimson-lt);stroke-width:1.4}
.hm .dance{fill:var(--crimson);fill-opacity:.14;stroke:var(--crimson-lt);stroke-width:1.2;stroke-dasharray:7 5}
.hm .chill{fill:#16130E;stroke:var(--brass-dim);stroke-width:1.2;stroke-dasharray:5 4}
.hm .spine{fill:var(--brass);fill-opacity:.05}
.hm .drain{stroke:var(--warn);stroke-width:2.4;stroke-dasharray:3 4;opacity:.85}
.hm .col{fill:#4A4034;stroke:var(--parch);stroke-width:1.6}
.hm .colclear{fill:none;stroke:var(--parch-dim);stroke-width:1;stroke-dasharray:3 3;opacity:.6}
.hm .colq{fill:none;stroke:var(--parch-dim);stroke-width:1;stroke-dasharray:2 3;opacity:.5}
.hm .occ{fill:none;stroke:var(--brass-dim);stroke-width:.7;stroke-dasharray:2 4;opacity:.42}
.hm .stool{fill:#201B13;stroke:var(--brass-dim);stroke-width:1}
.hm .stool.prem{stroke:var(--crimson-lt)}
.hm .t{fill:#1B1710;stroke:var(--brass);stroke-width:1.6}
.hm .t.prem{fill:#2A1013;stroke:var(--crimson-lt);stroke-width:2}
.hm .brk{fill:none;stroke:var(--brass);stroke-width:1.6;opacity:.85}
.hm .six{font-family:var(--fm);font-size:8px;fill:var(--brass);letter-spacing:.14em}
.hm .tn{font-family:var(--fm);font-size:11px;fill:var(--parch);pointer-events:none}
.hm .arrow{stroke:var(--brass);stroke-width:2}
.hm .arrowhead{fill:var(--brass)}
.hm .dim{stroke:var(--parch-dim);stroke-width:.8}
.hm .dimt{font-family:var(--fm);font-size:11px;fill:var(--parch-dim);letter-spacing:.08em}
.hm .sb0{fill:var(--brass)}
.hm .sb1{fill:#1D1A13;stroke:var(--brass);stroke-width:.7}
.hm text.zone,.hm text.zoneb,.hm text.zonec{font-family:var(--fm)}
.hm .zone{font-size:10px;fill:var(--parch-dim);letter-spacing:.13em}
.hm .zoneb{font-size:13px;fill:var(--brass);letter-spacing:.2em}
.hm .zonec{font-size:11px;fill:var(--parch);letter-spacing:.17em}
.hm aside{min-width:0;display:flex;flex-direction:column;gap:22px}
.hm .block h2{font-family:var(--fd);font-weight:400;font-size:19px;letter-spacing:.17em;text-transform:uppercase;color:var(--brass);margin:0 0 11px;padding-bottom:7px;border-bottom:1px solid var(--brass-dim)}
.hm .key{display:flex;flex-direction:column;gap:9px;font-size:12.5px;line-height:1.45}
.hm .key div{display:flex;gap:10px;align-items:flex-start}
.hm .sw{flex:0 0 15px;height:15px;margin-top:1px;border:1px solid var(--brass-dim);background:#1B1710}
.hm .sw.p{background:#2A1013;border-color:var(--crimson-lt)}
.hm .sw.d{background:rgba(163,22,33,.5);border-color:var(--crimson-lt)}
.hm .sw.f{background:rgba(163,22,33,.14);border-color:var(--crimson-lt)}
.hm .sw.w{background:#241B09;border-color:var(--brass)}
.hm .sw.q{background:rgba(201,160,99,.06);border-color:var(--brass-dim)}
.hm .sw.k{background:#4A4034;border-color:var(--parch);border-radius:50%}
.hm .sw.g{background:transparent;border:none;border-top:2.4px dashed var(--warn);height:0;margin-top:8px}
.hm .key span{color:var(--parch-dim)}
.hm .key b{color:var(--parch);font-weight:400}
.hm table{min-width:0;width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
.hm td{padding:6.5px 0;border:0;border-bottom:1px solid #241F17;background:none;color:inherit;font-size:12.5px;vertical-align:baseline}
.hm td:last-child{text-align:right;color:var(--brass);white-space:nowrap;padding-left:10px}
.hm tr:last-child td{border-bottom:none}
.hm tbody tr:hover td{background:none}
.hm tr.hi td:last-child{color:var(--crimson-lt)}
.hm tr.hi td:first-child{color:var(--parch)}
.hm .notes{display:flex;flex-direction:column;gap:13px;font-size:12.5px;line-height:1.55;color:var(--parch-dim)}
.hm .notes p{margin:0}
.hm .notes b{color:var(--parch);font-weight:400}
.hm .flag{border-left:2px solid var(--warn);padding-left:12px}
.hm .flag b{color:var(--warn)}
.hm footer{border-top:1px solid var(--brass-dim);padding-top:14px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--parch-dim);display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:space-between}
.hm .hm-t{cursor:pointer;outline:none}
.hm .hm-t .occ{fill:transparent;pointer-events:all}
.hm.hm-drag .hm-t{touch-action:none}
.hm.hm-drag .hm-t *{cursor:grab}
.hm .hm-t.dragging *{cursor:grabbing}
.hm .hm-t.dragging .t{filter:drop-shadow(0 4px 8px rgba(0,0,0,.65)) drop-shadow(0 0 5px rgba(201,160,99,.55))}
.hm .hm-t .t,.hm .hm-t .occ{transition:stroke .15s ease,opacity .15s ease}
.hm .hm-t.hm-edited .t{fill:#2F6B46;stroke:#79C995}
.hm .hm-t.hm-edited .tn{fill:#F1F7F2}
@media (hover:hover){.hm .hm-t:hover .t{stroke:var(--parch)}.hm .hm-t:hover .occ{opacity:.85}}
.hm .hm-t.hm-sel .occ,.hm .hm-t:focus-visible .occ{stroke:var(--parch);stroke-width:1.4;stroke-dasharray:none;opacity:1}
.hm .hm-t.hm-sel .t{stroke:var(--parch);stroke-width:2.6;filter:drop-shadow(0 0 6px rgba(232,223,207,.45))}
.hm .hm-state{min-height:18px;margin:10px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--parch-dim);transition:color .2s ease}
.hm .hm-state.err{color:var(--crimson-lt)}
.hm .hm-off{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--parch-dim)}
.hm .hm-off button{min-height:40px;padding:0 12px;font:400 12px var(--fm);letter-spacing:.08em;text-transform:none;border:1px solid var(--brass-dim);border-radius:0;background:#1B1710;color:var(--parch)}
.hm .hm-off button.hm-sel{border-color:var(--parch)}
.hm .hm-detail{margin-top:16px;border:1px solid var(--brass-dim);border-top:2px solid var(--brass);background:var(--ink-2);padding:16px;scroll-margin-top:16px}
.hm .hm-detail:not([hidden]){animation:hm-in .22s ease-out}
@keyframes hm-in{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.hm .hm-detail:not([hidden]){animation:none}}
.hm .hm-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--brass-dim);padding-bottom:10px;margin-bottom:12px}
.hm .hm-detail h2{font-family:var(--fd);font-weight:300;font-size:30px;font-variant-numeric:lining-nums;letter-spacing:.08em;text-transform:none;margin:0;padding:0;border:0;color:var(--parch)}
.hm .hm-detail-head p{margin:6px 0 0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--parch-dim)}
.hm .hm-close{flex:0 0 44px;min-height:44px;width:44px;padding:0;font:300 28px/1 var(--fd);letter-spacing:0;text-transform:none;border:1px solid var(--brass-dim);border-radius:0;background:transparent;color:var(--parch)}
.hm .hm-facts{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0 0 12px;font-size:12.5px;color:var(--brass)}
.hm .hm-spend{display:grid;grid-template-columns:1fr auto;gap:8px;margin:0 0 12px}.hm .hm-spend input{min-width:0;min-height:44px;padding:0 12px;font:400 15px var(--fm);letter-spacing:0;text-transform:none;border:1px solid var(--brass-dim);border-radius:0;background:var(--ink);color:var(--parch)}.hm .hm-spend button{min-height:44px;padding:0 14px;font:400 10.5px var(--fm);letter-spacing:.16em;text-transform:uppercase;border:1px solid var(--brass);border-radius:0;background:var(--brass);color:var(--ink)}
.hm .hm-save-table{display:block;width:100%;min-height:46px;margin:0 0 12px;padding:0 16px;font:400 11px var(--fm);letter-spacing:.22em;text-transform:uppercase;border:1px solid #79C995;border-radius:0;background:#2F6B46;color:#F1F7F2;cursor:pointer}
.hm .hm-place{display:block;width:100%;min-height:46px;margin:0 0 12px;padding:0 16px;font:400 11px var(--fm);letter-spacing:.22em;text-transform:uppercase;border:1px solid var(--brass);border-radius:0;background:var(--brass);color:var(--ink);cursor:pointer}
.hm .hm-group{border-top:1px solid #241F17;padding:10px 0;font-size:12.5px}
.hm .hm-group b{font-family:var(--fd);font-weight:400;font-size:19px;color:var(--parch)}
.hm .hm-group-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.hm .hm-person-rows{border:1px solid rgba(168,131,73,.28)}
.hm .hm-person-row{min-width:0;padding:8px 10px;background:rgba(255,255,255,.012)}
.hm .hm-person-row+.hm-person-row{border-top:1px solid rgba(168,131,73,.28)}
.hm .hm-person-row b,.hm .hm-person-row small{display:block;overflow-wrap:anywhere}
.hm .hm-person-row small{margin-top:2px}
.hm .hm-pill{display:inline-block;border:1px solid var(--crimson-lt);border-radius:999px;padding:2px 7px;color:var(--crimson-lt);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;vertical-align:middle}
.hm .hm-pill.status-confirmed{border-color:#79C995;color:#9DDBB2;background:rgba(47,107,70,.18)}
.hm .hm-pill.status-invited{border-color:#D9AE78;color:#EBCB95;background:rgba(217,174,120,.08)}
.hm .hm-pill.status-called{border-color:var(--brass);color:var(--parch);background:rgba(168,131,73,.1)}
.hm .hm-pill.status-request{border-color:var(--brass-dim);color:var(--brass)}
.hm .hm-empty{color:var(--parch-dim);font-style:italic;font-size:12.5px}
.hm .hm-sub{margin:18px 0 8px;font:400 11px var(--fm);letter-spacing:.2em;text-transform:uppercase;color:var(--brass)}
.hm .hm-group{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.hm .hm-group-main{min-width:0;flex:1}
.hm .hm-group small{display:block;margin-top:3px;color:var(--parch-dim);font-size:11px;overflow-wrap:anywhere}
.hm .hm-at{display:inline-block;border:1px solid var(--brass-dim);border-radius:999px;padding:2px 7px;color:var(--brass);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;vertical-align:middle}
.hm .hm-act{flex:0 0 auto;min-height:40px;padding:0 14px;font:400 10.5px var(--fm);letter-spacing:.18em;text-transform:uppercase;border:1px solid var(--brass-dim);border-radius:0;background:transparent;color:var(--parch);cursor:pointer}
.hm .hm-act.primary{background:var(--brass);border-color:var(--brass);color:var(--ink)}
.hm .hm-act:disabled{opacity:.5;cursor:default}
.hm .hm-add{margin-top:8px;border-top:1px solid var(--brass-dim)}
.hm .hm-search{width:100%;min-height:46px;padding:0 14px;font:400 16px var(--fm);letter-spacing:0;text-transform:none;border:1px solid var(--brass-dim);border-radius:0;background:var(--ink);color:var(--parch);cursor:text}
.hm .hm-search:focus{outline:1px solid var(--brass);outline-offset:1px}
.hm .hm-list-label{margin:12px 0 4px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--parch-dim)}
@media (max-width:460px){.hm .hm-group{flex-direction:column}.hm .hm-act{width:100%}}`;

const STATIC_LAYERS = `<polygon points="0.0,772.8 0.0,54.6 57.1,0.0 672.0,0.0 697.2,42.0 697.2,512.4 730.8,562.8 730.8,772.8" class="floor"/>
<rect x="42.0" y="0.0" width="478.8" height="35.7" class="wine"/>
<text x="281.4" y="23.1" class="zone" text-anchor="middle">WINE CELLAR — EXISTING RACKING</text>
<rect x="529.2" y="21.0" width="159.6" height="239.4" class="lift"/>
<line x1="529.2" y1="260.4" x2="688.8" y2="21.0" class="xline"/>
<line x1="529.2" y1="21.0" x2="688.8" y2="260.4" class="xline"/>
<text x="609.0" y="117.6" class="zoneb" text-anchor="middle">ENTRANCE</text>
<text x="609.0" y="149.1" class="zone" text-anchor="middle">car lift</text>
<rect x="575.4" y="252.0" width="113.4" height="75.6" class="concourse"/>
<text x="632.1" y="294.0" class="zone" text-anchor="middle">ARRIVAL</text>
<path d="M 632.1 256.2 L 632.1 352.8" class="arrow"/>
<path d="M 632.1 367.5 l -7 -12 l 14 0 z" class="arrowhead"/>
<rect x="8.4" y="252.0" width="680.4" height="54.6" class="spine"/>
<text x="126.0" y="285.6" class="zone" text-anchor="middle">1.3 m CLEAR ROUTE</text>
<rect x="214.2" y="516.6" width="369.6" height="256.2" class="core"/>
<rect x="222.6" y="554.4" width="46.2" height="163.8" class="shaft"/>
<rect x="273.0" y="554.4" width="46.2" height="163.8" class="shaft"/>
<line x1="222.6" y1="718.2" x2="268.8" y2="554.4" class="xline"/>
<line x1="222.6" y1="554.4" x2="268.8" y2="718.2" class="xline"/>
<line x1="273.0" y1="718.2" x2="319.2" y2="554.4" class="xline"/>
<line x1="273.0" y1="554.4" x2="319.2" y2="718.2" class="xline"/>
<text x="270.9" y="737.1" class="zone" text-anchor="middle">LIFTS</text>
<rect x="323.4" y="554.4" width="67.2" height="163.8" class="shaft"/>
<text x="357.0" y="642.6" class="zone" text-anchor="middle" transform="rotate(-90 357.0 642.6)">FOYER</text>
<rect x="411.6" y="520.8" width="159.6" height="235.2" class="shaft"/>
<line x1="420.0" y1="739.2" x2="562.8" y2="739.2" class="step"/>
<line x1="420.0" y1="723.2" x2="562.8" y2="723.2" class="step"/>
<line x1="420.0" y1="707.3" x2="562.8" y2="707.3" class="step"/>
<line x1="420.0" y1="691.3" x2="562.8" y2="691.3" class="step"/>
<line x1="420.0" y1="675.4" x2="562.8" y2="675.4" class="step"/>
<line x1="420.0" y1="659.4" x2="562.8" y2="659.4" class="step"/>
<line x1="420.0" y1="643.4" x2="562.8" y2="643.4" class="step"/>
<line x1="420.0" y1="627.5" x2="562.8" y2="627.5" class="step"/>
<line x1="420.0" y1="611.5" x2="562.8" y2="611.5" class="step"/>
<line x1="420.0" y1="595.6" x2="562.8" y2="595.6" class="step"/>
<line x1="420.0" y1="579.6" x2="562.8" y2="579.6" class="step"/>
<line x1="420.0" y1="563.6" x2="562.8" y2="563.6" class="step"/>
<line x1="420.0" y1="547.7" x2="562.8" y2="547.7" class="step"/>
<text x="491.4" y="774.9" class="zone" text-anchor="middle">STAIRS — sole escape route</text>
<rect x="0.0" y="537.6" width="201.6" height="218.4" class="tech"/>
<text x="100.8" y="651.0" class="zonec" text-anchor="middle">TECHNICAL</text>
<text x="100.8" y="678.3" class="zone" text-anchor="middle">back of bar</text>
<rect x="0.0" y="495.6" width="205.8" height="42.0" class="barc"/>
<line x1="0.0" y1="495.6" x2="205.8" y2="495.6" class="counter"/>
<text x="102.9" y="522.9" class="zoneb" text-anchor="middle">BAR</text>
<rect x="0.0" y="378.0" width="235.2" height="117.6" class="queue"/>
<text x="117.6" y="424.2" class="zonec" text-anchor="middle">BAR STANDING</text>
<text x="117.6" y="451.5" class="zone" text-anchor="middle">2.8 m deep · 16 m²</text>
<rect x="235.2" y="441.0" width="201.6" height="54.6" class="queue"/>
<text x="336.0" y="472.5" class="zone" text-anchor="middle">ROUTE TO BAR</text>
<rect x="411.6" y="483.0" width="147.0" height="33.6" class="dj"/>
<text x="485.1" y="508.2" class="zoneb" text-anchor="middle">DJ</text>
<rect x="436.8" y="327.6" width="134.4" height="155.4" class="dance"/>
<text x="504.0" y="394.8" class="zone" text-anchor="middle">DANCE</text>
<text x="504.0" y="422.1" class="zone" text-anchor="middle">FLOOR</text>
<text x="504.0" y="449.4" class="zone" text-anchor="middle">11.5 m²</text>
<rect x="613.2" y="516.6" width="113.4" height="235.2" class="chill"/>
<text x="669.9" y="613.2" class="zoneb" text-anchor="middle">CHILL</text>
<text x="669.9" y="640.5" class="zone" text-anchor="middle">sponsor · sofas</text>
<line x1="25.2" y1="384.7" x2="684.6" y2="384.7" class="drain"/>
<circle cx="285.6" cy="260.4" r="29.4" class="colclear"/>
<circle cx="285.6" cy="260.4" r="18.9" class="col"/>
<text x="285.6" y="189.0" class="zonec" text-anchor="middle">COLUMN</text>
<circle cx="105.0" cy="279.3" r="12.6" class="colq"/>
<circle cx="432.6" cy="279.3" r="12.6" class="colq"/>
<path d="M 31.5 112.1 L 31.5 117.6 L 104.0 117.6 L 104.0 112.1" class="brk"/>
<text x="67.7" y="130.6" class="six" text-anchor="middle">JOIN FOR 6</text>
<path d="M 31.5 183.5 L 31.5 189.0 L 104.0 189.0 L 104.0 183.5" class="brk"/>
<text x="67.7" y="202.0" class="six" text-anchor="middle">JOIN FOR 6</text>
<path d="M 31.5 254.9 L 31.5 260.4 L 128.1 260.4 L 128.1 254.9" class="brk"/>
<text x="79.8" y="273.4" class="six" text-anchor="middle">JOIN FOR 6</text>
<path d="M 31.5 372.5 L 31.5 378.0 L 106.3 378.0 L 106.3 372.5" class="brk"/>
<text x="68.9" y="391.0" class="six" text-anchor="middle">JOIN FOR 6</text>
<path d="M 266.7 443.9 L 266.7 449.4 L 336.0 449.4 L 336.0 443.9" class="brk"/>
<text x="301.3" y="462.4" class="six" text-anchor="middle">JOIN FOR 6</text>`;

const OVERLAY_LAYERS = `<line x1="0.0" y1="-26.0" x2="697.2" y2="-26.0" class="dim"/>
<text x="348.6" y="-32.0" class="dimt" text-anchor="middle">16.60 m</text>
<line x1="-26.0" y1="0.0" x2="-26.0" y2="772.8" class="dim"/>
<text x="-32.0" y="386.4" class="dimt" text-anchor="middle" transform="rotate(-90 -32.0 386.4)">18.40 m</text>
<rect x="0.0" y="806.8" width="42.0" height="7" class="sb0"/>
<rect x="42.0" y="806.8" width="42.0" height="7" class="sb1"/>
<rect x="84.0" y="806.8" width="42.0" height="7" class="sb0"/>
<rect x="126.0" y="806.8" width="42.0" height="7" class="sb1"/>
<rect x="168.0" y="806.8" width="42.0" height="7" class="sb0"/>
<text x="0.0" y="827.8" class="dimt">0</text>
<text x="210.0" y="827.8" class="dimt" text-anchor="middle">5 m</text>
<polygon points="0.0,772.8 0.0,54.6 57.1,0.0 672.0,0.0 697.2,42.0 697.2,512.4 730.8,562.8 730.8,772.8" class="wall"/>`;

const ASIDE = `    <aside>
      <div class="block"><h2>Key</h2>
        <div class="key">
          <div><i class="sw"></i><b>Table</b> <span>— one 70 cm square, 4 stools. All 30 identical and separate.</span></div>
          <div><i class="sw p"></i><b>Wine wall, row A</b> <span>— nos. 1–7 against the lit racking, the best position in the room</span></div>
          <div><i class="sw q"></i><b>Bar standing</b> <span>— 2.8 m deep in front of the counter, plus the route east to the floor</span></div>
          <div><i class="sw k"></i><b>Column</b> <span>— with clearance ring. Row C splits around it.</span></div>
          <div><i class="sw d"></i><b>DJ</b> <span>— back of the stair core, facing the room</span></div>
          <div><i class="sw f"></i><b>Dancefloor</b> <span>— 11.5 m², down from 19</span></div>
          <div><i class="sw w"></i><b>Wine cellar</b> <span>— existing racking, kept and lit</span></div>
          <div><i class="sw g"></i><b>Drainage channel</b> <span>— full width at 9.2 m</span></div>
        </div></div>
      <div class="block"><h2>Joining for 6+</h2>
        <div class="notes" style="margin-bottom:11px">
          <p>Nothing is drawn combined. Five pairs are set side by side and bracketed on the plan — <b>1+2, 8+9, 15+16, 20+21, 26+27</b> — so staff slide two tops together on the night and drop to 6 stools.</p>
          <p>Every table in a row sits 20–30 cm from its neighbour, so <b>any adjacent pair works</b>. Decide when the RSVPs land; nothing on this plan has to move.</p>
        </div>
        <table>
          <tr><td>All 30 separate</td><td>30 groups · 120 seats</td></tr>
          <tr><td>5 pairs joined</td><td>25 groups · 110 seats</td></tr>
          <tr><td>8 pairs joined</td><td>22 groups · 104 seats</td></tr>
        </table></div>
      <div class="block"><h2>Rows</h2>
        <table>
          <tr><td>A — wine wall</td><td>7 · nos. 1–7</td></tr>
          <tr><td>B</td><td>7 · nos. 8–14</td></tr>
          <tr><td>C — splits at the column</td><td>5 · nos. 15–19</td></tr>
          <tr><td>D — faces the floor</td><td>6 · nos. 20–25</td></tr>
          <tr><td>E — east of the bar</td><td>3 · nos. 26–28</td></tr>
          <tr><td>East pocket</td><td>2 · nos. 29–30</td></tr>
        </table></div>
      <div class="block"><h2>Minimum spend</h2>
        <table>
          <tr><td>23 × €400 + 7 × €600</td><td>€13,400</td></tr>
          <tr class="hi"><td>23 × €450 + 7 × €650</td><td>€14,900</td></tr>
          <tr><td>23 × €500 + 7 × €700</td><td>€16,400</td></tr>
          <tr><td>23 × €550 + 7 × €750</td><td>€17,900</td></tr>
        </table>
        <div class="notes" style="margin-top:10px"><p>A joined pair pays both minimums — it is two tables.</p></div></div>
      <div class="block"><h2>Read before you order stools</h2>
        <div class="notes">
          <p class="flag"><b>One stairwell.</b> At −7.60 m with 200 people, this room has a single protected escape route plus a car lift. Assembly use normally needs two. Get it answered by Junó's fire engineer first — it outranks everything else here.</p>
          <p><b>The bar now has room to work.</b> 2.8 m of clear standing in front of the counter, 16 m², plus a 1.3 m route running east to the dancefloor. No table is within 2.8 m of the bar.</p>
          <p><b>Tables are set at 1.50 m each</b> — 70 cm top with 40 cm either side. That is party density: stools tucked, people perching. It is what makes 30 fit.</p>
          <p><b>Confirm the column</b> before setting out. Position is read off the garage plan at 1:100 and matched to your photos; 30 cm either way changes row C.</p>
          <p><b>The drainage channel</b> runs under row E and the standing zone. Flush cover plate or carpet, or stool feet catch in the grating.</p>
        </div></div>
    </aside>`;

const FOOTER = `  <footer><span>Whispers · Hotel Junó, Sofia</span><span>30 tables · 120 seats · 200 capacity</span>
    <span>Dimensions to be verified on site</span></footer>`;

export function renderHallPlanView() {
  return `<div class="view" id="view-hallmap">
<section class="hm" id="hallPlan">
<div class="sheet">
<div class="hm-bar"><p class="hm-hint" id="hmHint">Tap a table for details</p><div class="hm-tools" id="hmTools"><button type="button" id="hmUndo" disabled>Undo</button><button type="button" id="hmSave" disabled>Save</button><button type="button" class="hm-legend-toggle" id="hmLegendToggle" aria-expanded="false" aria-controls="hmLegend">Legend</button></div></div>
<div class="cols" id="hmCols">
<div class="hm-left">
<div class="draw" id="hmFrame"><svg id="hmPlan" viewBox="-56 -52 849 895" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Scaled floor plan of the Hotel Juno garage level. Tap a table for details.">
${STATIC_LAYERS}
<g id="hmTables"></g>
${OVERLAY_LAYERS}
</svg></div>
<p class="hm-state" id="hmState" aria-live="polite"></p>
<div class="hm-off" id="hmOffPlan" hidden></div>
<section class="hm-detail" id="hmDetail" aria-live="polite" hidden></section>
</div>
<div class="hm-legend" id="hmLegend" hidden>
${ASIDE}
</div>
</div>
${FOOTER}
</div>
</section>
</div>`;
}
