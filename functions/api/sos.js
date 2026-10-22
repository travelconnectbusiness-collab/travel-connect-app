import { sendWebPush } from "./_webpush.js";
import { deviceCheck } from "./_devauth.js";

/* GET ?action=latest&since=<ISO timestamp> — returns any SOS alerts created after
   the given time, for other logged-in devices to poll and show an in-app alert for.
   GET ?action=history — returns every SOS alert from the last 48 hours, newest
   first, for a persistent history list (not just the temporary popup banner). */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  /* SOS alerts carry a name, a mobile number and a LOCATION - only a logged-in phone may read them (see _devauth.js) */
  if (action === "latest" || action === "history") {
    const deny = await deviceCheck(env, request, "sos.get", null);
    if (deny) return deny;
  }

  if (action === "latest") {
    const since = url.searchParams.get("since") || "1970-01-01T00:00:00.000Z";
    const { results } = await env.DB
      .prepare("SELECT * FROM sos_alerts WHERE created_at > ? ORDER BY created_at ASC LIMIT 20")
      .bind(since)
      .all();
    return Response.json({ ok: true, alerts: results });
  }

  if (action === "history") {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { results } = await env.DB
      .prepare("SELECT * FROM sos_alerts WHERE created_at > ? AND (resolved IS NULL OR resolved=0) ORDER BY created_at DESC LIMIT 50")
      .bind(cutoff)
      .all();
    return Response.json({ ok: true, alerts: results });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

/* Anyone logged in can raise an SOS — it's recorded centrally so every other device
   polling this app can pick it up and alert, even if they weren't looking at the
   screen at that exact moment (as long as the app tab is open). It ALSO fans out a
   real push notification to every registered device here — this is what reaches
   someone even with the app fully closed / phone locked, which polling alone can
   never do. A subscription the push service reports as gone (404/410) is deleted
   so it stops being retried on future alerts. */
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  /* Anyone can mark an alert resolved — there's no separate per-user ownership
     check here, since any logged-in device might be the one that confirmed the
     person is safe (e.g. a different traveler who reached them first). This is
     intentionally simple, matching how the rest of the SOS system already
     trusts any logged-in device. */
  /* Only the mobile number that actually sent this SOS can mark it resolved —
     otherwise anyone using the app could clear someone else's still-active
     emergency out of the list without them actually having gotten help. */
  if (body.action === "resolve") {
    if (!body.id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
    const alert = await env.DB.prepare("SELECT sender_mobile FROM sos_alerts WHERE id=?").bind(body.id).first();
    if (!alert) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (!body.mobile || alert.sender_mobile !== body.mobile) {
      return Response.json({ ok: false, error: "not_owner" }, { status: 403 });
    }
    const denyR = await deviceCheck(env, request, "sos.resolve", [String(body.mobile)]);
    if (denyR) return denyR;
    await env.DB.prepare("UPDATE sos_alerts SET resolved=1 WHERE id=?").bind(body.id).run();
    return Response.json({ ok: true });
  }

  /* only the phone logged in as the sender may raise an SOS in that name */
  if (body.sender_mobile) {
    const denyS = await deviceCheck(env, request, "sos.post", [String(body.sender_mobile)]);
    if (denyS) return denyS;
  }
  /* flood guard (always on): one sender max 5 alerts per hour, the whole app max 30 per hour - an SOS pushes a notification to every business owner */
  try {
    const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const all = await env.DB.prepare("SELECT COUNT(*) AS c FROM sos_alerts WHERE created_at > ?").bind(hourAgo).first();
    if (all && all.c >= 30) return Response.json({ ok: false, error: "too_many_alerts" }, { status: 429 });
    if (body.sender_mobile) {
      const mine = await env.DB.prepare("SELECT COUNT(*) AS c FROM sos_alerts WHERE sender_mobile=? AND created_at > ?").bind(String(body.sender_mobile), hourAgo).first();
      if (mine && mine.c >= 5) return Response.json({ ok: false, error: "too_many_alerts" }, { status: 429 });
    }
  } catch (e) { /* the guard must never stop a real SOS */ }

  const now = new Date().toISOString();
  const result = await env.DB
    .prepare(
      "INSERT INTO sos_alerts (sender_name, sender_mobile, message, lat, lon, created_at) VALUES (?,?,?,?,?,?)"
    )
    .bind(
      body.sender_name || null,
      body.sender_mobile || null,
      body.message || null,
      body.lat ?? null,
      body.lon ?? null,
      now
    )
    .run();

  if (env.VAPID_PRIVATE_JWK) {
    try {
      /* Customers can now also turn on push notifications (for chat messages),
         but SOS is only part of the business-owner network - so skip any
         subscription whose mobile belongs to a customer account. */
      const { results: subs } = await env.DB
        .prepare(
          "SELECT s.* FROM push_subscriptions s LEFT JOIN app_users u ON u.mobile = s.mobile WHERE (u.role IS NULL OR u.role <> 'customer')"
        )
        .all();
      const payload = {
        title: "🚨 SOS: " + (body.sender_name || "Someone") + " needs help!",
        body: body.message || "Needs urgent assistance.",
        mobile: body.sender_mobile || "",
        lat: body.lat ?? null,
        lon: body.lon ?? null
      };
      await Promise.all(subs.map(async (sub) => {
        let result;
        try {
          const r = await sendWebPush(env, sub, payload);
          result = { ok: r.ok ? 1 : 0, status_code: r.statusCode, error: null };
          if (r.stale) {
            await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
          }
        } catch (e) {
          /* One failed subscription should never block the others. */
          result = { ok: 0, status_code: null, error: String(e && e.stack ? e.stack : e).slice(0, 500) };
        }
        /* Written to D1 (not just console.log) so this can be checked afterward
           with a plain SELECT, any time — no need to have a live log stream
           open and racing to catch the exact moment the SOS button is pressed. */
        try {
          await env.DB
            .prepare("INSERT INTO push_debug_log (endpoint, ok, status_code, error, created_at) VALUES (?,?,?,?,?)")
            .bind(sub.endpoint.slice(0, 100), result.ok, result.status_code, result.error, new Date().toISOString())
            .run();
        } catch (e) { /* the debug table itself is best-effort */ }
      }));
    } catch (e) {
      console.error("push fan-out FAILED entirely", { error: String(e && e.stack ? e.stack : e) });
    }
  }

  return Response.json({ ok: true, id: result.meta.last_row_id, created_at: now });
}
