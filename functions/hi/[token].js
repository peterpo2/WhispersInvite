export async function onRequestGet({ params, request }) {
  const origin = new URL(request.url).origin;
  const token = params.token || "";
  if (!token || token.length < 1 || token.length > 120) {
    return Response.redirect(origin + "/", 302);
  }
  return Response.redirect(`${origin}/?token=${encodeURIComponent(token)}`, 302);
}

export async function onRequest({ request }) {
  return Response.redirect(new URL(request.url).origin + "/", 302);
}
