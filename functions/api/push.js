export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (action === "vapid_public_key") {
    return Response.json({ ok: true, key: env.VAPID_PUBLIC_KEY });
  }
  return Response.json({ ok: false, error: "unknown_action" });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  const action = body.action;

  /* A device registers itself here once notification permission is granted —
     stores just enough (endpoint + the two public keys the browser gave us) to
     be able to send it a push later. Re-subscribing with the same endpoint just
     overwrites the row (a subscription's keys don't change, only appearing again
     after e.g. clearing browser data). */
  if (action === "subscribe") {
    const sub = body.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return Response.json({ ok: false, error: "invalid_subscription" }, { status: 400 });
    }
    try {
      await env.DB
        .prepare("INSERT OR REPLACE INTO push_subscriptions (mobile, endpoint, p256dh, auth, created_at) VALUES (?,?,?,?,?)")
        .bind(body.mobile || "", sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString())
        .run();
      return Response.json({ ok: true });
    } catch (e) {
      /* Surface the real D1 error instead of letting an unhandled exception turn
         into a bare 500 with no explanation — this is exactly the kind of failure
         that otherwise looks identical to success in a rushed glance at the UI. */
      return Response.json({ ok: false, error: "db_error", detail: String(e && e.message ? e.message : e) }, { status: 500 });
    }
  }

  if (action === "unsubscribe") {
    if (!body.endpoint) return Response.json({ ok: false, error: "missing_endpoint" }, { status: 400 });
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(body.endpoint).run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
