import { methodNotAllowed } from "../_shared/responses.js";
import { checkInRedirectPath } from "../_shared/rsvp.js";

// Old QR codes and links point here. Viewing a ticket never checks a guest in:
// only the staff scanner (POST /api/door) does. Send the guest to their ticket.
export async function onRequestGet({ request }) {
  const token = new URL(request.url).searchParams.get("token");
  return new Response(null, {
    status: 302,
    headers: {
      Location: checkInRedirectPath(token),
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest() {
  return methodNotAllowed();
}
