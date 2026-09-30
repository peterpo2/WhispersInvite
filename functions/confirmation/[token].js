function safeToken(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 120 ? value : "";
}

export async function onRequestGet({ params, request, env }) {
  const origin = new URL(request.url).origin;
  const token = safeToken(params.token || "");
  if (!token) return Response.redirect(origin + "/", 302);

  const apiUrl = `${origin}/api/confirmation?token=${encodeURIComponent(token)}`;

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
<title>WHISPERS Confirmation</title>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<link href="/assets/whispers-favicon.png" rel="apple-touch-icon"/>
<style>
@font-face{font-family:AvianoContrast;src:url("/assets/aviano-contrast.ttf") format("truetype");font-weight:300 700;font-style:normal;font-display:swap}
:root{--bg:#070605;--gold:#D9AE78;--gold-hi:#EBCB95;--bone:#EDE6DA;--mute:#BDB2A5;--line:rgba(217,174,120,.26);--serif:'AvianoContrast',Cambria,Georgia,serif;--sans:'AvianoContrast','Helvetica Neue',Arial,sans-serif;color-scheme:dark}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:radial-gradient(60% 40% at 50% 36%,rgba(120,78,36,.24),transparent 72%),radial-gradient(120% 60% at 50% 112%,rgba(90,11,19,.42),transparent 64%),linear-gradient(180deg,#0A0807,#070605 55%,#060404);color:var(--bone);font-family:var(--serif);font-weight:300;padding:calc(24px + env(safe-area-inset-top)) max(22px,env(safe-area-inset-right),env(safe-area-inset-left)) calc(28px + env(safe-area-inset-bottom));text-align:center}
body:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:url("/assets/whispers-rose.png") 50% 42%/min(150vw,920px) auto no-repeat;opacity:.13;filter:blur(1px) saturate(1.08)}body:after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(0,0,0,.64) 100%)}
.grain{position:fixed;inset:-50%;z-index:0;pointer-events:none;opacity:.045;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>");animation:grain 1.1s steps(3) infinite}@keyframes grain{0%{transform:translate(0,0)}33%{transform:translate(-3%,2%)}66%{transform:translate(2%,-3%)}100%{transform:translate(0,0)}}@media (prefers-reduced-motion:reduce){.grain{animation:none}}
main{position:relative;z-index:1;width:100%;max-width:480px}.brand-lockup{display:block;width:min(210px,62vw);height:auto;margin:0 auto;filter:drop-shadow(0 0 22px rgba(163,22,33,.3))}.brand-rule{display:block;width:54px;height:1px;margin:18px auto 0;background:rgba(217,174,120,.65)}h1{font-weight:300;font-size:clamp(32px,8.6vw,42px);line-height:1.08;margin:20px 0 6px;color:#F7F0E6;overflow-wrap:anywhere}.role{font-style:italic;color:#CDB894;margin:0;font-size:18px}.rule{position:relative;width:86px;height:1px;margin:22px auto;background:linear-gradient(90deg,transparent,rgba(217,174,120,.85),transparent)}.rule:after{content:"";position:absolute;left:50%;top:50%;width:6px;height:6px;background:var(--gold);transform:translate(-50%,-50%) rotate(45deg)}.code{font-family:var(--sans);font-weight:300;text-transform:uppercase;font-size:18px;letter-spacing:.22em;color:var(--gold-hi);text-shadow:0 0 24px rgba(217,174,120,.4)}.meta{font-size:16px;line-height:1.42;color:#D9CEC0;margin:0;padding-top:18px;border-top:1px solid var(--line)}.status-line,.note span{display:block}.status-line + .status-line,.note span + span{margin-top:16px}.note{font-style:italic;font-size:15px;line-height:1.42;color:#CFC3B3;margin:26px auto 0;max-width:390px}.update-link{display:flex;align-items:center;justify-content:center;width:100%;min-height:58px;margin:24px auto 0;padding:12px;font:500 clamp(18px,4.8vw,22px)/1.2 var(--sans);letter-spacing:.32em;text-transform:uppercase;color:#1C130A;border:1px solid #E6C48C;border-radius:3px;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%);text-decoration:none;text-shadow:0 1px 0 rgba(255,246,224,.32)}.update-link[hidden]{display:none}.partner-bar{position:relative;z-index:1;width:min(430px,calc(100vw - 28px));display:flex;align-items:center;justify-content:center;gap:14px;margin:44px auto 0;pointer-events:none;filter:drop-shadow(0 10px 22px rgba(0,0,0,.75))}.partner-bar span{font:300 10px/1 var(--sans);letter-spacing:.26em;text-transform:uppercase;color:rgba(237,230,218,.62)}.partner-logos{display:flex;align-items:center;justify-content:center;gap:12px}.partner-logo.beluga{width:100px;height:37px}.partner-logo.rothschild{width:118px;height:45px}.partner-logo img{width:100%;height:100%;object-fit:contain;opacity:.92}.loading{opacity:.48}
</style>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<main class="loading" id="shell">
<img class="brand-lockup" src="/assets/whispers-lockup-transparent.png" alt="WHISPERS"/>
<span class="brand-rule" aria-hidden="true"></span>
<h1 id="guest">...</h1>
<p class="role" id="role">Invited guest</p>
<div class="rule"></div>
<div class="code">10.10 · 22:00</div>
<p class="meta" id="meta">Location remains sealed until 09.10 at 18:00.</p>
<p class="note" id="note"><span>Your ticket will be sent to you</span><span>on 09.10 at 18:00.</span></p>
<a class="update-link" hidden id="updateDetails" href="#">Update details</a>
<aside aria-label="Event partners" class="partner-bar"><span>Powered by</span><div class="partner-logos"><div class="partner-logo rothschild"><img alt="Barons de Rothschild" src="/assets/partner-rothschild.png"/></div><div class="partner-logo beluga"><img alt="Beluga" src="/assets/partner-beluga.png"/></div></div></aside>
</main>
<script>
(async()=>{
  const api=${JSON.stringify(apiUrl)},$=id=>document.getElementById(id),esc=s=>String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  try{
    const res=await fetch(api,{headers:{'Accept':'application/json'}});
    if(!res.ok)throw new Error('bad');
    const data=await res.json(),t=data.ticket||{};
    $('guest').textContent=t.guest_name||'Your confirmation';
    $('role').textContent=t.brought_by?'Guest of '+t.brought_by:'Invited guest';
    const extras=[];
    if(t.bringing)extras.push('Registered with '+t.bringing+'.');
    if(t.table_requested)extras.push('Table reservation requested.');
    if(t.table_reserved)extras.push('Your table is confirmed.');
    $('meta').innerHTML=['Location remains sealed until 09.10 at 18:00.'].concat(extras).map(line=>'<span class="status-line">'+esc(line)+'</span>').join('');
    if(data.canUpdate&&data.updateUrl){$('updateDetails').href=data.updateUrl;$('updateDetails').hidden=false;}
  }catch(e){
    $('guest').textContent='Confirmation not found';
    $('role').textContent='Please check your private link.';
    $('meta').textContent='This confirmation link could not be loaded.';
    $('note').textContent='';
  }
  $('shell').classList.remove('loading');
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

export async function onRequest({ request }) {
  return Response.redirect(new URL(request.url).origin + "/", 302);
}
