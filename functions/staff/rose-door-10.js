export async function onRequestGet() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>WHISPERS Door</title>
<style>
:root{--gold:#d9ae78;--paper:#f1e9dc;--bg:#050403;--muted:#a99f93}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:var(--bg);color:#f5eee5;font-family:Arial,sans-serif;padding:18px}
body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 50% 0,rgba(217,174,120,.16),transparent 38%),linear-gradient(180deg,#080605,#030202);pointer-events:none}
main{position:relative;max-width:1100px;margin:0 auto}.top{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:6px 0 18px}
.k{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold)}h1{font-family:Georgia,serif;font-weight:400;font-size:36px;margin:5px 0 0}
.panel{border:1px solid rgba(217,174,120,.36);background:rgba(255,255,255,.025);padding:16px;margin-bottom:14px}
.camera{position:relative;aspect-ratio:3/4;max-height:72svh;background:#000;overflow:hidden;display:grid;place-items:center}.camera video{width:100%;height:100%;object-fit:cover}.scanline{position:absolute;left:8%;right:8%;height:1px;background:var(--gold);box-shadow:0 0 18px var(--gold);animation:sweep 2.2s ease-in-out infinite}@keyframes sweep{0%,100%{top:18%}50%{top:82%}}
@media(min-width:640px){.camera{aspect-ratio:4/3;max-height:68svh}}
@media(min-width:1024px){.camera{aspect-ratio:16/9;max-height:65svh}}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}button,input{height:48px;border:1px solid rgba(217,174,120,.55);background:rgba(255,255,255,.035);color:#f5eee5;padding:0 14px;font:12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}button.primary{background:rgba(217,174,120,.16);color:#f3c78f}.manual{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:10px}.manual input{text-transform:none;letter-spacing:0;font-size:15px}
.result{min-height:104px}.result h2{font-family:Georgia,serif;font-weight:400;font-size:31px;margin:0 0 8px}.result p{color:#d8cec2;line-height:1.5;margin:4px 0}.ok h2{color:#e8c28b}.bad h2{color:#ff9f9f}.list{display:grid;gap:8px}.row{display:flex;justify-content:space-between;gap:10px;border-top:1px solid rgba(217,174,120,.16);padding-top:10px}.row b{font-family:Georgia,serif;font-weight:400}.row span{color:var(--muted);font-size:12px;text-align:right}.small{color:var(--muted);font-size:12px;line-height:1.5}
</style>
</head>
<body>
<main>
<div class="top"><div><div class="k">WHISPERS</div><h1>Door scanner</h1></div><button id="refresh">Refresh</button></div>
<section class="panel camera"><video id="video" playsinline muted></video><div class="scanline"></div></section>
<section class="panel">
<div class="actions"><button class="primary" id="start">Open camera</button><button id="stop">Stop</button></div>
<div class="manual"><input id="manual" placeholder="Paste QR value or token"/><button id="manualBtn">Check</button></div>
<p class="small">Camera scanning runs locally in this browser. A valid WHISPERS QR marks the ticket as checked in.</p>
</section>
<section class="panel result" id="result"><h2>Ready.</h2><p>Scan a guest ticket.</p></section>
<section class="panel"><div class="k">Scanned tonight</div><div class="list" id="list"></div></section>
</main>
<canvas id="canvas" hidden></canvas>
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
<script>
const video=document.getElementById('video'),canvas=document.getElementById('canvas'),result=document.getElementById('result'),list=document.getElementById('list');
let stream=null,timer=null,lastValue='',lastAt=0;
function show(kind,title,body){result.className='panel result '+kind;result.innerHTML='<h2>'+title+'</h2>'+body;}
function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
async function scanValue(value){
  if(!value) return;
  if(value===lastValue && Date.now()-lastAt<3500) return;
  lastValue=value;lastAt=Date.now();
  show('', 'Checking...', '<p>Reading the seal.</p>');
  const res=await fetch('/api/door',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({value})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){show('bad','Invalid.', '<p>'+esc(data.error||'This ticket could not be confirmed.')+'</p>');return;}
  const t=data.ticket||{};
  const plus=t.plus_one_name?' + '+esc(t.plus_one_name):'';
  show('ok', data.status==='already_checked_in'?'Already inside.':'Confirmed.', '<p><b>'+esc(t.guest_name)+plus+'</b></p><p>'+esc(t.seal_code||'')+'</p>');
  loadList();
}
async function startCamera(){
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  video.srcObject=stream;await video.play();
  timer=setInterval(()=>{if(!video.videoWidth||!window.jsQR)return;canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0);const img=ctx.getImageData(0,0,canvas.width,canvas.height);const code=jsQR(img.data,img.width,img.height);if(code)scanValue(code.data);},450);
}
function stopCamera(){if(timer)clearInterval(timer);timer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}video.srcObject=null;}
async function loadList(){
  const res=await fetch('/api/door',{headers:{'Accept':'application/json'}});
  const data=await res.json().catch(()=>({scans:[]}));
  list.innerHTML=(data.scans||[]).map(s=>'<div class="row"><b>'+esc(s.guest_name)+(s.plus_one_name?' + '+esc(s.plus_one_name):'')+'</b><span>'+esc(s.seal_code||'')+'<br>'+new Date(s.checked_in_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'</span></div>').join('')||'<p class="small">No scanned tickets yet.</p>';
}
document.getElementById('start').onclick=()=>startCamera().catch(e=>show('bad','Camera blocked.','<p>Allow camera access or paste the QR value manually.</p>'));
document.getElementById('stop').onclick=stopCamera;
document.getElementById('manualBtn').onclick=()=>scanValue(document.getElementById('manual').value.trim());
document.getElementById('refresh').onclick=loadList;
loadList();
</script>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
