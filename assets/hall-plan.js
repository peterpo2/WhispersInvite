// MAP tab: live tables on the Rev D floor plan. Positions are percentages of the drawing's viewBox,
// stored in staff_tables.hall_x / hall_y via /api/staff/hall-map (separate from Show map).
(function(){
  const view=document.getElementById('view-hallmap'),app=document.getElementById('staffApp');
  if(!view||!app)return;
  const root=view.querySelector('.hm'),svg=document.getElementById('hmPlan'),layer=document.getElementById('hmTables'),frame=document.getElementById('hmFrame'),state=document.getElementById('hmState'),offPlan=document.getElementById('hmOffPlan'),detail=document.getElementById('hmDetail'),legendToggle=document.getElementById('hmLegendToggle'),legend=document.getElementById('hmLegend'),cols=document.getElementById('hmCols'),tools=document.getElementById('hmTools'),undoButton=document.getElementById('hmUndo'),saveButton=document.getElementById('hmSave');
  const VB={x:-56,y:-52,w:849,h:895};
  const FLOOR={minX:31.5,maxX:699.3,minY:31.5,maxY:741.3};
  const DRAG_THRESHOLD=6;
  // Table tops (29.4 units) may come close but never overlap: centres stay at least TOP_GAP apart on one axis.
  const TOP_GAP=36,OCC=63;
  const ROWS=[[1,7,'A — wine wall'],[8,14,'B'],[15,19,'C — splits at the column'],[20,25,'D — faces the floor'],[26,28,'E — east of the bar'],[29,30,'East pocket']];
  const CAN_DRAG=['owner','admin','door'].includes(app.dataset.staffRole);
  const CAN_ASSIGN=CAN_DRAG;
  const draft=window.WhispersMapDraft.create({historyLimit:5}),registry=window.WhispersMapDraft.registry;
  if(CAN_DRAG)root.classList.add('hm-drag');
  if(!CAN_DRAG)tools.hidden=true;
  const hint=document.getElementById('hmHint');
  if(hint)hint.textContent=CAN_DRAG?'Drag a table to move it · tap for details':'Tap a table for details';
  let tables=[],info={tables:[],groups:[]},selectedId=null,drag=null,loading=false,searchQuery='';
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const smooth=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  const spend=v=>'€'+Number(v||0).toLocaleString('en-US');
  const formatMapEditedAt=value=>value?new Intl.DateTimeFormat('bg-BG',{timeZone:'Europe/Sofia',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Not edited yet';
  const num=t=>String(t.sortOrder||t.label||'').replace(/\D/g,'')||t.label;
  const f=v=>v.toFixed(1);
  const toSvgX=p=>VB.x+p/100*VB.w,toSvgY=p=>VB.y+p/100*VB.h;
  const toPctX=v=>Math.round((v-VB.x)/VB.w*10000)/100,toPctY=v=>Math.round((v-VB.y)/VB.h*10000)/100;
  const placed=t=>t.hallX!==null&&t.hallY!==null;
  function setState(text,err){state.className='hm-state'+(err?' err':'');state.textContent=text;}
  // Each table is split over four layers (zones, stools, tops, numbers) so a neighbour's stool never covers a number.
  function pieces(t){
    const cx=toSvgX(t.hallX),cy=toSvgY(t.hallY),n=Number(num(t)),p=n>=1&&n<=7?' prem':'',edited=t.hallMapEditedAt?' hm-edited':'',sel=t.id===selectedId?' hm-sel':'',open='<g class="hm-t'+edited+sel+'" data-hm-table="'+esc(t.id)+'"';
    return {
      occ:open+'><rect x="'+f(cx-31.5)+'" y="'+f(cy-31.5)+'" width="63" height="63" class="occ"/></g>',
      stools:open+'><rect x="'+f(cx-8)+'" y="'+f(cy-31.1)+'" width="16" height="16" class="stool'+p+'"/>'
        +'<rect x="'+f(cx-8)+'" y="'+f(cy+15.1)+'" width="16" height="16" class="stool'+p+'"/>'
        +'<rect x="'+f(cx+15.1)+'" y="'+f(cy-8)+'" width="16" height="16" class="stool'+p+'"/>'
        +'<rect x="'+f(cx-31.1)+'" y="'+f(cy-8)+'" width="16" height="16" class="stool'+p+'"/></g>',
      top:open+' role="button" tabindex="0" aria-label="'+esc(t.label)+'"><rect x="'+f(cx-14.7)+'" y="'+f(cy-14.7)+'" width="29.4" height="29.4" class="t'+p+'"/></g>',
      num:open+'><text x="'+f(cx)+'" y="'+f(cy+4)+'" class="tn" text-anchor="middle">'+esc(num(t))+'</text></g>'
    };
  }
  function collides(id,x,y){return tables.some(o=>o.id!==id&&placed(o)&&Math.abs(toSvgX(o.hallX)-x)<TOP_GAP&&Math.abs(toSvgY(o.hallY)-y)<TOP_GAP);}
  // First spot (bottom row up, left to right) whose seating zone touches no other table.
  function freeSpot(){
    for(let y=FLOOR.maxY;y>=FLOOR.minY;y-=18)for(let x=FLOOR.minX;x<=FLOOR.maxX;x+=18){
      if(!tables.some(o=>placed(o)&&Math.abs(toSvgX(o.hallX)-x)<OCC&&Math.abs(toSvgY(o.hallY)-y)<OCC))return {x,y};
    }
    return {x:(FLOOR.minX+FLOOR.maxX)/2,y:(FLOOR.minY+FLOOR.maxY)/2};
  }
  function renderTables(){
    const list=tables.filter(placed).map(pieces);
    layer.innerHTML=['occ','stools','top','num'].map(k=>'<g class="hm-layer">'+list.map(x=>x[k]).join('')+'</g>').join('');
    const off=tables.filter(t=>!placed(t));
    offPlan.hidden=!off.length;
    offPlan.innerHTML=off.length?'<span>Not on the plan</span>'+off.map(t=>'<button type="button" class="'+(t.id===selectedId?'hm-sel':'')+'" data-hm-table="'+esc(t.id)+'">'+esc(num(t))+'</button>').join(''):'';
    undoButton.disabled=!draft.canUndo();saveButton.disabled=!draft.hasChanges();
  }
  function renderDetail(){
    const t=tables.find(x=>x.id===selectedId);
    if(!t){detail.hidden=true;detail.innerHTML='';return;}
    const extra=(info.tables||[]).find(x=>x.id===t.id)||{},groups=(info.groups||[]).filter(g=>g.tableId===t.id),guests=groups.reduce((s,g)=>s+g.size,0),n=Number(num(t)),row=ROWS.find(r=>n>=r[0]&&n<=r[1]);
    detail.innerHTML='<div class="hm-detail-head"><div><h2>'+esc(t.label)+'</h2><p>'+esc(!placed(t)?'Not on the plan':row?'Row '+row[2]:'Placed on the map')+'</p></div><button type="button" class="hm-close" id="hmClose" aria-label="Close">×</button></div>'
      +'<div class="hm-facts"><span>'+guests+' guest'+(guests===1?'':'s')+'</span><span>'+esc(spend(extra.minimumSpendEur))+' min</span><span>Last edited: '+esc(formatMapEditedAt(t.hallMapEditedAt))+'</span></div>'
      +(CAN_DRAG?'<div class="hm-spend"><input id="hmMinimumSpend" type="number" min="0" step="1" inputmode="numeric" value="'+esc(extra.minimumSpendEur||0)+'" aria-label="Minimum spend in EUR"/><button type="button" id="hmSaveSpend">Save amount</button></div>':'')
      +(CAN_DRAG?'<button type="button" class="hm-save-table" id="hmSaveTable">Save table</button>':'')
      +(CAN_DRAG&&!placed(t)?'<button type="button" class="hm-place" id="hmPlace">Place on map</button>':'')
      +'<h3 class="hm-sub">At this table</h3>'
      +(groups.map(g=>groupRow(g,CAN_ASSIGN?'<button type="button" class="hm-act" data-hm-remove="'+esc(g.rsvpId)+'">Remove</button>':'','')).join('')||'<div class="hm-empty">No groups at this table.</div>')
      +'<div class="hm-add"><h3 class="hm-sub">'+(CAN_ASSIGN?'Add guests':'Find a guest')+'</h3>'
      +'<input class="hm-search" id="hmSearch" type="search" placeholder="Search guests by name, email or phone" autocomplete="off" value="'+esc(searchQuery)+'"/>'
      +'<p class="hm-state" id="hmAssignState" aria-live="polite"></p><div id="hmResults"></div></div>';
    detail.hidden=false;
    renderResults();
  }
  function searchValueMatches(value,q,digits){const text=String(value||'').toLowerCase();if(text.includes(q))return true;if(digits.length<3)return false;const valueDigits=text.replace(/\D/g,'');return valueDigits.includes(digits)||(digits.startsWith('0')&&valueDigits.endsWith(digits.slice(1)));}
  function groupMatches(g,q){
    const digits=q.replace(/\D/g,'');
    return [g.name].concat(g.people||[]).concat((g.peopleDetails||[]).flatMap(p=>[p.email,p.phone])).some(v=>searchValueMatches(v,q,digits));
  }
  function personMatches(person,q){
    const digits=q.replace(/\D/g,'');
    return [person.name,person.email,person.phone,person.guestOf,person.type,person.status].concat(person.aliases||[]).some(v=>searchValueMatches(v,q,digits));
  }
  function tableSearchStatus(status){return status==='attending'?'Attending':status==='declined'?'Declined':'Invited';}
  function groupPeopleRows(g,primaryName=g.name){
    const details=(g.peopleDetails||[]).length?g.peopleDetails:(g.people&&g.people.length?g.people:[g.name]).map(name=>({name}));
    return details.map((person,index)=>{const name=index===0?(primaryName||person.name):person.name,contact=[person.email,person.phone].filter(Boolean).join(' · ');return '<div class="hm-person-row"><b>'+esc(name||'Guest')+'</b>'+(contact?'<small>'+esc(contact)+'</small>':'')+'</div>';}).join('');
  }
  function groupRow(g,action,note){
    return '<div class="hm-group"><div class="hm-group-main"><div class="hm-group-meta">'+(g.confirmed?'<span class="hm-pill status-confirmed">Confirmed</span>':'')
      +(g.wantsTableReservation?'<span class="hm-pill status-request">Requested table</span>':'')
      +(g.called?'<span class="hm-pill status-called">Called</span>':'')
      +(note?'<span class="hm-at">'+esc(note)+'</span>':'')+'</div><div class="hm-person-rows">'+groupPeopleRows(g)+'</div></div>'+action+'</div>';
  }
  function searchPersonRow(person){
    const table=(tables.find(x=>x.id===person.tableId)||{}).label||'',sameTable=person.tableId===selectedId;
    const note=person.assignable?(sameTable?'At this table':table?'At '+table:'Unassigned'):tableSearchStatus(person.status);
    const contact=[person.email,person.phone,person.guestOf?'Guest of '+person.guestOf:''].filter(Boolean).join(' | ');
    const action=CAN_ASSIGN&&person.assignable&&!sameTable?'<button type="button" class="hm-act primary" data-hm-add="'+esc(person.rsvpId)+'">'+(person.tableId?'Move here':'Add')+'</button>':'';
    return '<div class="hm-group"><div class="hm-group-main"><b>'+esc(person.name)+'</b><span class="hm-at">'+esc(note)+'</span>'+(contact?'<small>'+esc(contact)+'</small>':'')+'</div>'+action+'</div>';
  }
  function groupPrimaryName(group,matchedPerson){
    const primary=(info.searchPeople||[]).find(candidate=>String(candidate.rsvpId)===String(group.rsvpId)&&candidate.type==='Member'&&!candidate.guestOf);
    return primary?.name||(matchedPerson.type==='Member'?matchedPerson.name:'')||group.name;
  }
  function searchGroupRow(person){
    const group=(info.groups||[]).find(item=>String(item.rsvpId)===String(person.rsvpId));
    if(!group)return searchPersonRow(person);
    const table=(tables.find(x=>x.id===group.tableId)||{}).label||'',sameTable=group.tableId===selectedId,note=sameTable?'At this table':table?'At '+table:'Unassigned';
    const action=CAN_ASSIGN&&!sameTable?'<button type="button" class="hm-act primary" data-hm-add="'+esc(group.rsvpId)+'">'+(group.tableId?'Move here':'Add')+'</button>':'';
    return groupRow({...group,name:groupPrimaryName(group,person)},action,note);
  }
  // Empty search: attending groups waiting for a table. Typing searches the full invite and member registry.
  function renderResults(){
    const box=document.getElementById('hmResults');if(!box)return;
    const q=searchQuery.trim().toLowerCase(),others=(info.groups||[]).filter(g=>g.tableId!==selectedId);
    const seen=new Set(),list=q?(info.searchPeople||[]).filter(person=>personMatches(person,q)).filter(person=>{const key=person.assignable&&person.rsvpId?'rsvp:'+person.rsvpId:person.id;if(seen.has(key))return false;seen.add(key);return true;}):others.filter(g=>!g.tableId);
    const tableName=id=>(tables.find(x=>x.id===id)||{}).label||'';
    box.innerHTML='<p class="hm-list-label">'+(q?'Matching guests':'Waiting for a table')+'</p>'
      +(list.map(item=>q?(item.assignable?searchGroupRow(item):searchPersonRow(item)):groupRow(item,CAN_ASSIGN?'<button type="button" class="hm-act primary" data-hm-add="'+esc(item.rsvpId)+'">Add</button>':'',item.tableId?'At '+tableName(item.tableId):'')).join('')
      ||'<div class="hm-empty">'+(q?'No matching guests.':'Everyone has a table.')+'</div>');
  }
  function setAssignState(text,err){const el=document.getElementById('hmAssignState');if(el){el.className='hm-state'+(err?' err':'');el.textContent=text;}}
  async function assign(rsvpId,tableId){
    setAssignState('Saving...');
    let res;
    try{res=await fetch('/api/staff/table-assignment',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({rsvpId:Number(rsvpId),tableId})});}
    catch(_){setAssignState('No connection.',true);return;}
    if(!res.ok){const data=await res.json().catch(()=>({}));setAssignState(data.error||'Could not update the table.',true);return;}
    try{const r=await fetch('/api/staff/tables');if(r.ok)info=await r.json();}catch(_){}
    const typing=document.activeElement&&document.activeElement.id==='hmSearch';
    renderDetail();setAssignState('Saved.');
    setTimeout(()=>{const el=document.getElementById('hmAssignState');if(el&&el.textContent==='Saved.')setAssignState('');},2000);
    if(typing){const input=document.getElementById('hmSearch');input.focus();input.setSelectionRange(input.value.length,input.value.length);}
  }
  function select(id){if(id!==selectedId)searchQuery='';selectedId=id;renderTables();renderDetail();requestAnimationFrame(()=>detail.scrollIntoView({behavior:smooth(),block:'start'}));}
  function closeDetail(){selectedId=null;renderTables();renderDetail();requestAnimationFrame(()=>frame.scrollIntoView({behavior:smooth(),block:'start'}));}
  function toSvgPoint(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());}
  function applyPosition(entry){const t=tables.find(x=>String(x.id)===String(entry.id));if(t){t.hallX=entry.position.x;t.hallY=entry.position.y;}}
  function undoDraft(){const entry=draft.undo();if(entry){applyPosition(entry);renderTables();renderDetail();}}
  async function saveDrafts(){
    setState('Saving...');
    for(const entry of draft.pending()){
      let res,data;try{res=await fetch('/api/staff/hall-map',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({tableId:entry.id,hallX:entry.position.x,hallY:entry.position.y})});data=await res.json().catch(()=>({}));}
      catch(_){setState('No connection. Unsaved moves remain.',true);renderTables();renderDetail();return false;}
      if(!res.ok){setState(data.error||'Could not save table position.',true);renderTables();renderDetail();return false;}
      draft.confirm(entry.id,{x:data.hallX,y:data.hallY});applyPosition({id:entry.id,position:{x:data.hallX,y:data.hallY}});const t=tables.find(x=>x.id===entry.id);if(t)t.hallMapEditedAt=data.hallMapEditedAt;
    }
    setState('Saved.');renderTables();renderDetail();setTimeout(()=>{if(state.textContent==='Saved.')setState('');},2000);return true;
  }
  function discardDrafts(){for(const entry of draft.discard())applyPosition(entry);renderTables();renderDetail();}
  function placeOnMap(t){
    const spot=freeSpot();
    t.hallX=toPctX(spot.x);t.hallY=toPctY(spot.y);selectedId=t.id;renderTables();renderDetail();
    draft.move(t.id,{x:t.hallX,y:t.hallY});renderTables();
    requestAnimationFrame(()=>layer.querySelector('[data-hm-table="'+CSS.escape(t.id)+'"] .t')?.scrollIntoView({behavior:smooth(),block:'center',inline:'center'}));
  }
  async function saveMinimumSpend(){const input=document.getElementById('hmMinimumSpend'),button=document.getElementById('hmSaveSpend');if(!input||!selectedId)return;const raw=input.value.trim(),minimumSpendEur=raw===''?0:Number(raw);if(!/^\d*$/.test(raw)||!Number.isSafeInteger(minimumSpendEur)||minimumSpendEur<0){setState('Enter a whole euro amount.',true);return;}button.disabled=true;setState('Saving amount...');let res,data;try{res=await fetch('/api/staff/tables',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({tableId:selectedId,minimumSpendEur})});data=await res.json().catch(()=>({}));}catch(_){setState('No connection.',true);button.disabled=false;return;}if(!res.ok){setState(data.error||'Could not update minimum spend.',true);button.disabled=false;return;}const t=(info.tables||[]).find(x=>x.id===selectedId);if(t)t.minimumSpendEur=data.minimumSpendEur;setState('Amount saved.');renderDetail();}
  async function saveTableStatus(){const button=document.getElementById('hmSaveTable');if(!button||!selectedId)return;button.disabled=true;setState('Saving table...');let res,data;try{res=await fetch('/api/staff/tables',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({tableId:selectedId,markEdited:true,editSurface:'hall'})});data=await res.json().catch(()=>({}));}catch(_){setState('No connection.',true);button.disabled=false;return;}if(!res.ok){setState(data.error||'Could not save table.',true);button.disabled=false;return;}const t=tables.find(x=>x.id===selectedId);if(t)t.hallMapEditedAt=data.hallMapEditedAt;setState('Table saved.');renderTables();renderDetail();}
  layer.addEventListener('pointerdown',e=>{
    const g=e.target.closest('[data-hm-table]');if(!g||e.button>0)return;
    const t=tables.find(x=>x.id===g.dataset.hmTable);if(!t)return;
    const cx=toSvgX(t.hallX),cy=toSvgY(t.hallY);
    drag={el:g,els:layer.querySelectorAll('[data-hm-table="'+CSS.escape(t.id)+'"]'),t,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,start:toSvgPoint(e),cx,cy,nx:cx,ny:cy,dragged:false};
    if(CAN_DRAG)g.setPointerCapture(e.pointerId);
  });
  layer.addEventListener('pointermove',e=>{
    if(!drag||!CAN_DRAG||drag.pointerId!==e.pointerId)return;
    if(!drag.dragged&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<DRAG_THRESHOLD)return;
    drag.dragged=true;drag.els.forEach(el=>el.classList.add('dragging'));e.preventDefault();
    const p=toSvgPoint(e);
    const nx=Math.max(FLOOR.minX,Math.min(FLOOR.maxX,drag.cx+p.x-drag.start.x));
    const ny=Math.max(FLOOR.minY,Math.min(FLOOR.maxY,drag.cy+p.y-drag.start.y));
    if(collides(drag.t.id,nx,ny))return;
    drag.nx=nx;drag.ny=ny;
    drag.els.forEach(el=>el.setAttribute('transform','translate('+f(nx-drag.cx)+' '+f(ny-drag.cy)+')'));
  });
  layer.addEventListener('pointerup',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    const d=drag;drag=null;
    if(d.el.hasPointerCapture(e.pointerId))d.el.releasePointerCapture(e.pointerId);
    if(!d.dragged){select(d.t.id);return;}
    if(d.nx===d.cx&&d.ny===d.cy){renderTables();return;}
    d.t.hallX=toPctX(d.nx);d.t.hallY=toPctY(d.ny);draft.move(d.t.id,{x:d.t.hallX,y:d.t.hallY});renderTables();
  });
  layer.addEventListener('pointercancel',()=>{if(!drag)return;drag=null;renderTables();});
  layer.addEventListener('keydown',e=>{const g=e.target.closest('[data-hm-table]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(g.dataset.hmTable);}});
  offPlan.addEventListener('click',e=>{const b=e.target.closest('[data-hm-table]');if(b)select(b.dataset.hmTable);});
  detail.addEventListener('click',e=>{
    if(e.target.closest('#hmClose')){closeDetail();return;}
    if(e.target.closest('#hmSaveSpend')){saveMinimumSpend();return;}
    if(e.target.closest('#hmSaveTable')){saveTableStatus();return;}
    if(e.target.closest('#hmPlace')){const t=tables.find(x=>x.id===selectedId);if(t&&CAN_DRAG&&!placed(t))placeOnMap(t);return;}
    const add=e.target.closest('[data-hm-add]'),remove=e.target.closest('[data-hm-remove]');
    if(CAN_ASSIGN&&add&&selectedId){add.disabled=true;assign(add.dataset.hmAdd,selectedId);}
    else if(CAN_ASSIGN&&remove){remove.disabled=true;assign(remove.dataset.hmRemove,null);}
  });
  detail.addEventListener('input',e=>{if(e.target.id==='hmSearch'){searchQuery=e.target.value;renderResults();}});
  legendToggle.addEventListener('click',()=>{
    const open=legendToggle.getAttribute('aria-expanded')!=='true';
    legendToggle.setAttribute('aria-expanded',String(open));legend.hidden=!open;cols.classList.toggle('hm-legend-open',open);
    if(open)requestAnimationFrame(()=>legend.scrollIntoView({behavior:smooth(),block:'nearest'}));
  });
  undoButton.addEventListener('click',undoDraft);saveButton.addEventListener('click',saveDrafts);
  registry.register('hall-map',{isDirty:()=>draft.hasChanges(),save:saveDrafts,discard:discardDrafts});
  async function load(){
    if(loading)return;loading=true;setState('Loading...');
    try{
      const [mapRes,infoRes]=await Promise.all([fetch('/api/staff/hall-map'),fetch('/api/staff/tables')]);
      const mapData=await mapRes.json().catch(()=>({})),infoData=await infoRes.json().catch(()=>({}));
      if(!mapRes.ok){setState(mapData.error||'Could not load map.',true);return;}
      tables=mapData.tables||[];if(draft.hasChanges()){for(const table of tables){const p=draft.position(table.id);table.hallX=p.x;table.hallY=p.y;}}else draft.load(tables.map(table=>({id:table.id,position:{x:table.hallX,y:table.hallY}})));info=infoRes.ok?infoData:{tables:[],groups:[]};
      renderTables();renderDetail();setState(infoRes.ok?'':'Guest details could not be loaded.',!infoRes.ok);
    }catch(_){setState('No connection.',true);}
    finally{loading=false;}
  }
  const isActive=()=>view.classList.contains('active')||location.hash==='#view-hallmap'||location.hash==='#hallmap';
  // The #view-hallmap hash makes the browser jump to the tall map and hide the tabs; keep the page top in view.
  function toTop(){requestAnimationFrame(()=>window.scrollTo(0,0));}
  let wasActive=view.classList.contains('active');
  new MutationObserver(()=>{const active=view.classList.contains('active');if(active&&!wasActive){load();toTop();}wasActive=active;}).observe(view,{attributes:true,attributeFilter:['class']});
  window.addEventListener('hashchange',()=>{if(isActive())load();});
  window.addEventListener('whispers:reload-hall-map',load);
  window.addEventListener('load',()=>{if(isActive())toTop();},{once:true});
  if(isActive())load();
})();
