import { supabaseFetch } from "../_shared/supabase.js";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char]);
}

function page(title, body, status = 200) {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)} · WHISPERS</title>
<style>
body{margin:0;min-height:100svh;display:grid;place-items:center;background:#050403;color:#f5eee5;font-family:Georgia,serif}
main{width:min(520px,calc(100vw - 40px));text-align:center;border:1px solid rgba(217,174,120,.42);padding:34px 24px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015))}
.k{font:11px Arial,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#d6aa72}
h1{font-weight:400;font-size:42px;margin:18px 0 10px}
p{line-height:1.65;color:#cfc5ba;margin:8px 0}
b{color:#f5eee5;font-weight:400}
</style>
</head>
<body><main>${body}</main></body>
</html>`, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return page("Invalid ticket", `<p class="k">WHISPERS</p><h1>Invalid ticket.</h1><p>No ticket token was found.</p>`, 400);
  }

  const lookup = await supabaseFetch(
    env,
    `/rest/v1/rsvps?select=id,guest_name,plus_one_name,seal_code,checked_in_at,status&ticket_token=eq.${encodeURIComponent(token)}&limit=1`
  );
  if (lookup.error) return lookup.error;
  if (!lookup.response.ok) return page("Ticket error", `<p class="k">WHISPERS</p><h1>Could not verify.</h1><p>Please try again.</p>`, 502);

  const rows = await lookup.response.json();
  if (!rows.length || rows[0].status !== "attending") {
    return page("Invalid ticket", `<p class="k">WHISPERS</p><h1>Invalid ticket.</h1><p>This seal is not on the confirmed list.</p>`, 404);
  }

  const ticket = rows[0];
  if (ticket.checked_in_at) {
    return page(
      "Already checked in",
      `<p class="k">WHISPERS</p><h1>Already inside.</h1><p><b>${escapeHtml(ticket.guest_name)}</b>${ticket.plus_one_name ? ` with <b>${escapeHtml(ticket.plus_one_name)}</b>` : ""}</p><p>Checked in at ${escapeHtml(new Date(ticket.checked_in_at).toLocaleString("en-GB"))}.</p>`,
      200
    );
  }

  const checkedAt = new Date().toISOString();
  const update = await supabaseFetch(env, `/rest/v1/rsvps?id=eq.${encodeURIComponent(ticket.id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({ checked_in_at: checkedAt }),
  });
  if (update.error) return update.error;
  if (!update.response.ok) return page("Ticket error", `<p class="k">WHISPERS</p><h1>Could not check in.</h1><p>Please try again.</p>`, 502);

  return page(
    "Checked in",
    `<p class="k">WHISPERS</p><h1>Confirmed.</h1><p><b>${escapeHtml(ticket.guest_name)}</b>${ticket.plus_one_name ? ` with <b>${escapeHtml(ticket.plus_one_name)}</b>` : ""}</p><p>${escapeHtml(ticket.seal_code || "")}</p>`,
    200
  );
}

export async function onRequest() {
  return page("Method not allowed", `<p class="k">WHISPERS</p><h1>Method not allowed.</h1>`, 405);
}
