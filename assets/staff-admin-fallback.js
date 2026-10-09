(function(){
  if(window.__WHISPERS_STAFF_MAIN_READY)return;
  const app=document.getElementById("staffApp");
  if(!app)return;
  const role=app.dataset.staffRole||"door";
  const tablesReadOnly=role==="service";
  const MENU_URL="https://whisperssociety.com/menu";
  const PRINT_SIZE=2400;
  const allowed={owner:["scanner","members","tables","invite","menu","staff","settings","hallmap"],admin:["scanner","members","tables","invite","menu","hallmap"],door:["scanner","members","tables","invite","menu","hallmap"],service:["tables","hallmap"]}[role]||["scanner"];
  const PAGE_SIZE=20;
  let members=[],membersPage=1,doorScansData=[],scanSearchQuery="",invites=[],invitesPage=1,inviteEditId="",staffUsers=[],rsvpSettings={confirmation:null,updates:null},tablesData={tables:[],groups:[]},selectedTableId=null,tableSearch="",tablePeopleSearch="",tableSpendNotice=null,hallMapOpen=false,mapDrag=null,unassignedExpanded=matchMedia("(min-width: 760px)").matches,stream=null,loop=null,ctx=null,currentView="";
  const MAP_DRAG_THRESHOLD=6;
  const tableMapDraft=window.WhispersMapDraft.create({historyLimit:5}),mapDraftRegistry=window.WhispersMapDraft.registry;
  const RSVP_SETTING_UI={confirmation:{status:"confirmationSettingsStatus",scheduled:"confirmationScheduledChange",input:"confirmationChangeAt",apply:"applyConfirmationSetting",cancel:"cancelConfirmationSchedule",state:"confirmationSettingsState"},updates:{status:"updatesSettingsStatus",scheduled:"updatesScheduledChange",input:"updatesChangeAt",apply:"applyUpdatesSetting",cancel:"cancelUpdatesSchedule",state:"updatesSettingsState"}};
  const esc=(s)=>String(s??"").replace(/[&<>'"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const viewFromHash=()=>location.hash==="#view-members"||location.hash==="#members"?"members":location.hash==="#view-tables"||location.hash==="#tables"?"tables":location.hash==="#view-invite"||location.hash==="#invite"?"invite":location.hash==="#view-menu"||location.hash==="#menu"?"menu":location.hash==="#view-staff"||location.hash==="#staff"?"staff":location.hash==="#view-settings"||location.hash==="#settings"?"settings":location.hash==="#view-hallmap"||location.hash==="#hallmap"?"hallmap":location.hash==="#view-scanner"||location.hash==="#scanner"?"scanner":allowed[0]||"scanner";
  const byId=(id)=>document.getElementById(id);
  const qs=(sel,root=document)=>root.querySelector(sel);
  const qsa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  function setView(name){
    if(!allowed.includes(name))name=allowed[0]||"scanner";
    currentView=name;
    qsa(".tab").forEach((tab)=>tab.classList.toggle("active",tab.dataset.view===name));
    qsa(".view").forEach((view)=>view.classList.toggle("active",view.id==="view-"+name));
    if(name==="scanner")loadDoorList();
    if(name==="members")loadMembers();
    if(name==="tables")loadTables();
    if(name==="invite")loadInvites();
    if(name==="menu")renderMenuQr();
    if(name==="staff")loadStaff();
    if(name==="settings")loadSettings();
    updateTablesToTop();
  }
  function updateTablesToTop(){const button=byId("tablesToTop");if(button)button.hidden=!(currentView==="tables"&&window.scrollY>400);}
  function openTablesOverview(){
    selectedTableId=null;tableSearch="";tablePeopleSearch="";tableSpendNotice=null;hallMapOpen=true;const peopleSearch=byId("tablePeopleSearch");if(peopleSearch)peopleSearch.value="";
    history.replaceState(null,"","#view-tables");setView("tables");
    requestAnimationFrame(()=>byId("view-tables")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}));
  }
  function askUnsaved(){return new Promise((resolve)=>{const modal=byId("unsavedModal");modal.hidden=false;const finish=(value)=>{modal.hidden=true;resolve(value);};byId("unsavedSave").onclick=()=>finish("save");byId("unsavedDiscard").onclick=()=>finish("discard");byId("unsavedCancel").onclick=()=>finish("cancel");});}
  async function guardMapChanges(action){if(!mapDraftRegistry.hasChanges()){await action();return true;}const choice=await askUnsaved();if(choice==="cancel")return false;if(choice==="save"&&!await mapDraftRegistry.saveAll())return false;if(choice==="discard")mapDraftRegistry.discardAll();await action();return true;}
  async function getJson(url){
    const res=await fetch(url,{headers:{"Accept":"application/json"}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Could not load");
    return data;
  }
  async function postJson(url,body,method="POST"){
    const res=await fetch(url,{method,headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Request failed");
    return data;
  }
  function pageRows(rows,page){return rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);}
  function renderPager(id,rows,page,onPage){
    const el=byId(id);if(!el)return;
    const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)),safe=Math.min(Math.max(1,page),pages),start=rows.length?((safe-1)*PAGE_SIZE)+1:0,end=Math.min(rows.length,safe*PAGE_SIZE);
    if(safe!==page){onPage(safe);return;}
    el.innerHTML='<div class="pager-info">'+start+"-"+end+" of "+rows.length+" - page "+safe+" / "+pages+'</div><div class="pager-buttons"><button '+(safe<=1?"disabled":"")+' data-page="'+(safe-1)+'">Prev</button><button '+(safe>=pages?"disabled":"")+' data-page="'+(safe+1)+'">Next</button></div>';
    qsa("[data-page]",el).forEach((b)=>b.onclick=()=>onPage(Number(b.dataset.page)));
  }
  async function copyText(value,button,label){
    if(!value)return;
    try{await navigator.clipboard.writeText(value);button.textContent="Copied";setTimeout(()=>button.textContent=label||"Copy",1200);}
    catch(_){window.prompt("Copy",value);}
  }
  function confirmToggle(cb,message){if(window.confirm(message))return true;cb.checked=!cb.checked;return false;}
  function setNotice(id,message,isError){
    const el=byId(id);if(!el)return;
    el.className="invite-state"+(isError?" err":"");
    el.textContent=message||"";
  }
  function renderMenuQr(){
    const target=byId("menuQr");if(!target||target.dataset.ready==="1")return;
    target.textContent="";
    if(!window.QRCode){target.textContent=MENU_URL;setNotice("menuState","QR code could not be loaded.",true);return;}
    window.QRCode.toCanvas(MENU_URL,{width:320,margin:4,color:{dark:"#FFFFFF",light:"#000000"}},(error,canvas)=>{
      if(error){target.textContent=MENU_URL;setNotice("menuState","QR code could not be loaded.",true);return;}
      target.dataset.ready="1";target.appendChild(canvas);setNotice("menuState","",false);
    });
  }
  async function copyMenuLink(){
    const button=byId("copyMenuLink");
    try{await navigator.clipboard.writeText(MENU_URL);if(button){button.textContent="Copied";setTimeout(()=>button.textContent="Copy Link",1200);}setNotice("menuState","Link copied.",false);return true;}
    catch(_){window.prompt("Copy link",MENU_URL);setNotice("menuState","Copy the link above.",false);return false;}
  }
  async function shareMenuLink(){
    if(navigator.share){
      try{await navigator.share({title:"WHISPERS Menu",url:MENU_URL});setNotice("menuState","Shared.",false);return;}
      catch(error){if(error&&error.name==="AbortError")return;setNotice("menuState","Could not open sharing.",true);return;}
    }
    await copyMenuLink();
  }
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function qrSvgString(){return new Promise((resolve,reject)=>window.QRCode.toString(MENU_URL,{type:"svg",margin:4,color:{dark:"#FFFFFF",light:"#000000"}},(error,svg)=>error?reject(error):resolve(svg)));}
  function qrPrintCanvas(){return new Promise((resolve,reject)=>window.QRCode.toCanvas(MENU_URL,{width:PRINT_SIZE,margin:4,color:{dark:"#FFFFFF",light:"#000000"}},(error,canvas)=>error?reject(error):resolve(canvas)));}
  async function downloadMenuSvg(){
    if(!window.QRCode){setNotice("menuState","QR code could not be loaded.",true);return;}
    setNotice("menuState","Preparing SVG...",false);
    try{const svg=await qrSvgString();downloadBlob(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}),"whispers-menu-qr.svg");setNotice("menuState","SVG downloaded.",false);}catch(_){setNotice("menuState","Could not create the SVG.",true);}
  }
  async function downloadMenuPng(){
    if(!window.QRCode){setNotice("menuState","QR code could not be loaded.",true);return;}
    setNotice("menuState","Preparing PNG...",false);
    try{
      const canvas=await qrPrintCanvas(),blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("Could not create PNG")),"image/png"));downloadBlob(blob,"whispers-menu-qr-2400.png");setNotice("menuState","PNG downloaded.",false);
    }catch(_){setNotice("menuState","Could not create the PNG.",true);}
  }
  async function downloadMenuPdfA4(){
    if(!window.QRCode||!window.jspdf||!window.jspdf.jsPDF){setNotice("menuState","PDF could not be loaded.",true);return;}
    setNotice("menuState","Preparing A4 PDF...",false);
    try{const canvas=await qrPrintCanvas(),pdf=new window.jspdf.jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true}),size=180;pdf.setFillColor(0,0,0);pdf.rect(0,0,210,297,"F");pdf.addImage(canvas,"PNG",(210-size)/2,(297-size)/2,size,size,undefined,"FAST");pdf.save("whispers-menu-qr-a4.pdf");setNotice("menuState","A4 PDF downloaded.",false);}catch(_){setNotice("menuState","Could not create the A4 PDF.",true);}
  }
  async function downloadMenuPdfSquare(){
    if(!window.QRCode||!window.jspdf||!window.jspdf.jsPDF){setNotice("menuState","PDF could not be loaded.",true);return;}
    setNotice("menuState","Preparing square PDF...",false);
    try{const canvas=await qrPrintCanvas(),pdf=new window.jspdf.jsPDF({orientation:"portrait",unit:"mm",format:[200,200],compress:true});pdf.addImage(canvas,"PNG",0,0,200,200,undefined,"FAST");pdf.save("whispers-menu-qr-square.pdf");setNotice("menuState","Square PDF downloaded.",false);}catch(_){setNotice("menuState","Could not create the square PDF.",true);}
  }
  function showScan(kind,title,body){
    const result=byId("result");if(!result)return;
    result.className="panel result "+(kind||"");
    result.innerHTML="<h2>"+esc(title)+"</h2>"+(body||"");
  }
  function scanMessage(text){return "<p>"+esc(text)+"</p>";}
  function hhmm(iso){return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}
  async function scanValue(value,manual){
    if(!value)return;
    if(!manual)stopCamera();
    showScan("","Checking...",scanMessage("Reading the seal."));
    let data;
    try{data=await postJson("/api/door",{value});}
    catch(e){showScan("bad","Invalid.",scanMessage(e.message||"This ticket could not be confirmed."));return;}
    const t=data.ticket||{},who=t.brought_by?"<p>Guest of "+esc(t.brought_by)+"</p>":(t.bringing?"<p>Bringing "+esc(t.bringing)+" (own ticket)</p>":"");
    if(data.status==="already_checked_in"){
      if(navigator.vibrate)navigator.vibrate([80,60,80]);
      showScan("warn","Already inside.","<p><b>"+esc(t.guest_name)+"</b></p>"+who+(t.checked_in_at?"<p>First checked in at "+esc(hhmm(t.checked_in_at))+".</p>":"")+"<p>"+esc(t.seal_code||"")+"</p>");
    }else{
      showScan("ok","Confirmed.","<p><b>"+esc(t.guest_name)+"</b></p>"+who+"<p>"+esc(t.seal_code||"")+"</p>");
    }
    loadDoorList(data.status==="checked_in");
  }
  function stopCamera(){
    if(loop)clearTimeout(loop);loop=null;
    if(stream){stream.getTracks().forEach((track)=>track.stop());stream=null;}
    const video=byId("video");if(video)video.srcObject=null;
    const start=byId("start");if(start)start.textContent="Scan next";
  }
  async function startCamera(){
    const video=byId("video"),canvas=byId("canvas");if(!video||!canvas)return;
    if(!navigator.mediaDevices?.getUserMedia){showScan("bad","Camera unavailable.",scanMessage("This browser does not expose camera access. Paste the QR value manually."));return;}
    if(!ctx)ctx=canvas.getContext("2d",{willReadFrequently:true});
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}}});
    video.setAttribute("playsinline","");video.muted=true;video.srcObject=stream;await video.play();
    showScan("","Scanning...",scanMessage("Hold the QR inside the frame."));
    scheduleScan();
  }
  function scheduleScan(){loop=setTimeout(scanTick,120);}
  async function scanTick(){
    if(!stream)return;
    const video=byId("video"),canvas=byId("canvas");
    if(video&&canvas&&ctx&&video.readyState>=2&&video.videoWidth&&window.jsQR){
      try{
        const vw=video.videoWidth,vh=video.videoHeight,side=Math.min(vw,vh)*0.8,sx=(vw-side)/2,sy=(vh-side)/2,scale=Math.min(1,640/side);
        canvas.width=Math.round(side*scale);canvas.height=Math.round(side*scale);
        ctx.drawImage(video,sx,sy,side,side,0,0,canvas.width,canvas.height);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height),code=jsQR(img.data,img.width,img.height,{inversionAttempts:"attemptBoth"});
        if(code&&code.data){scanValue(code.data,false);return;}
      }catch(_){}
    }
    if(stream)scheduleScan();
  }
  async function loadDoorList(markLatest){
    const list=byId("list");if(!list)return;
    try{
      const data=await getJson("/api/door");
      doorScansData=data.scans||[];renderDoorList(markLatest);
    }catch(_){list.innerHTML='<p class="small">Could not load the list. Try again.</p>';}
  }
  function scanMatchesSearch(scan,query){return !query||[scan.guest_name,scan.brought_by,scan.table,scan.seal_code].some((value)=>String(value||"").toLowerCase().includes(query));}
  function renderDoorList(markLatest){
    const list=byId("list");if(!list)return;const query=scanSearchQuery.trim().toLowerCase(),scans=doorScansData.filter((scan)=>scanMatchesSearch(scan,query));
    list.innerHTML=scans.map((scan)=>'<div class="row"><b>'+esc(scan.guest_name)+(scan.brought_by?'<small>Guest of '+esc(scan.brought_by)+"</small>":"")+(scan.table?'<small>'+esc(scan.table)+"</small>":"")+"</b><span>"+esc(scan.seal_code||"")+"<br>"+esc(hhmm(scan.checked_in_at))+"</span></div>").join("")||'<p class="small">'+(query?"No matching scanned guests.":"No scanned tickets yet.")+"</p>";
    const first=list.querySelector(".row");if(markLatest&&first)first.classList.add("latest");
  }
  async function loadMembers(){
    const body=qs("#membersTable tbody");if(!body)return;
    body.innerHTML='<tr><td colspan="11">Loading...</td></tr>';
    try{const data=await getJson("/api/staff/members");members=data.members||[];renderMembers();}
    catch(_){body.innerHTML='<tr><td colspan="11">Could not load members.</td></tr>';}
  }
  function memberPrimaryNameKey(m){return String(m.holder==="guest"?m.name:m.guestOf||"").trim().toLowerCase();}
  function memberGroupKey(m){return String(m.rsvpId||m.id||"");}
  function memberResolvedGroupKey(m,primaryKeys){return primaryKeys.get(memberPrimaryNameKey(m))||memberGroupKey(m);}
  function memberMatchesSearch(m,q){return !q||[m.name,m.type,m.guestOf,m.email,m.phone,m.table].some((v)=>String(v||"").toLowerCase().includes(q));}
  function groupMembersForDisplay(rows,q){
    const primaryKeys=new Map();
    rows.forEach((m)=>{if(m.holder==="guest")primaryKeys.set(memberPrimaryNameKey(m),memberGroupKey(m));});
    const groups=new Map();
    rows.forEach((m)=>{const k=memberResolvedGroupKey(m,primaryKeys);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});
    return Array.from(groups.values()).filter((group)=>group.some((m)=>memberMatchesSearch(m,q))).sort((a,b)=>{
      const ap=a.find((m)=>m.holder==="guest")||a[0],bp=b.find((m)=>m.holder==="guest")||b[0];
      return String(bp.submittedAt||bp.createdAt||"").localeCompare(String(ap.submittedAt||ap.createdAt||""));
    }).flatMap((group)=>{
      const primary=group.find((m)=>m.holder==="guest"),others=group.filter((m)=>m!==primary);
      others.sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
      return primary?[primary].concat(others):others;
    });
  }
  function filteredMembers(){
    const q=byId("memberSearch")?.value.trim().toLowerCase()||"";
    return groupMembersForDisplay(members,q);
  }
  function renderMembers(){
    const body=qs("#membersTable tbody"),rows=filteredMembers(),visible=pageRows(rows,membersPage);if(!body)return;
    body.innerHTML=visible.map((m)=>'<tr'+(m.holder!=="guest"?' class="member-row-companion"':"")+'><td>'+esc(m.name)+'</td><td>'+esc(m.type)+'</td><td>'+esc(m.guestOf||"")+'</td><td>'+esc(m.email)+(m.emailIsFallback?' <span class="pill">fallback</span>':"")+'</td><td>'+esc(m.phone)+'</td><td class="group-start"><input type="checkbox" '+(m.wantsTableReservation?"checked":"")+' data-request-id="'+esc(m.rsvpId)+'"/></td><td><input type="checkbox" '+(m.reservationConfirmed?"checked":"")+' data-reservation-id="'+esc(m.rsvpId)+'"/></td><td class="group-end">'+esc(m.table||"")+'</td><td class="group-start"><input type="checkbox" '+(m.checkedIn?"checked":"")+' data-checkin-id="'+esc(m.id)+'"/></td><td class="group-end">'+esc(m.checkedInAt?new Date(m.checkedInAt).toLocaleString():"")+'</td><td>'+esc(m.submittedAt?new Date(m.submittedAt).toLocaleString():"")+'</td></tr>').join("")||'<tr><td colspan="11">No members.</td></tr>';
    renderPager("membersPager",rows,membersPage,(p)=>{membersPage=p;renderMembers();});
    qsa("[data-checkin-id]",body).forEach((cb)=>cb.onchange=()=>toggleMember(cb,cb.dataset.checkinId,cb.checked));
    qsa("[data-request-id]",body).forEach((cb)=>cb.onchange=()=>toggleRequest(cb,cb.dataset.requestId,cb.checked));
    qsa("[data-reservation-id]",body).forEach((cb)=>cb.onchange=()=>toggleReservation(cb,cb.dataset.reservationId,cb.checked));
  }
  function renderMembersAtCurrentScroll(){const scrollY=window.scrollY;renderMembers();requestAnimationFrame(()=>window.scrollTo({top:scrollY,behavior:"auto"}));}
  function updateMembersByRsvp(rsvpId,patch){members.forEach((member)=>{if(String(member.rsvpId)===String(rsvpId))Object.assign(member,patch);});}
  async function toggleMember(cb,id,checkedIn){
    if(!checkedIn&&!confirmToggle(cb,"Remove this guest check-in?"))return;
    const m=members.find((x)=>x.id===id);if(!m)return;
    cb.disabled=true;try{const data=await postJson("/api/staff/checkin-state",{rsvpId:m.rsvpId,companionId:m.companionId,holder:m.holder,checkedIn});Object.assign(m,{checkedIn:data.checkedIn===true,checkedInAt:data.checkedInAt||null});renderMembersAtCurrentScroll();loadDoorList();}
    catch(e){alert(e.message||"Could not update member");cb.checked=!checkedIn;cb.disabled=false;}
  }
  async function toggleRequest(cb,rsvpId,wantsTableReservation){
    if(!wantsTableReservation&&!confirmToggle(cb,"Remove table request for this group?"))return;
    cb.disabled=true;try{await postJson("/api/staff/reservation-state",{rsvpId:Number(rsvpId),wantsTableReservation});updateMembersByRsvp(rsvpId,{wantsTableReservation});renderMembersAtCurrentScroll();loadTables();}
    catch(e){alert(e.message||"Could not update reservation");cb.checked=!wantsTableReservation;cb.disabled=false;}
  }
  async function toggleReservation(cb,rsvpId,reservationConfirmed){
    if(!reservationConfirmed&&!confirmToggle(cb,"Remove table reservation confirmation?"))return;
    cb.disabled=true;try{await postJson("/api/staff/reservation-state",{rsvpId:Number(rsvpId),reservationConfirmed});updateMembersByRsvp(rsvpId,{reservationConfirmed});renderMembersAtCurrentScroll();loadTables();}
    catch(e){alert(e.message||"Could not update reservation");cb.checked=!reservationConfirmed;cb.disabled=false;}
  }
  function csvSafeValue(v){const s=String(v??"");return /^[=+\-@\t\r]/.test(s)?"'"+s:s;}
  function csvCell(v){return '"'+csvSafeValue(v).replace(/"/g,'""')+'"';}
  function downloadCsv(filename,rows){const blob=new Blob(["\uFEFF"+rows.map((r)=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function memberDate(v){return v?new Date(v).toLocaleString():"";}
  function exportMembersCsv(){
    const rows=[["Name","Type","Guest of","Email","Phone","Reservation requested","Reservation confirmed","Table","Checked in","Scanned at","Registered at"]].concat(filteredMembers().map((m)=>[m.name,m.type,m.guestOf,m.email,m.phone,m.wantsTableReservation?"yes":"no",m.reservationConfirmed?"yes":"no",m.table,m.checkedIn?"yes":"no",m.checkedInAt,m.submittedAt]));
    downloadCsv("whispers-members.csv",rows);
  }
  function memberGroups(rows){
    const primaryKeys=new Map();
    rows.forEach((m)=>{if(m.holder==="guest")primaryKeys.set(memberPrimaryNameKey(m),memberGroupKey(m));});
    const groups=new Map();
    rows.forEach((m)=>{const k=memberResolvedGroupKey(m,primaryKeys);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});
    return Array.from(groups.values());
  }
  byId("memberSearch")&&(byId("memberSearch").oninput=()=>{membersPage=1;renderMembers();});
  byId("scanSearch")&&(byId("scanSearch").oninput=(event)=>{scanSearchQuery=event.target.value;renderDoorList(false);});
  byId("exportMembers")&&(byId("exportMembers").onclick=exportMembersCsv);
  async function loadInvites(){
    const body=qs("#invitesTable tbody");if(!body)return;
    body.innerHTML='<tr><td colspan="'+inviteColspan()+'">Loading...</td></tr>';
    try{const data=await getJson("/api/staff/invites");invites=data.invites||[];renderInvites();}
    catch(_){body.innerHTML='<tr><td colspan="'+inviteColspan()+'">Could not load invites.</td></tr>';}
  }
  function inviteColspan(){return role==="owner"?9:8;}
  function inviteStatusLabel(status){return status==="attending"?"Attending":status==="declined"?"Declined":"Not responded";}
  function inviteTypeLabel(i){return i.source==="companion"?"Added guest":i.source==="rsvp"?"Direct RSVP":"Admin invite";}
  function inviteNameCell(i){const extra=[inviteTypeLabel(i),i.guestOf?"Guest of "+i.guestOf:""].filter(Boolean).join(" - ");return esc(i.name)+(extra?'<br><span class="small">'+esc(extra)+"</span>":"");}
  function inviteEditableCell(i,field){if(inviteEditId!==i.id)return esc(i[field]||"");const max=field==="email"?254:field==="phone"?40:120,inputmode=field==="email"?' inputmode="email"':field==="phone"?' inputmode="tel"':"";return '<input class="staff-control" data-invite-field="'+field+'" value="'+esc(i[field]||"")+'" maxlength="'+max+'"'+inputmode+'/>';}
  function filteredInvites(){
    const q=byId("inviteSearch")?.value.trim().toLowerCase()||"";
    return invites.filter((i)=>!q||[i.name,i.email,i.phone,i.status,inviteStatusLabel(i.status),inviteTypeLabel(i),i.guestOf,i.confirmationEmailSentAt?"sent":"not sent",i.inviteLink,i.confirmationLink,i.ticketLink].some((v)=>String(v||"").toLowerCase().includes(q)));
  }
  function exportInvitesCsv(){const rows=[["Name","Type","Guest of","Email","Phone","Status","Invite link","Confirmation link","Ticket link","Invite email sent","Send count","Created","Submitted"]].concat(filteredInvites().map((i)=>[i.name,inviteTypeLabel(i),i.guestOf,i.email,i.phone,inviteStatusLabel(i.status),i.inviteLink,i.confirmationLink,i.ticketLink,i.confirmationEmailSentAt,i.confirmationEmailSendCount,i.createdAt,i.submittedAt]));downloadCsv("whispers-invites.csv",rows);}
  function renderInvites(){
    const body=qs("#invitesTable tbody"),rows=filteredInvites(),visible=pageRows(rows,invitesPage);if(!body)return;
    body.innerHTML=visible.map((i)=>'<tr><td>'+(inviteEditId===i.id?inviteEditableCell(i,"name"):inviteNameCell(i))+'</td><td>'+inviteEditableCell(i,"email")+'</td><td>'+inviteEditableCell(i,"phone")+'</td><td>'+esc(inviteStatusLabel(i.status))+(i.submittedAt?'<br><span class="pill">'+esc(new Date(i.submittedAt).toLocaleString())+"</span>":"")+'</td><td>'+linkActionCell(i,"invite",i.inviteLink)+'</td><td>'+linkActionCell(i,"confirmation",i.confirmationLink)+'</td><td>'+linkActionCell(i,"ticket",i.ticketLink)+'</td><td>'+esc(i.createdAt?new Date(i.createdAt).toLocaleString():"")+"</td>"+(role==="owner"?'<td>'+inviteActionsCell(i)+"</td>":"")+"</tr>").join("")||'<tr><td colspan="'+inviteColspan()+'">No invites.</td></tr>';
    renderPager("invitesPager",rows,invitesPage,(p)=>{invitesPage=p;renderInvites();});
    qsa("[data-copy]",body).forEach((b)=>b.onclick=()=>copyText(b.dataset.copy,b,"Copy"));
    qsa("[data-send-link-id]",body).forEach((b)=>b.onclick=()=>sendLinkEmail(b.dataset.sendLinkId,b.dataset.sendLinkType,b));
    qsa("[data-invite-edit-id]",body).forEach((b)=>b.onclick=()=>{inviteEditId=b.dataset.inviteEditId;renderInvites();});
    qsa("[data-invite-save-id]",body).forEach((b)=>b.onclick=()=>saveInviteEdit(b.dataset.inviteSaveId));
    qsa("[data-invite-delete-id]",body).forEach((b)=>b.onclick=()=>deleteInvite(b.dataset.inviteDeleteId));
  }
  function isEditableInviteRow(i){return Boolean(i&&i.inviteLink&&!String(i.id||"").startsWith("rsvp:")&&!String(i.id||"").startsWith("companion:"));}
  function inviteActionsCell(i){
    if(role!=="owner"||!isEditableInviteRow(i))return "";
    if(inviteEditId===i.id)return '<div class="staff-row-actions"><button class="copy-btn primary" data-invite-save-id="'+esc(i.id)+'">Save</button><button class="copy-btn" data-invite-edit-id="">Cancel</button></div>';
    return '<div class="staff-row-actions"><button class="copy-btn" data-invite-edit-id="'+esc(i.id)+'">Edit</button><button class="copy-btn" data-invite-delete-id="'+esc(i.id)+'">Delete</button></div>';
  }
  async function saveInviteEdit(id){
    const row=qs('[data-invite-save-id="'+CSS.escape(id)+'"]')?.closest("tr");if(!row)return;
    const payload={id};qsa("[data-invite-field]",row).forEach((input)=>payload[input.dataset.inviteField]=input.value);
    setNotice("inviteState","Saving invite...",false);
    try{await postJson("/api/staff/invites",payload,"PATCH");inviteEditId="";setNotice("inviteState","Invite saved.",false);await loadInvites();}
    catch(e){setNotice("inviteState",e.message||"Could not save invite",true);}
  }
  async function deleteInvite(id){
    if(!window.confirm("Delete this invite and any linked RSVP record?"))return;
    setNotice("inviteState","Deleting invite...",false);
    try{await postJson("/api/staff/invites",{id},"DELETE");if(inviteEditId===id)inviteEditId="";setNotice("inviteState","Invite deleted.",false);await loadInvites();await loadMembers();await loadTables();}
    catch(e){setNotice("inviteState",e.message||"Could not delete invite",true);}
  }
  function linkActionCell(i,type,link){
    const canSend=type==="invite"?Boolean(i.email&&link):Boolean(link&&(i.rsvpEmail||i.email));
    const stamp=type==="invite"&&i.confirmationEmailSentAt?'<br><span class="pill">'+esc(new Date(i.confirmationEmailSentAt).toLocaleString())+"</span>":"";
    return '<div class="link-cell">'+esc(link||"")+'</div><button class="copy-btn" data-copy="'+esc(link||"")+'" '+(link?"":"disabled")+'>Copy</button> <button class="copy-btn" data-send-link-id="'+esc(i.id)+'" data-send-link-type="'+esc(type)+'" '+(canSend?"":"disabled")+">Send</button>"+stamp;
  }
  async function sendLinkEmail(id,type,button){
    button.disabled=true;button.textContent="Sending";setNotice("inviteState","Sending "+type+"...",false);
    try{const data=await postJson("/api/staff/invite-send",{id,type});const item=invites.find((i)=>i.id===id);if(item&&type==="invite"){item.confirmationEmailSentAt=data.confirmationEmailSentAt;item.confirmationEmailSendCount=data.confirmationEmailSendCount;}setNotice("inviteState","Sent.",false);renderInvites();}
    catch(e){button.disabled=false;button.textContent="Send";setNotice("inviteState",e.message||"Could not send "+type,true);}
  }
  byId("inviteSearch")&&(byId("inviteSearch").oninput=()=>{invitesPage=1;renderInvites();});
  byId("exportInvites")&&(byId("exportInvites").onclick=exportInvitesCsv);
  byId("reloadInvites")&&(byId("reloadInvites").onclick=loadInvites);
  byId("inviteForm")&&(byId("inviteForm").onsubmit=async(e)=>{
    e.preventDefault();setNotice("inviteState","Creating invite...",false);
    const payload={name:byId("inviteName").value,email:byId("inviteEmail").value,phone:byId("invitePhone").value};
    try{const data=await postJson("/api/staff/invites",payload);byId("inviteForm").reset();if(data.emailDelivery?.error)setNotice("inviteState","Invite created, but email was not sent: "+data.emailDelivery.error,true);else setNotice("inviteState",data.emailDelivery?.sent?"Invite created and sent.":"Invite created.",false);await loadInvites();}
    catch(err){setNotice("inviteState",err.message||"Could not create invite",true);}
  });
  async function loadStaff(){
    if(role!=="owner")return;
    const body=qs("#staffUsersTable tbody");if(!body)return;
    setNotice("staffState","",false);body.innerHTML='<tr><td colspan="6">Loading...</td></tr>';
    try{const data=await getJson("/api/staff/users");staffUsers=data.users||[];renderStaff();}
    catch(_){body.innerHTML='<tr><td colspan="6">Could not load staff users.</td></tr>';}
  }
  function renderStaff(){
    const body=qs("#staffUsersTable tbody");if(!body)return;
    body.innerHTML=staffUsers.map((u)=>'<tr><td><input class="staff-control" data-staff-username="'+esc(u.id)+'" value="'+esc(u.username)+'"/></td><td><select class="staff-select" data-staff-role="'+esc(u.id)+'"><option value="owner" '+(u.role==="owner"?"selected":"")+'>owner</option><option value="admin" '+(u.role==="admin"?"selected":"")+'>admin</option><option value="door" '+(u.role==="door"?"selected":"")+'>door</option><option value="service" '+(u.role==="service"?"selected":"")+'>service</option></select></td><td><input type="checkbox" '+(u.active?"checked":"")+' data-staff-active="'+esc(u.id)+'"/></td><td>'+esc(u.createdAt?new Date(u.createdAt).toLocaleString():"")+'</td><td>'+esc(u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString():"")+'</td><td><div class="staff-row-actions"><button data-staff-save="'+esc(u.id)+'">Save</button><button data-staff-reset="'+esc(u.id)+'">Reset Password</button><button data-staff-delete="'+esc(u.id)+'">Delete</button></div></td></tr>').join("")||'<tr><td colspan="6">No staff users.</td></tr>';
    qsa("[data-staff-save]",body).forEach((b)=>b.onclick=()=>saveStaffUser(b.dataset.staffSave));
    qsa("[data-staff-reset]",body).forEach((b)=>b.onclick=()=>resetStaffPassword(b.dataset.staffReset));
    qsa("[data-staff-delete]",body).forEach((b)=>b.onclick=()=>deleteStaffUser(b.dataset.staffDelete));
  }
  function staffField(id,name){return qs('[data-staff-'+name+'="'+CSS.escape(id)+'"]');}
  function showStaffPassword(password){const box=byId("staffPasswordReveal"),value=byId("staffPasswordValue");if(!box||!value)return;value.textContent=password||"";box.classList.toggle("on",Boolean(password));box.scrollIntoView({behavior:"smooth",block:"nearest"});}
  byId("copyStaffPassword")&&(byId("copyStaffPassword").onclick=()=>copyText(byId("staffPasswordValue")?.textContent||"",byId("copyStaffPassword"),"Copy Password"));
  byId("staffCreate")&&(byId("staffCreate").onsubmit=async(e)=>{
    e.preventDefault();setNotice("staffState","Creating staff user...",false);
    try{const data=await postJson("/api/staff/users",{username:byId("newStaffUsername").value});byId("staffCreate").reset();setNotice("staffState","Admin created.",false);showStaffPassword(data.temporaryPassword);await loadStaff();}
    catch(err){setNotice("staffState",err.message||"Could not create staff user",true);}
  });
  async function saveStaffUser(id){
    setNotice("staffState","Saving...",false);
    try{await postJson("/api/staff/users",{id,username:staffField(id,"username").value,role:staffField(id,"role").value,active:staffField(id,"active").checked},"PATCH");setNotice("staffState","Saved.",false);await loadStaff();}
    catch(err){setNotice("staffState",err.message||"Could not save staff user",true);}
  }
  async function resetStaffPassword(id){
    if(!window.confirm("Generate a new password for this staff user?"))return;
    setNotice("staffState","Resetting password...",false);
    try{const data=await postJson("/api/staff/users/password",{id});setNotice("staffState","Password reset.",false);showStaffPassword(data.temporaryPassword);}
    catch(err){setNotice("staffState",err.message||"Could not reset password",true);}
  }
  async function deleteStaffUser(id){
    if(!window.confirm("Delete this staff user?"))return;
    setNotice("staffState","Deleting...",false);
    try{await postJson("/api/staff/users",{id},"DELETE");setNotice("staffState","Deleted.",false);await loadStaff();}
    catch(err){setNotice("staffState",err.message||"Could not delete staff user",true);}
  }
  function setRsvpSettingsBusy(setting,busy){const ui=RSVP_SETTING_UI[setting],input=byId(ui?.input),apply=byId(ui?.apply),cancel=byId(ui?.cancel);if(input)input.disabled=busy;if(apply)apply.disabled=busy||!rsvpSettings[setting];if(cancel)cancel.disabled=busy;}
  function updateRsvpActionLabel(setting){const ui=RSVP_SETTING_UI[setting],button=byId(ui?.apply),input=byId(ui?.input),policy=rsvpSettings[setting];if(!button||!policy)return;const action=policy.isOpen?"lock":"unlock";button.textContent=input?.value?"Schedule "+action:(policy.isOpen?"Lock now":"Unlock now");}
  function renderRsvpSetting(setting,policy){
    const ui=RSVP_SETTING_UI[setting];rsvpSettings[setting]=policy;const status=byId(ui?.status),scheduled=byId(ui?.scheduled),cancel=byId(ui?.cancel);if(!status||!scheduled||!cancel)return;
    status.textContent=policy.isOpen?"OPEN":"LOCKED";status.className="settings-status"+(policy.isOpen?"":" locked");const change=policy.scheduledChange;
    if(change){const at=new Date(change.at).toLocaleString("en-GB",{timeZone:"Europe/Sofia",dateStyle:"medium",timeStyle:"short"});scheduled.textContent=(change.open?"Unlocks":"Locks")+" automatically on "+at+" (Europe/Sofia).";scheduled.hidden=false;cancel.hidden=false;}else{scheduled.textContent="";scheduled.hidden=true;cancel.hidden=true;}
    setRsvpSettingsBusy(setting,false);updateRsvpActionLabel(setting);
  }
  async function loadSettings(){
    if(role!=="owner")return;for(const setting of Object.keys(RSVP_SETTING_UI)){setNotice(RSVP_SETTING_UI[setting].state,"Loading...",false);setRsvpSettingsBusy(setting,true);}
    try{const data=await getJson("/api/staff/settings");for(const setting of Object.keys(RSVP_SETTING_UI)){renderRsvpSetting(setting,data.rsvp[setting]);setNotice(RSVP_SETTING_UI[setting].state,"",false);}await previewTicketBulkSend();}catch(err){for(const setting of Object.keys(RSVP_SETTING_UI)){setNotice(RSVP_SETTING_UI[setting].state,err.message||"Could not load RSVP settings",true);setRsvpSettingsBusy(setting,false);}}
  }
  async function saveRsvpSetting(setting,targetOpen){
    const ui=RSVP_SETTING_UI[setting],input=byId(ui?.input);setNotice(ui.state,"Saving...",false);setRsvpSettingsBusy(setting,true);
    try{const data=await postJson("/api/staff/settings",{setting,targetOpen,changeAtLocal:input?.value||null},"PATCH");if(input)input.value="";for(const key of Object.keys(RSVP_SETTING_UI))renderRsvpSetting(key,data.rsvp[key]);setNotice(ui.state,data.rsvp[setting].scheduledChange?"Scheduled.":"Saved.",false);}catch(err){setNotice(ui.state,err.message||"Could not save RSVP settings",true);setRsvpSettingsBusy(setting,false);}
  }
  async function cancelRsvpSchedule(setting){
    const ui=RSVP_SETTING_UI[setting];setNotice(ui.state,"Cancelling...",false);setRsvpSettingsBusy(setting,true);
    try{const data=await postJson("/api/staff/settings",{setting,cancelScheduledChange:true},"PATCH");for(const key of Object.keys(RSVP_SETTING_UI))renderRsvpSetting(key,data.rsvp[key]);setNotice(ui.state,"Scheduled change cancelled.",false);}catch(err){setNotice(ui.state,err.message||"Could not cancel scheduled change",true);setRsvpSettingsBusy(setting,false);}
  }
  for(const setting of Object.keys(RSVP_SETTING_UI)){const ui=RSVP_SETTING_UI[setting],input=byId(ui.input),apply=byId(ui.apply),cancel=byId(ui.cancel);if(input)input.oninput=()=>updateRsvpActionLabel(setting);if(apply)apply.onclick=()=>{const policy=rsvpSettings[setting];if(policy)saveRsvpSetting(setting,!policy.isOpen);};if(cancel)cancel.onclick=()=>cancelRsvpSchedule(setting);}
  function setTicketBulkBusy(busy){["previewTicketBulkSend","sendTicketBulkSend","ticketBulkSendAt"].forEach((id)=>{const el=byId(id);if(el)el.disabled=busy;});}
  function updateTicketBulkActionLabel(){const input=byId("ticketBulkSendAt"),button=byId("sendTicketBulkSend");if(!button)return;const at=input?.value?new Date(input.value):null;button.textContent=at&&at.getTime()>Date.now()+30000?"Schedule tickets":"Send all tickets";}
  function ticketBulkPayload(dryRun){const scheduledAtLocal=byId("ticketBulkSendAt")?.value||null;return dryRun?{dryRun:true,scheduledAtLocal}:{dryRun:false,scheduledAtLocal};}
  async function callTicketBulkSend(dryRun){return postJson("/api/staff/ticket-bulk-send",ticketBulkPayload(dryRun));}
  function renderTicketEmailLists(data){
    const box=byId("ticketEmailLists");if(!box)return;
    const pending=data.pendingRecipients||[],issues=data.deliveryIssues||[];
    const issueRows=issues.map((item)=>'<tr><td>'+esc(item.name||"Guest")+'</td><td>'+esc(item.email)+'</td><td>'+esc(item.type)+'</td><td>'+esc(item.description||"")+'</td><td>'+esc(item.bouncedAt?new Date(item.bouncedAt).toLocaleString():"")+'</td></tr>').join("");
    const pendingRows=pending.map((item)=>'<tr><td>'+esc(item.name||"Guest")+'</td><td>'+esc(item.email)+'</td><td>'+esc(item.kind==="companion"?"Added guest":"Guest")+'</td></tr>').join("");
    box.innerHTML=(data.deliveryIssueWarning?'<div class="ticket-email-warning">'+esc(data.deliveryIssueWarning)+'</div>':"")+
      '<div class="ticket-email-list"><h3>Postmark delivery issues ('+issues.length+')</h3>'+(issueRows?'<div class="grid"><table><thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Reason</th><th>Time</th></tr></thead><tbody>'+issueRows+'</tbody></table></div>':'<div class="ticket-email-empty">No ticket delivery issues found in Postmark.</div>')+"</div>"+
      '<div class="ticket-email-list"><h3>Pending in database ('+pending.length+')</h3>'+(pendingRows?'<div class="grid"><table><thead><tr><th>Name</th><th>Email</th><th>Type</th></tr></thead><tbody>'+pendingRows+'</tbody></table></div>':'<div class="ticket-email-empty">No pending ticket emails in the database.</div>')+"</div>";
  }
  async function previewTicketBulkSend(){
    if(role!=="owner"||!byId("previewTicketBulkSend"))return;setTicketBulkBusy(true);setNotice("ticketBulkSendState","Checking pending tickets...",false);
    try{const data=await callTicketBulkSend(true);renderTicketEmailLists(data);setNotice("ticketBulkSendState",data.pending+" pending ticket email"+(data.pending===1?"":"s")+" ("+data.primary+" guests, "+data.companions+" added guests). Delivery issues: "+(data.deliveryIssues||[]).length+".",false);}catch(err){setNotice("ticketBulkSendState",err.message||"Could not preview ticket emails",true);}
    finally{setTicketBulkBusy(false);}
  }
  let ticketBulkTimer=null;
  async function sendTicketBulkSend(){
    if(role!=="owner")return;if(ticketBulkTimer){clearTimeout(ticketBulkTimer);ticketBulkTimer=null;}
    const input=byId("ticketBulkSendAt"),raw=input?.value||"",at=raw?new Date(raw):null;
    if(at&&at.getTime()>Date.now()+30000){ticketBulkTimer=setTimeout(()=>{if(input)input.value="";sendTicketBulkSend();},at.getTime()-Date.now());setNotice("ticketBulkSendState","Scheduled for "+at.toLocaleString()+". Keep this tab open.",false);return;}
    setTicketBulkBusy(true);setNotice("ticketBulkSendState","Preparing ticket emails...",false);
    try{const preview=await callTicketBulkSend(true);if(!preview.pending){setNotice("ticketBulkSendState","No pending ticket emails.",false);return;}if(!confirm("Send "+preview.pending+" ticket emails now?")){setNotice("ticketBulkSendState","Send cancelled.",false);return;}setNotice("ticketBulkSendState","Sending "+preview.pending+" ticket emails...",false);const data=await callTicketBulkSend(false);setNotice("ticketBulkSendState","Sent "+data.sent+". Failed "+data.failed+".",data.failed>0);await loadMembers();}catch(err){setNotice("ticketBulkSendState",err.message||"Could not send ticket emails",true);}
    finally{setTicketBulkBusy(false);}
  }
  byId("previewTicketBulkSend")&&(byId("previewTicketBulkSend").onclick=previewTicketBulkSend);
  byId("sendTicketBulkSend")&&(byId("sendTicketBulkSend").onclick=sendTicketBulkSend);
  byId("ticketBulkSendAt")&&(byId("ticketBulkSendAt").oninput=updateTicketBulkActionLabel);
  updateTicketBulkActionLabel();
  async function loadTables(){
    const box=byId("tablesView");if(!box)return;
    box.innerHTML='<div class="empty-state">Loading...</div>';
    try{tablesData=await getJson("/api/staff/tables");if(tableMapDraft.hasChanges()){for(const table of tablesData.tables||[]){const p=tableMapDraft.position(table.id);table.mapX=p.x;table.mapY=p.y;}}else tableMapDraft.load((tablesData.tables||[]).map((table)=>({id:table.id,position:{x:table.mapX,y:table.mapY}})));renderHallMap();renderTables();renderTablePeopleSearch();}
    catch(_){box.innerHTML='<div class="empty-state">Could not load tables.</div>';}
  }
  function tableNumber(table){return String(table.sortOrder||table.label||"").replace(/\D/g,"")||table.label;}
  function renderHallMap(){
    const button=byId("toggleHallMap"),shell=byId("hallMapShell"),map=byId("hallMap");if(!button||!shell||!map)return;
    button.textContent=hallMapOpen?"Close map":"Open map";shell.hidden=!hallMapOpen;const undo=byId("undoHallMap"),save=byId("saveHallMap");if(undo)undo.disabled=!tableMapDraft.canUndo();if(save)save.disabled=!tableMapDraft.hasChanges();if(!hallMapOpen)return;
    map.innerHTML=(tablesData.tables||[]).map((t)=>'<button type="button" class="map-table '+(selectedTableId===t.id?"active":"")+'" data-map-table="'+esc(t.id)+'" style="left:'+Number(t.mapX??50)+'%;top:'+Number(t.mapY??50)+'%" aria-label="'+esc(t.label)+'">'+esc(tableNumber(t))+"</button>").join("");
    qsa("[data-map-table]",map).forEach(bindMapTable);
  }
  function bindMapTable(el){
    if(tablesReadOnly){el.onclick=()=>openTableFromMap(el.dataset.mapTable);return;}
    el.addEventListener("pointerdown",(e)=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();const table=(tablesData.tables||[]).find((t)=>t.id===el.dataset.mapTable);el.setPointerCapture(e.pointerId);mapDrag={pointerId:e.pointerId,tableId:el.dataset.mapTable,startX:e.clientX,startY:e.clientY,start:{x:table?.mapX??50,y:table?.mapY??50},dragged:false,el};});
    el.addEventListener("pointermove",(e)=>{if(!mapDrag||mapDrag.pointerId!==e.pointerId||mapDrag.el!==el)return;if(!mapDrag.dragged&&Math.hypot(e.clientX-mapDrag.startX,e.clientY-mapDrag.startY)<MAP_DRAG_THRESHOLD)return;mapDrag.dragged=true;el.classList.add("dragging");const map=byId("hallMap"),rect=map.getBoundingClientRect(),padX=el.offsetWidth/2/rect.width*100,padY=el.offsetHeight/2/rect.height*100,mapX=Math.max(padX,Math.min(100-padX,(e.clientX-rect.left)/rect.width*100)),mapY=Math.max(padY,Math.min(100-padY,(e.clientY-rect.top)/rect.height*100));el.style.left=mapX+"%";el.style.top=mapY+"%";const table=(tablesData.tables||[]).find((t)=>t.id===mapDrag.tableId);if(table){table.mapX=Math.round(mapX*100)/100;table.mapY=Math.round(mapY*100)/100;}});
    el.addEventListener("pointerup",(e)=>{if(!mapDrag||mapDrag.pointerId!==e.pointerId||mapDrag.el!==el)return;const drag=mapDrag;mapDrag=null;el.classList.remove("dragging");if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);if(drag.dragged){const table=(tablesData.tables||[]).find((t)=>t.id===drag.tableId);if(table)tableMapDraft.move(table.id,{x:table.mapX,y:table.mapY});renderHallMap();}else openTableFromMap(drag.tableId);});
    el.addEventListener("pointercancel",(e)=>{if(mapDrag&&mapDrag.pointerId===e.pointerId&&mapDrag.el===el){const table=(tablesData.tables||[]).find((t)=>t.id===mapDrag.tableId);if(table){table.mapX=mapDrag.start.x;table.mapY=mapDrag.start.y;}mapDrag=null;renderHallMap();}});
  }
  function applyTableMapPosition(entry){const table=(tablesData.tables||[]).find((t)=>String(t.id)===String(entry.id));if(table){table.mapX=entry.position.x;table.mapY=entry.position.y;}}
  function undoTableMap(){const entry=tableMapDraft.undo();if(entry){applyTableMapPosition(entry);renderHallMap();}}
  async function saveTableMapDrafts(){setNotice("hallMapState","Saving...",false);for(const entry of tableMapDraft.pending()){try{const data=await postJson("/api/staff/tables",{tableId:entry.id,mapX:entry.position.x,mapY:entry.position.y},"PATCH");tableMapDraft.confirm(entry.id,{x:data.mapX,y:data.mapY});applyTableMapPosition({id:entry.id,position:{x:data.mapX,y:data.mapY}});}catch(err){setNotice("hallMapState",err.message||"Could not save table position.",true);renderHallMap();return false;}}setNotice("hallMapState","Saved.",false);renderHallMap();return true;}
  function discardTableMapDrafts(){for(const entry of tableMapDraft.discard())applyTableMapPosition(entry);renderHallMap();}
  mapDraftRegistry.register("tables-map",{isDirty:()=>tableMapDraft.hasChanges(),save:saveTableMapDrafts,discard:discardTableMapDrafts});
  function openTableFromMap(tableId){hallMapOpen=false;selectedTableId=tableId;tableSpendNotice=null;renderHallMap();renderTables();requestAnimationFrame(()=>byId("selectedTableDetail")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}));}
  function renderTablePeopleSearch(){
    const input=byId("tablePeopleSearch"),results=byId("tablePeopleResults");if(!input||!results)return;tablePeopleSearch=input.value;const query=tablePeopleSearch.trim().toLowerCase();results.hidden=!query;if(!query){results.innerHTML="";return;}
    const tables=tablesData.tables||[],matches=[];for(const group of tablesData.groups||[]){for(const person of group.peopleDetails||[]){if([person.name,person.email,person.phone].some((value)=>String(value||"").toLowerCase().includes(query)))matches.push({group,person});}}
    results.innerHTML=matches.slice(0,30).map(({group,person})=>{const table=tables.find((item)=>item.id===group.tableId),contact=[person.email,person.phone].filter(Boolean).join(" · ")||"No contact details";return '<button type="button" class="table-person-result" data-table-person data-table-id="'+esc(group.tableId||"")+'" data-rsvp-id="'+esc(group.rsvpId)+'"><span><b>'+esc(person.name)+"</b><small>"+esc(contact)+"</small></span><strong>"+esc(table?.label||"Unassigned")+"</strong></button>";}).join("")||'<div class="table-person-empty">No matching people.</div>';
    qsa("[data-table-person]",results).forEach((button)=>button.onclick=()=>openTableFromSearch(button.dataset.tableId||null,button.dataset.rsvpId));
  }
  function openTableFromSearch(tableId,rsvpId){
    if(!tableId)unassignedExpanded=true;hallMapOpen=false;selectedTableId=tableId||null;tableSpendNotice=null;renderHallMap();renderTables();const results=byId("tablePeopleResults");if(results)results.hidden=true;requestAnimationFrame(()=>{const target=qsa("[data-group-rsvp]").find((element)=>element.dataset.groupRsvp===String(rsvpId))||byId("selectedTableDetail");if(!target)return;target.classList.add("search-hit");target.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});setTimeout(()=>target.classList.remove("search-hit"),1400);});
  }
  function renderTables(){
    const box=byId("tablesView");if(!box)return;
    const tables=tablesData.tables||[],groups=tablesData.groups||[],cards=[{id:null,label:"Unassigned"}].concat(tables);
    if(selectedTableId!==null&&!tables.some((t)=>t.id===selectedTableId))selectedTableId=null;
    const current=cards.find((t)=>(t.id||null)===selectedTableId)||cards[0],assigned=groups.filter((g)=>(g.tableId||null)===(current.id||null)),available=groups.filter((g)=>(g.tableId||null)!==(current.id||null)).filter(groupMatchesTableSearch);
    const used=assigned.reduce((sum,g)=>sum+(g.size||0),0);
    const spend=current.id?(tablesReadOnly?minimumSpendReadOnly(current):minimumSpendEditor(current)):"";
    const unassignedCollapsed=!current.id&&!unassignedExpanded&&!matchMedia("(min-width: 760px)").matches,detailBody=spend+'<div class="table-groups">'+(assigned.map((g)=>groupCard(g,current.id,tables)).join("")||'<div class="empty-state">No groups here.</div>')+'</div>'+(current.id&&!tablesReadOnly?'<div class="table-add"><div class="table-add-head"><h3>Add to '+esc(current.label)+'</h3><input class="table-search" id="tableSearch" placeholder="Search all guests" value="'+esc(tableSearch)+'" autocomplete="off"/></div><div class="available-list">'+(available.map((g)=>groupCard(g,current.id,tables,true)).join("")||'<div class="empty-state">No other reservation groups.</div>')+"</div></div>":"");
    box.innerHTML='<div class="table-list">'+cards.map((t)=>{const rows=groups.filter((g)=>(g.tableId||null)===(t.id||null)),guests=rows.reduce((sum,g)=>sum+(g.size||0),0),active=(t.id||null)===(current.id||null);return '<button class="table-chip '+(active?"active":"")+'" data-table-id="'+esc(t.id||"")+'"><b>'+esc(t.label)+'</b><small>'+(t.id?guests+" guest"+(guests===1?"":"s")+" · "+formatMinimumSpend(t.minimumSpendEur)+" min":rows.length+" waiting")+"</small></button>";}).join("")+'</div><div class="table-detail '+(unassignedCollapsed?"unassigned-collapsed":"")+'" id="selectedTableDetail"><div class="table-detail-head"><div><h2>'+esc(current.label)+'</h2><p class="small">'+(current.id?"Assigned reservation groups":"Attending groups waiting for a table")+'</p></div><div class="guest-count">'+(current.id?used+" guest"+(used===1?"":"s"):"Unassigned")+'</div></div>'+(!current.id?'<button class="unassigned-toggle" type="button" data-toggle-unassigned aria-expanded="'+String(!unassignedCollapsed)+'">'+(unassignedCollapsed?"Show unassigned":"Hide unassigned")+"</button>":"")+'<div class="table-detail-body">'+detailBody+"</div></div>";
    qsa(".table-chip",box).forEach((b)=>b.onclick=()=>{selectedTableId=b.dataset.tableId||null;if(!selectedTableId)unassignedExpanded=true;tableSpendNotice=null;renderTables();});
    const unassignedToggle=box.querySelector("[data-toggle-unassigned]");if(unassignedToggle)unassignedToggle.onclick=()=>{unassignedExpanded=!unassignedExpanded;renderTables();};
    const spendInput=box.querySelector("[data-minimum-spend]"),spendButton=box.querySelector("[data-save-minimum-spend]");if(spendInput&&spendButton){spendButton.onclick=()=>saveMinimumSpend(spendInput);spendInput.onkeydown=(e)=>{if(e.key==="Enter"){e.preventDefault();saveMinimumSpend(spendInput);}};}
    const search=byId("tableSearch");if(search)search.oninput=()=>{tableSearch=search.value;renderTables();};
    qsa("[data-assign]",box).forEach((b)=>b.onclick=()=>assignTable(b.dataset.rsvpId,b.dataset.assign||null));
    qsa("select",box).forEach((s)=>s.onchange=()=>assignTable(s.dataset.rsvpId,s.value||null));
    qsa("[data-reservation-id]",box).forEach((cb)=>cb.onchange=()=>toggleReservation(cb,cb.dataset.reservationId,cb.checked));
  }
  function formatMinimumSpend(value){return "€"+Number(value||0).toLocaleString("en-US");}
  function minimumSpendReadOnly(table){return '<div class="minimum-spend"><span>Minimum spend (EUR)</span><strong>'+formatMinimumSpend(table.minimumSpendEur)+"</strong></div>";}
  function minimumSpendEditor(table){const notice=tableSpendNotice?.tableId===table.id?tableSpendNotice:null;return '<div class="minimum-spend"><span>Minimum spend (EUR)</span><div class="minimum-spend-controls"><input type="number" min="0" step="1" inputmode="numeric" data-minimum-spend="'+esc(table.id)+'" value="'+esc(table.minimumSpendEur||0)+'" aria-label="Minimum spend in EUR"/><button type="button" data-save-minimum-spend>Save</button></div><p class="minimum-spend-state '+(notice?.error?"err":"")+'" aria-live="polite">'+esc(notice?.text||"")+"</p></div>";}
  async function saveMinimumSpend(input){
    const raw=input.value.trim(),minimumSpendEur=raw===""?0:Number(raw),tableId=input.dataset.minimumSpend;
    if(!/^\d*$/.test(raw)||!Number.isSafeInteger(minimumSpendEur)||minimumSpendEur<0){tableSpendNotice={tableId,text:"Enter a whole euro amount.",error:true};renderTables();return;}
    tableSpendNotice={tableId,text:"Saving...",error:false};input.disabled=true;const editor=input.closest(".minimum-spend"),button=editor?.querySelector("[data-save-minimum-spend]"),state=editor?.querySelector(".minimum-spend-state");if(button)button.disabled=true;if(state)state.textContent="Saving...";
    try{const data=await postJson("/api/staff/tables",{tableId,minimumSpendEur},"PATCH"),table=(tablesData.tables||[]).find((t)=>t.id===tableId);if(table)table.minimumSpendEur=data.minimumSpendEur;tableSpendNotice={tableId,text:"Saved.",error:false};renderTables();}
    catch(err){tableSpendNotice={tableId,text:err.message||"Could not update minimum spend.",error:true};renderTables();}
  }
  function groupMatchesTableSearch(g){const q=tableSearch.trim().toLowerCase();if(!q)return true;return [g.name,g.size,g.tableId,g.wantsTableReservation?"requested table":"",g.reservationConfirmed?"confirmed":"unconfirmed"].concat(g.people||[]).some((v)=>String(v||"").toLowerCase().includes(q));}
  function groupCard(g,currentId,tables,asAdd){
    const people=(g.people&&g.people.length?g.people:[g.name]).map((p)=>'<span class="person">'+esc(p)+"</span>").join("");
    const request=g.wantsTableReservation?' <span class="pill">requested table</span>':"",confirmed=g.reservationConfirmed?' <span class="pill">confirmed</span>':"";
    const action=asAdd?'<button class="primary" data-rsvp-id="'+esc(g.rsvpId)+'" data-assign="'+esc(currentId)+'">Add</button>':(currentId?'<button data-rsvp-id="'+esc(g.rsvpId)+'" data-assign="">Remove</button>':"");
    const controls=tablesReadOnly?"":'<label class="mini-check"><input type="checkbox" '+(g.reservationConfirmed?"checked":"")+' data-reservation-id="'+esc(g.rsvpId)+'"/>Confirmed</label>'+action+tableSelect(g,tables);
    return '<div class="group" data-group-rsvp="'+esc(g.rsvpId)+'"><div><div class="group-main">'+esc(g.name)+' <span class="pill">'+esc(g.size)+"</span>"+request+confirmed+'</div><div class="people">'+people+'</div></div><div class="group-actions">'+controls+"</div></div>";
  }
  function tableSelect(g,tables){return '<select aria-label="Move group" data-rsvp-id="'+esc(g.rsvpId)+'"><option value="">Unassigned</option>'+tables.map((t)=>'<option value="'+esc(t.id)+'" '+(g.tableId===t.id?"selected":"")+">"+esc(t.label)+"</option>").join("")+"</select>";}
  async function assignTable(rsvpId,tableId){try{await postJson("/api/staff/table-assignment",{rsvpId:Number(rsvpId),tableId});await loadTables();await loadMembers();}catch(e){alert(e.message||"Could not assign table");}}
  function exportTablesCsv(){const tables=tablesData.tables||[],groups=tablesData.groups||[],tableName=(id)=>{const table=tables.find((t)=>t.id===id);return table?table.label:"Unassigned";};const rows=[["Table","Minimum spend EUR","Guests","Group","People","Reservation requested","Reservation confirmed"]].concat(groups.map((g)=>{const table=tables.find((t)=>t.id===g.tableId),same=groups.filter((x)=>(x.tableId||null)===(g.tableId||null)),used=same.reduce((sum,x)=>sum+(x.size||0),0);return [tableName(g.tableId),table?.minimumSpendEur||0,used,g.name,(g.people||[]).join(" | "),g.wantsTableReservation?"yes":"no",g.reservationConfirmed?"yes":"no"];}));downloadCsv("whispers-tables.csv",rows);}
  byId("exportTables")&&(byId("exportTables").onclick=exportTablesCsv);
  byId("toggleHallMap")&&(byId("toggleHallMap").onclick=()=>{hallMapOpen=!hallMapOpen;setNotice("hallMapState","",false);renderHallMap();if(hallMapOpen)requestAnimationFrame(()=>byId("hallMap")?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}));});
  byId("undoHallMap")&&(byId("undoHallMap").onclick=undoTableMap);
  byId("saveHallMap")&&(byId("saveHallMap").onclick=saveTableMapDrafts);
  byId("tablePeopleSearch")&&(byId("tablePeopleSearch").oninput=renderTablePeopleSearch);
  byId("tablesToTop")&&(byId("tablesToTop").onclick=()=>window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
  window.addEventListener("scroll",updateTablesToTop,{passive:true});
  byId("copyMenuLink")&&(byId("copyMenuLink").onclick=copyMenuLink);
  byId("shareMenuLink")&&(byId("shareMenuLink").onclick=shareMenuLink);
  byId("downloadMenuSvg")&&(byId("downloadMenuSvg").onclick=downloadMenuSvg);
  byId("downloadMenuPng")&&(byId("downloadMenuPng").onclick=downloadMenuPng);
  byId("downloadMenuPdfA4")&&(byId("downloadMenuPdfA4").onclick=downloadMenuPdfA4);
  byId("downloadMenuPdfSquare")&&(byId("downloadMenuPdfSquare").onclick=downloadMenuPdfSquare);
  byId("start")&&(byId("start").onclick=()=>{window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});startCamera().catch(()=>{stopCamera();showScan("bad","Camera blocked.",scanMessage("Allow camera access or paste the QR value manually."));});});
  byId("stop")&&(byId("stop").onclick=stopCamera);
  byId("manualBtn")&&(byId("manualBtn").onclick=()=>scanValue(byId("manual")?.value.trim()||"",true));
  byId("switch")&&(byId("switch").onclick=()=>showScan("warn","Switch unavailable.",scanMessage("Close and reopen the camera if you need another lens.")));
  qsa(".tab").forEach((tab)=>{if(!allowed.includes(tab.dataset.view))tab.hidden=true;tab.addEventListener("click",(e)=>{e.preventDefault();guardMapChanges(()=>{history.replaceState(null,"","#view-"+tab.dataset.view);return tab.dataset.view==="tables"?openTablesOverview():setView(tab.dataset.view);});});});
  byId("refresh")&&(byId("refresh").onclick=(e)=>{e.preventDefault();guardMapChanges(()=>location.reload());});
  byId("logout")&&(byId("logout").onclick=(e)=>{e.preventDefault();guardMapChanges(()=>location.assign("/api/staff/logout"));});
  window.addEventListener("beforeunload",(e)=>{if(mapDraftRegistry.hasChanges()){e.preventDefault();e.returnValue="";}});
  window.addEventListener("hashchange",()=>setView(viewFromHash()));
  setView(viewFromHash());
})();
