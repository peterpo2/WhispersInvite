(function () {
  const MEASUREMENT_ID = "G-409SH8CXBH";
  const GTAG_SRC = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  function safePagePath() {
    const path = window.location.pathname || "/";
    if (/^\/ticket\/[^/]+\/?$/.test(path)) return "/ticket/[token]";
    if (/^\/confirmation\/[^/]+\/?$/.test(path)) return "/confirmation/[token]";
    if (path === "/invite/" || path === "/invite") return "/invite";
    if (path.startsWith("/invite/")) return "/invite";
    if (window.location.search === "") return path;
    return path;
  }

  function safePageLocation() {
    return window.location.origin + safePagePath();
  }

  function loadTag() {
    if (document.querySelector('script[data-whispers-analytics="true"]')) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = GTAG_SRC;
    script.dataset.whispersAnalytics = "true";
    document.head.appendChild(script);
  }

  function sendPageView() {
    loadTag();
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, {
      page_path: safePagePath(),
      page_location: safePageLocation(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  sendPageView();
})();
