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
<style>
:root{--gold:#d9ae78;--paper:#f1e9dc;--ink:#0b0908}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:#040303;color:#f5eee5;font-family:Georgia,"Times New Roman",serif;display:grid;place-items:center;padding:22px}
body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 50% 8%,rgba(217,174,120,.14),transparent 34%),linear-gradient(180deg,#070504,#030202);pointer-events:none}
.ticket{position:relative;width:min(390px,100%);min-height:620px;border:1px solid rgba(217,174,120,.48);padding:38px 24px;text-align:center;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));box-shadow:0 28px 90px rgba(0,0,0,.62)}
.rose{font:12px Arial,sans-serif;letter-spacing:.42em;color:var(--gold);margin-bottom:18px}
h1{font-weight:400;font-size:36px;line-height:1.05;margin:14px 0 2px}.role{font-style:italic;color:#cdbb9f;margin:0 0 18px}.rule{height:1px;background:linear-gradient(90deg,transparent,rgba(217,174,120,.58),transparent);margin:21px 0}
.code{font:15px Arial,sans-serif;letter-spacing:.24em;color:#e4bd84}.qr{width:168px;height:168px;margin:20px auto;background:var(--paper);padding:10px;display:grid;place-items:center}.qr canvas{width:148px!important;height:148px!important}
.meta{font-size:16px;line-height:1.7;color:#d8cec2}.meta b{font-weight:400;color:#fff}.small{font-size:12px;line-height:1.65;color:#a99f93;margin-top:22px}
.state{font:11px Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#af946d;margin-top:18px}
</style>
</head>
<body>
<main class="ticket">
<div class="rose">WHISPERS</div>
<h1 id="guest">Loading...</h1>
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
  const escapeHtml=(s)=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const res=await fetch(api,{headers:{'Accept':'application/json'}});
  if(!res.ok){document.getElementById('guest').textContent='Ticket not found';document.getElementById('state').textContent='Invalid seal';return;}
  const data=await res.json();
  const t=data.ticket;
  document.getElementById('guest').textContent=t.guest_name;
  document.getElementById('code').textContent=t.seal_code||'WSP · 10';
  document.getElementById('bringing').innerHTML=t.plus_one_name?'Bringing <b>'+escapeHtml(t.plus_one_name)+'</b>':'Coming on your own';
  document.getElementById('state').textContent=t.checked_in_at?'Already checked in':'Ready for the door';
  const qr=document.getElementById('qr');
  if(window.QRCode){QRCode.toCanvas(data.checkInUrl,{width:148,margin:1,color:{dark:'#0b0908',light:'#f1e9dc'}},(err,canvas)=>{if(!err)qr.appendChild(canvas);});}
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
