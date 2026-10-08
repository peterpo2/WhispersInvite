export function renderStaffLoginPage() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<title>WHISPERS Staff</title>
<meta property="og:title" content="WHISPERS Staff"/>
<meta property="og:type" content="website"/>
<meta property="og:image" content="https://whisperssociety.com/assets/whispers-preview-logo.png?v=20261001-logo1"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="WHISPERS Staff"/>
<meta name="twitter:image" content="https://whisperssociety.com/assets/whispers-preview-logo.png?v=20261001-logo1"/>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<style>
:root{--bg:#070605;--gold:#D9AE78;--bone:#EDE6DA;--muted:#B4A99D;--line:rgba(217,174,120,.24);--sans:'Jost','Helvetica Neue',Arial,sans-serif;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;background:radial-gradient(90% 50% at 50% 0,rgba(217,174,120,.09),transparent 62%),radial-gradient(120% 60% at 50% 112%,rgba(90,11,19,.32),transparent 64%),#070605;color:var(--bone);font-family:var(--sans);padding:24px}
body:before{content:"";position:fixed;inset:0;background:url("/assets/whispers-rose.png") 50% 44%/min(92vw,760px) auto no-repeat;opacity:.08;pointer-events:none}
main{position:relative;z-index:1;width:min(420px,100%);display:grid;gap:24px}
.brand{text-align:center}.brand img{width:min(260px,74vw);height:auto;filter:drop-shadow(0 0 18px rgba(163,22,33,.24))}
form{display:grid;gap:12px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:22px 0}
label{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold)}
input,button{width:100%;min-height:54px;border:1px solid rgba(217,174,120,.58);border-radius:3px;background:rgba(8,6,5,.46);color:var(--bone);padding:0 14px;font:400 16px var(--sans)}
input{letter-spacing:.04em}button{cursor:pointer;letter-spacing:.28em;text-transform:uppercase;color:#1C130A;border-color:#E6C48C;background:linear-gradient(180deg,#EBCD98 0%,#D2AA72 48%,#B58A57 100%)}
.err{min-height:20px;color:#E8808A;font-size:13px;text-align:center}
</style>
</head>
<body>
<main>
<div class="brand"><img src="/assets/whispers-lockup-transparent.png" alt="WHISPERS"/></div>
<form id="staffLogin">
<label for="username">Username</label>
<input id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required/>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required/>
<button type="submit">Confirm</button>
<div class="err" id="err" role="alert"></div>
</form>
</main>
<script>
document.getElementById('staffLogin').onsubmit=async(e)=>{
  e.preventDefault();
  const err=document.getElementById('err');err.textContent='';
  const payload={username:username.value,password:password.value};
  let res,data;try{res=await fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});data=await res.json();}catch(_){err.textContent='No connection.';return;}
  if(!res.ok){err.textContent=data.error||'Invalid username or password.';return;}
  location.reload();
};
</script>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
