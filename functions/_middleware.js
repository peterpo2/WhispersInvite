import { isPublicPath } from "./_shared/access.js";

const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow",
};

function withSecurityHeaders(response) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    secured.headers.set(name, value);
  }
  return secured;
}

function plainText(body, status) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest({ request, next }) {
  const { pathname } = new URL(request.url);

  if (pathname === "/robots.txt") {
    return withSecurityHeaders(plainText("User-agent: *\nDisallow: /\n", 200));
  }

  if (!isPublicPath(pathname)) {
    return withSecurityHeaders(plainText("Not found.", 404));
  }

  return withSecurityHeaders(await next());
}
