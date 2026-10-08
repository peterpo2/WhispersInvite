// MAP tab: live tables on the Rev D floor plan. Positions are percentages of the drawing's viewBox,
// stored in staff_tables.hall_x / hall_y via /api/staff/hall-map (separate from Show map).
(function(){
  const view=document.getElementById('view-hallmap'),app=document.getElementById('staffApp');
  if(!view||!app)return;
  const root=view.querySelector('.hm'),svg=document.getElementById('hmPlan'),layer=document.getElementById('hmTables'),frame=document.getElementById('hmFrame'),state=document.getElementById('hmState'),offPlan=document.getElementById('hmOffPlan'),detail=document.getElementById('hmDetail'),legendToggle=document.getElementById('hmLegendToggle'),legend=document.getElementById('hmLegend'),cols=document.getElementById('hmCols');
  const VB={x:-56,y:-52,w:849,h:895};
  const FLOOR={minX:31.5,maxX:699.3,minY:31.5,maxY:741.3};
  const DRAG_THRESHOLD=6;
  const ROWS=[[1,7,'A — wine wall'],[8,14,'B'],[15,19,'C — splits at the column'],[20,25,'D — faces the floor'],[26,28,'E — east of the bar'],[29,30,'East pocket']];
  const CAN_DRAG=['owner','admin','door'].includes(app.dataset.staffRole);
  if(CAN_DRAG)root.classList.add('hm-drag');
  const hint=document.getElementById('hmHint');
  if(hint)hint.textContent=CAN_DRAG?'Drag a table to move it · tap for details':'Tap a table for details';
  let tables=[],info={tables:[],groups:[]},selectedId=null,drag=null,loading=false;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const smooth=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  const spend=v=>'€'+Number(v||0).toLocaleString('en-US');
  const num=t=>String(t.sortOrder||t.label||'').replace(/\D/g,'')||t.label;
  const f=v=>v.toFixed(1);
  const toSvgX=p=>VB.x+p/100*VB.w,toSvgY=p=>VB.y+p/100*VB.h;
  const toPctX=v=>Math.round((v-VB.x)/VB.w*10000)/100,toPctY=v=>Math.round((v-VB.y)/VB.h*10000)/100;
  const placed=t=>t.hallX!==null&&t.hallY!==null;
  function setState(text,err){state.className='hm-state'+(err?' err':'');state.textContent=text;}
  function tableSvg(t){
    const cx=toSvgX(t.hallX),cy=toSvgY(t.hallY),n=Number(num(t)),p=n>=1&&n<=7?' prem':'',sel=t.id===selectedId?' hm-sel':'';
    return '<g class="hm-t'+sel+'" data-hm-table="'+esc(t.id)+'" role="button" tabindex="0" aria-label="'+esc(t.label)+'">'
      +'<rect x="'+f(cx-31.5)+'" y="'+f(cy-31.5)+'" width="63" height="63" class="occ"/>'
      +'<rect x="'+f(cx-8)+'" y="'+f(cy-31.1)+'" width="16" height="16" class="stool'+p+'"/>'
      +'<rect x="'+f(cx-8)+'" y="'+f(cy+15.1)+'" width="16" height="16" class="stool'+p+'"/>'
      +'<rect x="'+f(cx+15.1)+'" y="'+f(cy-8)+'" width="16" height="16" class="stool'+p+'"/>'
      +'<rect x="'+f(cx-31.1)+'" y="'+f(cy-8)+'" width="16" height="16" class="stool'+p+'"/>'
      +'<rect x="'+f(cx-14.7)+'" y="'+f(cy-14.7)+'" width="29.4" height="29.4" class="t'+p+'"/>'
      +'<text x="'+f(cx)+'" y="'+f(cy+4)+'" class="tn" text-anchor="middle">'+esc(num(t))+'</text></g>';
  }
  function renderTables(){
    layer.innerHTML=tables.filter(placed).map(tableSvg).join('');
    const off=tables.filter(t=>!placed(t));
    offPlan.hidden=!off.length;
    offPlan.innerHTML=off.length?'<span>Not on the plan</span>'+off.map(t=>'<button type="button" class="'+(t.id===selectedId?'hm-sel':'')+'" data-hm-table="'+esc(t.id)+'">'+esc(num(t))+'</button>').join(''):'';
  }
  function renderDetail(){
    const t=tables.find(x=>x.id===selectedId);
    if(!t){detail.hidden=true;detail.innerHTML='';return;}
    const extra=(info.tables||[]).find(x=>x.id===t.id)||{},groups=(info.groups||[]).filter(g=>g.tableId===t.id),guests=groups.reduce((s,g)=>s+g.size,0),n=Number(num(t)),row=ROWS.find(r=>n>=r[0]&&n<=r[1]);
    detail.innerHTML='<div class="hm-detail-head"><div><h2>'+esc(t.label)+'</h2><p>'+esc(placed(t)&&row?'Row '+row[2]:'Not on the plan')+'</p></div><button type="button" class="hm-close" id="hmClose" aria-label="Close">×</button></div>'
      +'<div class="hm-facts"><span>'+guests+' guest'+(guests===1?'':'s')+'</span><span>'+esc(spend(extra.minimumSpendEur))+' min</span></div>'
      +(groups.map(g=>'<div class="hm-group"><b>'+esc(g.name)+'</b>'+(g.reservationConfirmed?'<span class="hm-pill">Reserved</span>':'')+'<div class="hm-people">'+(g.people||[]).map(p=>'<span class="hm-person">'+esc(p)+'</span>').join('')+'</div></div>').join('')||'<div class="hm-empty">No groups at this table.</div>');
    detail.hidden=false;
  }
  function select(id){selectedId=id;renderTables();renderDetail();requestAnimationFrame(()=>detail.scrollIntoView({behavior:smooth(),block:'start'}));}
  function closeDetail(){selectedId=null;renderTables();renderDetail();requestAnimationFrame(()=>frame.scrollIntoView({behavior:smooth(),block:'start'}));}
  function toSvgPoint(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());}
  async function save(t,previous){
    setState('Saving...');
    let res,data;
    try{res=await fetch('/api/staff/hall-map',{method:'PATCH',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({tableId:t.id,hallX:t.hallX,hallY:t.hallY})});data=await res.json().catch(()=>({}));}
    catch(_){t.hallX=previous.hallX;t.hallY=previous.hallY;renderTables();setState('No connection. Position not saved.',true);return;}
    if(!res.ok){t.hallX=previous.hallX;t.hallY=previous.hallY;renderTables();setState(data.error||'Could not save table position.',true);return;}
    setState('Saved.');
    setTimeout(()=>{if(state.textContent==='Saved.')setState('');},2000);
  }
  layer.addEventListener('pointerdown',e=>{
    const g=e.target.closest('[data-hm-table]');if(!g||e.button>0)return;
    const t=tables.find(x=>x.id===g.dataset.hmTable);if(!t)return;
    drag={el:g,t,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,start:toSvgPoint(e),cx:toSvgX(t.hallX),cy:toSvgY(t.hallY),nx:null,ny:null,dragged:false};
    if(CAN_DRAG)g.setPointerCapture(e.pointerId);
  });
  layer.addEventListener('pointermove',e=>{
    if(!drag||!CAN_DRAG||drag.pointerId!==e.pointerId)return;
    if(!drag.dragged&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<DRAG_THRESHOLD)return;
    drag.dragged=true;drag.el.classList.add('dragging');e.preventDefault();
    const p=toSvgPoint(e);
    drag.nx=Math.max(FLOOR.minX,Math.min(FLOOR.maxX,drag.cx+p.x-drag.start.x));
    drag.ny=Math.max(FLOOR.minY,Math.min(FLOOR.maxY,drag.cy+p.y-drag.start.y));
    drag.el.setAttribute('transform','translate('+f(drag.nx-drag.cx)+' '+f(drag.ny-drag.cy)+')');
  });
  layer.addEventListener('pointerup',e=>{
    if(!drag||drag.pointerId!==e.pointerId)return;
    const d=drag;drag=null;
    if(d.el.hasPointerCapture(e.pointerId))d.el.releasePointerCapture(e.pointerId);
    if(!d.dragged){select(d.t.id);return;}
    const previous={hallX:d.t.hallX,hallY:d.t.hallY};
    d.t.hallX=toPctX(d.nx);d.t.hallY=toPctY(d.ny);renderTables();save(d.t,previous);
  });
  layer.addEventListener('pointercancel',()=>{if(!drag)return;drag=null;renderTables();});
  layer.addEventListener('keydown',e=>{const g=e.target.closest('[data-hm-table]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(g.dataset.hmTable);}});
  offPlan.addEventListener('click',e=>{const b=e.target.closest('[data-hm-table]');if(b)select(b.dataset.hmTable);});
  detail.addEventListener('click',e=>{if(e.target.closest('#hmClose'))closeDetail();});
  legendToggle.addEventListener('click',()=>{
    const open=legendToggle.getAttribute('aria-expanded')!=='true';
    legendToggle.setAttribute('aria-expanded',String(open));legend.hidden=!open;cols.classList.toggle('hm-legend-open',open);
    if(open)requestAnimationFrame(()=>legend.scrollIntoView({behavior:smooth(),block:'nearest'}));
  });
  async function load(){
    if(loading)return;loading=true;setState('Loading...');
    try{
      const [mapRes,infoRes]=await Promise.all([fetch('/api/staff/hall-map'),fetch('/api/staff/tables')]);
      const mapData=await mapRes.json().catch(()=>({})),infoData=await infoRes.json().catch(()=>({}));
      if(!mapRes.ok){setState(mapData.error||'Could not load map.',true);return;}
      tables=mapData.tables||[];info=infoRes.ok?infoData:{tables:[],groups:[]};
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
  window.addEventListener('load',()=>{if(isActive())toTop();},{once:true});
  if(isActive())load();
})();
