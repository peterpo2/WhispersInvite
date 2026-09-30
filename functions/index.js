export async function onRequestGet() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<title>WHISPERS</title>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<link href="/assets/whispers-favicon.png" rel="apple-touch-icon"/>
<link as="image" href="/assets/whispers-lockup-transparent.png" rel="preload"/>
<style>
@font-face{font-family:AvianoContrast;src:url("/assets/aviano-contrast.ttf") format("truetype");font-weight:300 700;font-style:normal;font-display:swap}
:root{--bg:#070605;--gold:#D9AE78;color-scheme:dark}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg)}body{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:calc(24px + env(safe-area-inset-top)) max(24px,env(safe-area-inset-left),env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom));overflow:hidden;background:radial-gradient(60% 44% at 50% 46%,rgba(120,78,36,.18),transparent 68%),radial-gradient(110% 60% at 50% 112%,rgba(90,11,19,.32),transparent 68%),linear-gradient(180deg,#0A0807,#070605 58%,#050404)}
body:before{content:"";position:fixed;inset:0;background:url("/assets/whispers-rose.png") 50% 50%/min(150vw,920px) auto no-repeat;opacity:.08;filter:blur(1px);pointer-events:none}body:after{content:"";position:fixed;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 42%,rgba(0,0,0,.68) 100%);pointer-events:none}
main{position:relative;z-index:1;width:100%;display:grid;place-items:center}.brand-lockup{display:block;width:min(360px,82vw);height:auto;filter:drop-shadow(0 0 24px rgba(163,22,33,.26));opacity:.96}
</style>
</head>
<body>
<main aria-label="WHISPERS">
<img class="brand-lockup" src="/assets/whispers-lockup-transparent.png" alt="WHISPERS"/>
</main>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest() {
  return onRequestGet();
}
