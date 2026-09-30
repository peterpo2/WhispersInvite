import { isLocalTicketReleasePreview } from "../_shared/rsvp.js";

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
  const preview = isLocalTicketReleasePreview(request.url) ? "&preview=released" : "";
  const apiUrl = `${origin}/api/ticket?token=${encodeURIComponent(token)}${preview}`;
  const ticketUrl = `${origin}/ticket/${encodeURIComponent(token)}`;

  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<meta property="og:title" content="WHISPERS"/>
<meta property="og:type" content="website"/>
<meta property="og:image" content="https://whisperssociety.com/assets/whispers-lockup-dark.png"/>
<meta property="og:image:width" content="4191"/>
<meta property="og:image:height" content="1923"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="WHISPERS"/>
<meta name="twitter:image" content="https://whisperssociety.com/assets/whispers-lockup-dark.png"/>
<title>WHISPERS Ticket</title>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<link href="/assets/whispers-favicon.png" rel="apple-touch-icon"/>
<style>
@font-face{font-family:AvianoContrast;src:url("/assets/aviano-contrast.ttf") format("truetype");font-weight:300 700;font-style:normal;font-display:swap}
:root{--bg:#070605;--gold:#D9AE78;--gold-hi:#EBCB95;--bone:#EDE6DA;--mute:#BDB2A5;--paper:#F1E9DC;--line:rgba(217,174,120,.26);--serif:'AvianoContrast',Cambria,Georgia,serif;--sans:'AvianoContrast','Helvetica Neue',Arial,sans-serif;color-scheme:dark}
*{box-sizing:border-box}html{background:var(--bg)}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;background:radial-gradient(60% 40% at 50% 36%,rgba(120,78,36,.24),transparent 72%),radial-gradient(120% 60% at 50% 112%,rgba(90,11,19,.42),transparent 64%),linear-gradient(180deg,#0A0807,#070605 55%,#060404);color:var(--bone);font-family:var(--serif);font-weight:300;padding:calc(24px + env(safe-area-inset-top)) max(18px,env(safe-area-inset-right),env(safe-area-inset-left)) calc(24px + env(safe-area-inset-bottom))}
body:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:url("/assets/whispers-rose.png") 50% 42%/min(150vw,920px) auto no-repeat;opacity:.13;filter:blur(1px) saturate(1.08)}
body:after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(0,0,0,.64) 100%)}
.grain{position:fixed;inset:-50%;z-index:0;pointer-events:none;opacity:.045;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>");animation:grain 1.1s steps(3) infinite}@keyframes grain{0%{transform:translate(0,0)}33%{transform:translate(-3%,2%)}66%{transform:translate(2%,-3%)}100%{transform:translate(0,0)}}@media (prefers-reduced-motion:reduce){.grain{animation:none}}
.ticket{position:relative;z-index:1;width:100%;max-width:480px;margin:auto;text-align:center;transition:opacity .22s ease}
.ticket.loading{opacity:0}
.brand-lockup{display:block;width:min(210px,62vw);height:auto;margin:0 auto;filter:drop-shadow(0 0 22px rgba(163,22,33,.3))}
.brand-rule{display:block;width:48px;height:1px;margin:16px auto 0;background:rgba(217,174,120,.65)}
h1{font-weight:300;font-size:clamp(32px,8.6vw,42px);line-height:1.08;margin:18px 0 6px;color:#F7F0E6;overflow-wrap:anywhere}
.role{font-style:italic;color:#CDB894;margin:0;font-size:18px}
.rule{position:relative;width:84px;height:1px;margin:22px auto;background:linear-gradient(90deg,transparent,rgba(217,174,120,.85),transparent)}
.rule:after{content:"";position:absolute;left:50%;top:50%;width:5px;height:5px;background:var(--gold);transform:translate(-50%,-50%) rotate(45deg)}
.code,.state{font-family:var(--sans);font-weight:300;text-transform:uppercase}
.code{font-size:18px;letter-spacing:.22em;color:var(--gold-hi);text-shadow:0 0 24px rgba(217,174,120,.4);margin-top:22px}
.qr{width:min(62vw,230px);height:min(62vw,230px);margin:20px auto;background:rgba(8,6,5,.46);border:1px solid rgba(217,174,120,.28);padding:10px;border-radius:2px;display:grid;place-items:center;box-shadow:0 14px 40px rgba(0,0,0,.55)}
.qr[hidden]{display:none}
.qr.ready{background:var(--paper);border:0}
.qr canvas{width:100%!important;height:100%!important;image-rendering:pixelated}
.qr.fallback{width:100%;max-width:430px;height:auto;min-height:0;background:rgba(8,6,5,.46);border:1px solid rgba(217,174,120,.28);color:#D8CEC2;font:400 14px/1.6 var(--sans);overflow-wrap:anywhere;text-align:center;box-shadow:0 16px 42px rgba(0,0,0,.32)}
.meta{font-size:16px;line-height:1.42;color:#D9CEC0;margin:18px 0 0}.meta b{font-weight:400;color:#F6EFE4}
.status-line,.relationship .status-line,.small span{display:block}.relationship .status-line + .status-line,.small span + span{margin-top:16px}
.ticket-date,.ticket-time{display:block;font-family:var(--sans);font-weight:400;letter-spacing:.08em;text-transform:uppercase;color:#F4DFC0;text-shadow:0 0 22px rgba(217,174,120,.22)}.ticket-time{margin-top:3px}
.venue-line{display:block;margin-top:10px;font-family:var(--sans);font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--gold-hi);text-shadow:0 0 28px rgba(235,203,149,.36)}
.venue-line:empty{display:none}.venue-line a{color:var(--gold-hi);text-decoration:none;border-bottom:1px solid rgba(235,203,149,.55)}
.relationship{display:block;color:#F2E8D9;margin:0}.relationship:empty{display:none}
.small{font-style:italic;font-size:15px;line-height:1.42;color:#CFC3B3;margin:26px auto 0;max-width:360px}.small:empty{display:none}
.state{font-size:13px;letter-spacing:.3em;color:var(--gold);margin-top:16px;min-height:16px}
.ticket-divider{width:100%;height:1px;margin:18px auto 16px;background:linear-gradient(90deg,transparent,rgba(217,174,120,.38),transparent)}
.meta a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(217,174,120,.45)}
.save,.pending-link{display:flex;align-items:center;justify-content:center;width:100%;min-height:62px;margin-top:24px;padding:12px;font:500 clamp(18px,4.8vw,22px)/1.2 var(--sans);letter-spacing:.32em;text-transform:uppercase;color:#1C130A;border:1px solid #E6C48C;border-radius:3px;cursor:pointer;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%);box-shadow:0 12px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,244,220,.6);text-decoration:none;text-shadow:0 1px 0 rgba(255,246,224,.32)}
.save[hidden],.pending-link[hidden]{display:none}.save:focus-visible,.pending-link:focus-visible{outline:1px solid var(--gold);outline-offset:3px}
.saved{font-style:italic;font-size:18px;color:var(--mute);margin:10px 0 0;min-height:1em}
.ticket + .partner-bar{position:relative;z-index:5;width:min(430px,calc(100vw - 28px));display:flex;align-items:center;justify-content:center;gap:14px;margin:22px auto 0;padding:0 0 max(8px,env(safe-area-inset-bottom));pointer-events:none;filter:drop-shadow(0 10px 22px rgba(0,0,0,.75));flex:0 0 auto}
.partner-bar span{font:300 10px/1 var(--sans);letter-spacing:.26em;text-transform:uppercase;color:rgba(237,230,218,.62);white-space:nowrap;text-shadow:0 1px 10px rgba(0,0,0,.8)}
.partner-logos{display:flex;align-items:center;justify-content:center;gap:12px;min-width:0}
.partner-logo{display:flex;align-items:center;justify-content:center;overflow:visible}.partner-logo.beluga{width:100px;height:37px}.partner-logo.rothschild{width:118px;height:45px}.partner-logo img{display:block;width:100%;height:100%;object-fit:contain;opacity:.92}
@media (max-width:360px){.ticket + .partner-bar{width:calc(100vw - 18px);gap:9px;padding-bottom:max(6px,env(safe-area-inset-bottom))}.partner-bar span{font-size:8px;letter-spacing:.18em}.partner-logos{gap:8px}.partner-logo.beluga{width:86px;height:32px}.partner-logo.rothschild{width:100px;height:38px}}
</style>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<main class="ticket loading">
<img class="brand-lockup" src="/assets/whispers-lockup-transparent.png" alt="WHISPERS"/>
<span class="brand-rule" aria-hidden="true"></span>
<h1 id="guest">…</h1>
<p class="role">Private guest</p>
<div class="rule"></div>
<p class="meta" id="ticketMeta"><span class="ticket-date">Saturday <b>10 October</b></span><span class="ticket-time">Doors open at <b>22:00</b></span><span class="venue-line" id="venue"></span></p>
<div class="qr" id="qr"></div>
<p class="state" id="state"></p>
<div class="ticket-divider" aria-hidden="true"></div>
<p class="relationship" id="bringing"></p>
<p class="small" id="ticketNote"></p>
<a class="pending-link" hidden id="pendingInvite" href="#">Respond</a>
<button class="save" hidden id="save" type="button">Save your ticket</button>
<div class="code" id="code">&mdash;</div>
<p aria-live="polite" class="saved" id="saved"></p>
</main>
<aside aria-label="Event partners" class="partner-bar"><span>Powered by</span><div class="partner-logos"><div class="partner-logo rothschild"><img alt="Barons de Rothschild" src="/assets/partner-rothschild.png"/></div><div class="partner-logo beluga"><img alt="Beluga" src="/assets/partner-beluga.png"/></div></div></aside>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
<script src="/assets/ticket-card.js"></script>
<script>
(async()=>{
  const api=${JSON.stringify(apiUrl)},ticketUrl=${JSON.stringify(ticketUrl)};
  const $=(id)=>document.getElementById(id);
  const shell=document.querySelector('.ticket'),reveal=()=>shell.classList.remove('loading');
  const escapeHtml=(s)=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const darkQr=(message)=>{$('qr').classList.remove('ready');$('qr').classList.add('fallback');$('qr').textContent=message;};
  const failed=()=>{$('guest').textContent='We could not load your seal.';darkQr('Your ticket could not be loaded. Please refresh to try again.');$('state').textContent='Refresh to try again.';reveal();};
  let res,data;
  try{res=await fetch(api,{headers:{'Accept':'application/json'}});}catch(e){failed();return;}
  if(!res.ok){if(res.status>=500){failed();return;}$('guest').textContent='Ticket not found';darkQr('This ticket link is invalid.');$('state').textContent='Invalid seal';reveal();return;}
  try{data=await res.json();}catch(e){failed();return;}
  const t=data&&data.ticket;
  if(!t){failed();return;}
  if(data.locked||t.locked){
    if(t.pending){
      $('guest').textContent=t.guest_name||'Your ticket';
      document.querySelector('.role').textContent='Invited guest';
      $('code').textContent='Not yet answered';
      $('qr').classList.add('fallback');
      $('qr').textContent="Your ticket appears here once you've responded and tickets are released on 09.10 at 18:00.";
      $('venue').innerHTML='Use your invitation link to respond and reserve your spot.';
      $('bringing').innerHTML='';
      $('ticketNote').textContent='';
      $('state').textContent='Waiting for RSVP';
      if(data.inviteUrl){$('pendingInvite').href=data.inviteUrl;$('pendingInvite').hidden=false;}
      reveal();
      return;
    }
    $('guest').textContent=t.guest_name||'Your ticket';
    document.querySelector('.role').textContent='Invited guest';
    $('code').textContent='10.10 · 22:00';
    $('qr').hidden=true;
    $('state').textContent='';
    $('ticketMeta').innerHTML='<span class="status-line">Location remains sealed until 09.10 at 18:00.</span>';
    const extras=[];
    if(t.bringing)extras.push('Registered with '+escapeHtml(t.bringing)+'.');
    if(t.table_reserved||t.table_requested)extras.push('Table reservation requested.');
    $('bringing').innerHTML=extras.map((line)=>'<span class="status-line">'+escapeHtml(line)+'</span>').join('');
    $('ticketNote').innerHTML='<span>Your ticket will be sent to you</span><span>on 09.10 at 18:00.</span>';
    reveal();
    return;
  }
  const role=t.brought_by?'Guest of '+t.brought_by:'Invited guest';
  $('guest').textContent=t.guest_name;
  document.querySelector('.role').textContent=role;
  $('code').textContent=t.seal_code||'—';
  $('bringing').innerHTML=t.bringing?'Bringing <b>'+escapeHtml(t.bringing)+'</b>':(t.brought_by?'':'Coming on your own');
  const v=data.venue,venueText=v?[v.name,v.address].filter(Boolean).join(' · '):'';
  if(v)$('venue').innerHTML=v.mapUrl?'<a href="'+escapeHtml(v.mapUrl)+'" rel="noopener" target="_blank">'+escapeHtml(venueText)+'</a>':escapeHtml(venueText);
  if(t.table_reserved)$('bringing').innerHTML += '<br/><b>Your table is confirmed.</b>';
  $('ticketNote').textContent='Show this seal at the door. The QR code confirms your place in the WHISPERS list.';
  $('state').textContent=t.checked_in_at?'Already checked in':'Ready for the door';
  if(window.WhispersTickets){
    const lines=['Saturday 10 October','Doors open at 22:00'];
    if(venueText)lines.push(venueText);
    if(t.bringing)lines.push('Bringing '+t.bringing); else if(!t.brought_by)lines.push('Coming on your own');
    if(t.table_reserved)lines.push('Your table is confirmed.');
    const spec=[{name:t.guest_name,role,sealCode:t.seal_code,url:ticketUrl,lines,note:'Show this seal at the door.'}];
    const prep=()=>window.WhispersTickets.prepare(spec).catch(()=>null);
    let ready=prep();
    $('save').hidden=false;
    $('save').onclick=async()=>{$('saved').textContent='';const files=await ready;if(!files){$('saved').textContent='Your ticket could not be prepared. Please try again.';ready=prep();return;}if(await window.WhispersTickets.save(files)==='downloaded')$('saved').textContent='Your ticket is saved to this device.';};
  }
  const qr=$('qr');
  const fallback=()=>{qr.classList.remove('ready');qr.classList.add('fallback');qr.textContent=ticketUrl;};
  if(window.QRCode){QRCode.toCanvas(ticketUrl,{width:384,margin:2,color:{dark:'#0b0908',light:'#f1e9dc'}},(err,canvas)=>{if(err)fallback();else{qr.classList.add('ready');qr.appendChild(canvas);}});}else{fallback();}
  reveal();
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
