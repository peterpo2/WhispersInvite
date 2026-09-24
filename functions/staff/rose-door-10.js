export async function onRequestGet() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<title>WHISPERS Door</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&amp;family=Jost:wght@300;400&amp;display=swap" rel="stylesheet"/>
<style>
:root{--bg:#070605;--gold:#D9AE78;--gold-hi:#EBCB95;--red:#A31621;--bone:#EDE6DA;--muted:#B4A99D;--line:rgba(217,174,120,.24);--serif:'Cormorant Garamond',Cambria,Georgia,serif;--sans:'Jost','Helvetica Neue',Arial,sans-serif;color-scheme:dark}
*{box-sizing:border-box}html{background:var(--bg)}
body{margin:0;min-height:100vh;min-height:100dvh;background:var(--bg);color:var(--bone);font-family:var(--sans);font-weight:300;font-size:16px;padding:calc(16px + env(safe-area-inset-top)) max(16px,env(safe-area-inset-right),env(safe-area-inset-left)) calc(20px + env(safe-area-inset-bottom))}
body:before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(70% 40% at 50% -6%,rgba(217,174,120,.1),transparent 62%),radial-gradient(120% 60% at 50% 112%,rgba(90,11,19,.36),transparent 64%),linear-gradient(180deg,#0A0807,#070605 55%,#060404)}
main{position:relative;max-width:1100px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 16px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:12px;min-width:0}.brand img{width:46px;height:46px;flex:0 0 46px;filter:drop-shadow(0 0 16px rgba(163,22,33,.3))}
.k{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold)}h1{font-family:var(--serif);font-weight:300;font-size:32px;line-height:1.05;margin:2px 0 0}
.panel{padding:16px 0;margin:0;border-bottom:1px solid var(--line)}
.camera{position:relative;aspect-ratio:3/4;max-height:64svh;width:100%;background:#000;overflow:hidden;display:grid;place-items:center;padding:0;border:1px solid rgba(217,174,120,.4);border-radius:3px;margin-bottom:4px}
.camera video{width:100%;height:100%;object-fit:cover}
.camera:before,.camera:after{content:"";position:absolute;z-index:1;width:26px;height:26px;border:solid var(--gold);pointer-events:none}.camera:before{top:12px;left:12px;border-width:2px 0 0 2px}.camera:after{bottom:12px;right:12px;border-width:0 2px 2px 0}
.scanline{position:absolute;left:8%;right:8%;height:1px;background:var(--gold);box-shadow:0 0 18px var(--gold);animation:sweep 2.2s ease-in-out infinite}@keyframes sweep{0%,100%{top:18%}50%{top:82%}}
@media(min-width:640px){.camera{aspect-ratio:4/3;max-height:60svh}}
@media(min-width:1024px){.camera{aspect-ratio:16/9;max-height:58svh}}
@media (prefers-reduced-motion:reduce){.scanline{animation:none;top:50%}}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button,input{min-height:54px;border:1px solid rgba(217,174,120,.58);border-radius:3px;background:rgba(8,6,5,.4);color:var(--bone);padding:0 14px;font:400 13px var(--sans);letter-spacing:.26em;text-transform:uppercase;cursor:pointer}
button.primary{color:#1C130A;border-color:#E6C48C;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%)}
button:focus-visible,input:focus-visible{outline:1px solid var(--gold);outline-offset:2px}
.manual{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:10px}.manual input{text-transform:none;letter-spacing:0;font:400 18px var(--serif);min-width:0;cursor:text}
.result{min-height:112px}.result h2{font-family:var(--serif);font-weight:300;font-size:40px;line-height:1.05;margin:0 0 8px}.result p{color:#D8CEC2;font-size:18px;line-height:1.45;margin:4px 0}.result b{font-family:var(--serif);font-weight:400;font-size:26px;color:#F6EFE4}
.ok h2{color:var(--gold-hi)}.bad h2{color:#FF9F9F}
.warn{background:rgba(163,22,33,.18);border:1px solid var(--red);border-radius:3px;padding:16px;margin:12px 0}.warn h2{color:#E8808A}.warn p{color:var(--bone)}
.list{display:grid;margin-top:8px}.row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border-top:1px solid rgba(217,174,120,.14);padding:12px 0}.row:first-child{border-top:0}.row b{font-family:var(--serif);font-weight:400;font-size:21px;min-width:0;overflow-wrap:anywhere}.row b small{display:block;font:300 13px var(--sans);color:var(--muted);margin-top:2px}.row span{color:var(--muted);font-size:13px;text-align:right;white-space:nowrap}
.small{color:var(--muted);font-size:14px;line-height:1.55;margin:12px 0 0}
</style>
</head>
<body>
<main>
<div class="top"><div class="brand"><img src="/assets/whispers-mark.png" alt=""/><div><div class="k">WHISPERS</div><h1>Door</h1></div></div><button id="refresh">Refresh</button></div>
<section class="panel camera"><video id="video" playsinline muted></video><div class="scanline"></div></section>
<section class="panel">
<div class="actions"><button class="primary" id="start">Open camera</button><button id="stop">Stop</button></div>
<div class="manual"><input id="manual" aria-label="QR value or token" placeholder="Paste QR value or token" autocomplete="off" autocapitalize="off" spellcheck="false"/><button id="manualBtn">Check</button></div>
<p class="small">Camera scanning runs locally in this browser. A valid WHISPERS QR marks the ticket as checked in.</p>
</section>
<section class="panel result" id="result" aria-live="polite"><h2>Ready.</h2><p>Scan a guest ticket.</p></section>
<section class="panel"><div class="k">Scanned tonight</div><div class="list" id="list"></div></section>
</main>
<canvas id="canvas" hidden></canvas>
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
<script>
const video=document.getElementById('video'),canvas=document.getElementById('canvas'),result=document.getElementById('result'),list=document.getElementById('list');
let stream=null,timer=null;const seen=new Map(),REPEAT_MS=4000;
function show(kind,title,body){result.className='panel result '+kind;result.innerHTML='<h2>'+title+'</h2>'+body;}
function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function hhmm(iso){return new Date(iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});}
async function scanValue(value,manual){
  if(!value) return;
  if(!manual){const last=seen.get(value),now=Date.now();seen.set(value,now);if(last&&now-last<REPEAT_MS) return;}
  show('', 'Checking…', '<p>Reading the seal.</p>');
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
  loadList();
}
async function startCamera(){
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  video.srcObject=stream;await video.play();
  timer=setInterval(()=>{if(!video.videoWidth||!window.jsQR)return;canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0);const img=ctx.getImageData(0,0,canvas.width,canvas.height);const code=jsQR(img.data,img.width,img.height);if(code)scanValue(code.data,false);},450);
}
function stopCamera(){if(timer)clearInterval(timer);timer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}video.srcObject=null;}
async function loadList(){
  let res,data;
  try{res=await fetch('/api/door',{headers:{'Accept':'application/json'}});data=await res.json().catch(()=>({}));}
  catch(e){list.innerHTML='<p class="small">No connection. Try again.</p>';return;}
  if(!res.ok){list.innerHTML='<p class="small">Could not load the list. Try again.</p>';return;}
  list.innerHTML=(data.scans||[]).map(s=>'<div class="row"><b>'+esc(s.guest_name)+(s.brought_by?'<small>Guest of '+esc(s.brought_by)+'</small>':'')+'</b><span>'+esc(s.seal_code||'')+'<br>'+esc(hhmm(s.checked_in_at))+'</span></div>').join('')||'<p class="small">No scanned tickets yet.</p>';
}
document.getElementById('start').onclick=()=>startCamera().catch(e=>show('bad','Camera blocked.','<p>Allow camera access or paste the QR value manually.</p>'));
document.getElementById('stop').onclick=stopCamera;
document.getElementById('manualBtn').onclick=()=>scanValue(document.getElementById('manual').value.trim(),true);
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
