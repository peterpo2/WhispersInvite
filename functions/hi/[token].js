export async function onRequestGet({ params }) {
  const token = params.token || "";
  if (!token || token.length < 1 || token.length > 120) {
    return Response.redirect("/", 302);
  }
  return Response.redirect(`/?token=${encodeURIComponent(token)}`, 302);
}

export async function onRequest() {
  return Response.redirect("/", 302);
}
