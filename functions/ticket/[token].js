function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

export async function onRequestGet({ params, request }) {
  const token = params.token;
  const origin = new URL(request.url).origin;
  const apiUrl = `${origin}/api/ticket?token=${encodeURIComponent(token)}`;
  const ticketUrl = `${origin}/ticket/${encodeURIComponent(token)}`;

  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<title>WHISPERS Ticket</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&amp;family=Jost:wght@300;400&amp;display=swap" rel="stylesheet"/>
<style>
:root{--bg:#070605;--gold:#D9AE78;--gold-hi:#EBCB95;--bone:#EDE6DA;--mute:#BDB2A5;--paper:#F1E9DC;--line:rgba(217,174,120,.26);--serif:'Cormorant Garamond',Cambria,Georgia,serif;--sans:'Jost','Helvetica Neue',Arial,sans-serif;color-scheme:dark}
*{box-sizing:border-box}html{background:var(--bg)}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;background:var(--bg);color:var(--bone);font-family:var(--serif);font-weight:300;padding:calc(24px + env(safe-area-inset-top)) max(18px,env(safe-area-inset-right),env(safe-area-inset-left)) calc(24px + env(safe-area-inset-bottom))}
body:before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(60% 40% at 50% 36%,rgba(120,78,36,.26),transparent 72%),radial-gradient(120% 60% at 50% 112%,rgba(90,11,19,.4),transparent 64%),linear-gradient(180deg,#0A0807,#070605 55%,#060404)}
body:after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(0,0,0,.6) 100%)}
.ticket{width:100%;max-width:480px;margin:auto;text-align:center}
.mark{display:block;width:60px;height:60px;margin:0 auto;filter:drop-shadow(0 0 22px rgba(163,22,33,.3))}
.rose{font-weight:300;font-size:22px;letter-spacing:.44em;margin:12px 0 0 .44em;color:var(--gold)}
.rose:after{content:"";display:block;width:48px;height:1px;margin:16px auto 0;background:rgba(217,174,120,.65)}
h1{font-weight:300;font-size:clamp(38px,11vw,52px);line-height:1.05;margin:20px 0 6px;color:#F7F0E6;overflow-wrap:anywhere}
.role{font-style:italic;color:#CDB894;margin:0;font-size:22px}
.rule{position:relative;width:84px;height:1px;margin:22px auto;background:linear-gradient(90deg,transparent,rgba(217,174,120,.85),transparent)}
.rule:after{content:"";position:absolute;left:50%;top:50%;width:5px;height:5px;background:var(--gold);transform:translate(-50%,-50%) rotate(45deg)}
.code,.state{font-family:var(--sans);font-weight:300;text-transform:uppercase}
.code{font-size:21px;letter-spacing:.24em;color:var(--gold-hi);text-shadow:0 0 24px rgba(217,174,120,.4)}
.qr{width:min(62vw,230px);height:min(62vw,230px);margin:22px auto;background:var(--paper);padding:10px;border-radius:2px;display:grid;place-items:center;box-shadow:0 14px 40px rgba(0,0,0,.55)}
.qr canvas{width:100%!important;height:100%!important;image-rendering:pixelated}
.qr.fallback{width:auto;height:auto;color:var(--bg);font:400 13px/1.5 var(--sans);overflow-wrap:anywhere;text-align:left}
.meta{font-size:21px;line-height:1.55;color:#D9CEC0;margin:0;padding-top:18px;border-top:1px solid var(--line)}.meta b{font-weight:400;color:#F6EFE4}
#bringing{display:block;border-top:1px solid rgba(217,174,120,.14);padding-top:10px;margin-top:10px}#bringing:empty{display:none}
.small{font-style:italic;font-size:19px;line-height:1.55;color:#CFC3B3;margin:22px auto 0;max-width:360px}
.state{font-size:13px;letter-spacing:.3em;color:var(--gold);margin-top:16px;min-height:16px}
.meta a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(217,174,120,.45)}
.save{display:flex;align-items:center;justify-content:center;width:100%;min-height:62px;margin-top:24px;padding:12px;font:400 15px/1.2 var(--sans);letter-spacing:.32em;text-transform:uppercase;color:#1C130A;border:1px solid #E6C48C;border-radius:3px;cursor:pointer;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%);box-shadow:0 12px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,244,220,.6)}
.save[hidden]{display:none}.save:focus-visible{outline:1px solid var(--gold);outline-offset:3px}
.saved{font-style:italic;font-size:18px;color:var(--mute);margin:10px 0 0;min-height:1em}
</style>
</head>
<body>
<main class="ticket">
<img class="mark" src="/assets/whispers-mark.png" alt=""/>
<div class="rose">WHISPERS</div>
<h1 id="guest">…</h1>
<p class="role">Private guest</p>
<div class="rule"></div>
<div class="code" id="code">WSP · 10</div>
<div class="qr" id="qr"></div>
<p class="meta">Saturday <b>10 October</b> · Doors <b>22:00</b><br/><span id="venue">Sofia Center · the address reaches you at <b>18:00 on the 9th</b></span><span id="bringing"></span></p>
<p class="small">Show this seal at the door. The QR confirms your place in the WHISPERS list.</p>
<p class="state" id="state"></p>
<button class="save" hidden id="save" type="button">Private ticket</button>
<p aria-live="polite" class="saved" id="saved"></p>
</main>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
<script src="/assets/ticket-card.js"></script>
<script>
(async()=>{
  const api=${JSON.stringify(apiUrl)},ticketUrl=${JSON.stringify(ticketUrl)};
  const $=(id)=>document.getElementById(id);
  const escapeHtml=(s)=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const failed=()=>{$('guest').textContent='We could not load your seal.';$('state').textContent='Refresh to try again.';};
  let res,data;
  try{res=await fetch(api,{headers:{'Accept':'application/json'}});}catch(e){failed();return;}
  if(!res.ok){if(res.status>=500){failed();return;}$('guest').textContent='Ticket not found';$('state').textContent='Invalid seal';return;}
  try{data=await res.json();}catch(e){failed();return;}
  const t=data&&data.ticket;
  if(!t){failed();return;}
  if(data.locked||t.locked){
    $('guest').textContent=t.guest_name||'Your ticket';
    document.querySelector('.role').textContent='Registered guest';
    $('code').textContent='09.10 · 18:00';
    $('qr').classList.add('fallback');
    $('qr').textContent='Your ticket will be released on 09.10 at 18:00.';
    $('venue').innerHTML='Location remains sealed until 09.10 at 18:00.';
    $('bringing').innerHTML=t.bringing?'Registered with <b>'+escapeHtml(t.bringing)+'</b>':(t.brought_by?'Guest of '+escapeHtml(t.brought_by):'');
    $('state').textContent='Locked until release';
    return;
  }
  const role=t.brought_by?'Guest of '+t.brought_by:'Founding guest';
  $('guest').textContent=t.guest_name;
  document.querySelector('.role').textContent=role;
  $('code').textContent=t.seal_code||'WSP · 10';
  $('bringing').innerHTML=t.bringing?'Bringing <b>'+escapeHtml(t.bringing)+'</b>':(t.brought_by?'':'Coming on your own');
  const v=data.venue,venueText=v?[v.name,v.address].filter(Boolean).join(' · '):'Sofia Center · the address reaches you at 18:00 on the 9th';
  if(v)$('venue').innerHTML=v.mapUrl?'<a href="'+escapeHtml(v.mapUrl)+'" rel="noopener" target="_blank">'+escapeHtml(venueText)+'</a>':escapeHtml(venueText);
  if(t.table_label)$('bringing').innerHTML += '<br/>Table <b>'+escapeHtml(t.table_label)+'</b>';
  $('state').textContent=t.checked_in_at?'Already checked in':'Ready for the door';
  if(window.WhispersTickets){
    const lines=['Saturday 10 October · Doors 22:00',venueText];
    if(t.bringing)lines.push('Bringing '+t.bringing);
    const spec=[{name:t.guest_name,role,sealCode:t.seal_code,url:ticketUrl,lines,note:'Show this at the door.'}];
    const prep=()=>window.WhispersTickets.prepare(spec).catch(()=>null);
    let ready=prep();
    $('save').hidden=false;
    $('save').onclick=async()=>{$('saved').textContent='';const files=await ready;if(!files){$('saved').textContent='Your ticket could not be prepared. Please try again.';ready=prep();return;}if(await window.WhispersTickets.save(files)==='downloaded')$('saved').textContent='Your ticket is saved to this device.';};
  }
  const qr=$('qr');
  const fallback=()=>{qr.classList.add('fallback');qr.textContent=ticketUrl;};
  if(window.QRCode){QRCode.toCanvas(ticketUrl,{width:384,margin:2,color:{dark:'#0b0908',light:'#f1e9dc'}},(err,canvas)=>{if(err)fallback();else qr.appendChild(canvas);});}else{fallback();}
})();
</script>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
