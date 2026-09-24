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
  const apiUrl = `${new URL(request.url).origin}/api/ticket?token=${encodeURIComponent(token)}`;

  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>WHISPERS Ticket</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&amp;family=Jost:wght@300;400&amp;display=swap" rel="stylesheet"/>
<style>
:root{--bg:#0B0908;--bg2:#12100E;--gold:#D9AE78;--bone:#EDE6DA;--mute:#8C8176;--paper:#F1E9DC;--serif:'Cormorant Garamond',Cambria,Georgia,serif;--sans:'Jost','Helvetica Neue',Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:var(--bg);color:var(--bone);font-family:var(--serif);font-weight:300;display:grid;place-items:center;padding:calc(20px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left))}
body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 50% 8%,rgba(217,174,120,.12),transparent 38%);pointer-events:none}
.ticket{position:relative;width:min(390px,100%);border:1px solid rgba(217,174,120,.48);padding:clamp(24px,6vw,38px) clamp(18px,6vw,28px);text-align:center;background:var(--bg2);box-shadow:0 28px 90px rgba(0,0,0,.62)}
.rose,.code,.state{font-family:var(--sans);font-weight:300;text-transform:uppercase;letter-spacing:.3em}
.rose{font-size:11px;color:var(--gold);margin-bottom:14px}
h1{font-weight:300;font-size:clamp(28px,8vw,36px);line-height:1.1;margin:10px 0 2px;overflow-wrap:anywhere}.role{font-style:italic;color:#CDBB9F;margin:0 0 14px;font-size:17px}.rule{height:1px;background:linear-gradient(90deg,transparent,rgba(217,174,120,.58),transparent);margin:clamp(14px,3vh,21px) 0}
.code{font-size:14px;letter-spacing:.24em;color:var(--gold)}.qr{width:168px;height:168px;margin:clamp(12px,3vh,20px) auto;background:var(--paper);padding:10px;display:grid;place-items:center}.qr canvas{width:148px!important;height:148px!important}
.qr.fallback{width:auto;height:auto;color:var(--bg);font:400 12px/1.5 var(--sans);letter-spacing:.02em;overflow-wrap:anywhere;text-align:left}
.meta{font-size:18px;line-height:1.6;color:var(--bone);margin:8px 0}.meta b{font-weight:400;color:#FAF6EF}.small{font-size:15px;line-height:1.6;color:#CFC5BA;margin-top:14px}
.state{font-size:11px;color:var(--gold);margin-top:14px;min-height:14px}
</style>
</head>
<body>
<main class="ticket">
<div class="rose">WHISPERS</div>
<h1 id="guest">…</h1>
<p class="role">Private guest</p>
<div class="rule"></div>
<div class="code" id="code">WSP · 10</div>
<div class="qr" id="qr"></div>
<p class="meta">Saturday <b>10 October</b><br/>Doors <b>22:00</b><br/>Sofia Center</p>
<p class="meta" id="bringing"></p>
<div class="rule"></div>
<p class="small">Show this seal at the door. The QR confirms your place in the WHISPERS list.</p>
<p class="state" id="state"></p>
</main>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
<script>
(async()=>{
  const api=${JSON.stringify(apiUrl)};
  const $=(id)=>document.getElementById(id);
  const escapeHtml=(s)=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const failed=()=>{$('guest').textContent='We could not load your seal.';$('state').textContent='Refresh to try again.';};
  let res,data;
  try{res=await fetch(api,{headers:{'Accept':'application/json'}});}catch(e){failed();return;}
  if(!res.ok){if(res.status>=500){failed();return;}$('guest').textContent='Ticket not found';$('state').textContent='Invalid seal';return;}
  try{data=await res.json();}catch(e){failed();return;}
  const t=data&&data.ticket;
  if(!t){failed();return;}
  $('guest').textContent=t.guest_name;
  $('code').textContent=t.seal_code||'WSP · 10';
  $('bringing').innerHTML=t.plus_one_name?'Bringing <b>'+escapeHtml(t.plus_one_name)+'</b>':'Coming on your own';
  $('state').textContent=t.checked_in_at?'Already checked in':'Ready for the door';
  const qr=$('qr');
  const fallback=()=>{qr.classList.add('fallback');qr.textContent=location.origin+location.pathname;};
  if(window.QRCode&&data.checkInUrl){QRCode.toCanvas(data.checkInUrl,{width:148,margin:1,color:{dark:'#0b0908',light:'#f1e9dc'}},(err,canvas)=>{if(err)fallback();else qr.appendChild(canvas);});}else{fallback();}
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
