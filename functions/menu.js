import { methodNotAllowed } from "./_shared/responses.js";

export async function onRequestGet() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#070605"/>
<title>WHISPERS Menu</title>
<meta name="description" content="WHISPERS menu"/>
<link rel="canonical" href="https://whisperssociety.com/menu"/>
<meta property="og:title" content="WHISPERS Menu"/>
<meta property="og:description" content="WHISPERS drinks menu."/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="https://whisperssociety.com/menu"/>
<meta property="og:image" content="https://whisperssociety.com/assets/whispers-preview-logo.png?v=20261001-logo1"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="WHISPERS Menu"/>
<meta name="twitter:description" content="WHISPERS drinks menu."/>
<meta name="twitter:image" content="https://whisperssociety.com/assets/whispers-preview-logo.png?v=20261001-logo1"/>
<link href="/assets/whispers-favicon.png" rel="icon" type="image/png"/>
<link href="/assets/whispers-favicon.png" rel="apple-touch-icon"/>
<link as="image" href="/assets/menu-page-1.png?v=20261008-tall1" rel="preload"/>
<style>
*{box-sizing:border-box}
html{background:#1A0708}
body{margin:0;min-height:100vh;min-height:100dvh;overflow-x:hidden;background:#1A0708}
.menu-pages{width:min(100%,900px);margin:0 auto;background:#1A0708}
.menu-pages img{display:block;width:100%;height:auto}
</style>
<script src="/assets/analytics.js" defer></script>
</head>
<body>
<main class="menu-pages">
<img src="/assets/menu-page-1.png?v=20261008-tall1" width="1600" height="3200" alt="WHISPERS menu" fetchpriority="high"/>
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
  return methodNotAllowed();
}
