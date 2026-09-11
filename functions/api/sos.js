import { sendWebPush } from "./_webpush.js";

/* GET ?action=latest&since=<ISO timestamp> — returns any SOS alerts created after
   the given time, for other logged-in devices to poll and show an in-app alert for.
   GET ?action=history — returns every SOS alert from the last 48 hours, newest
   first, for a persistent history list (not just the temporary popup banner). */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

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
      .prepare("SELECT * FROM sos_alerts WHERE created_at > ? ORDER BY created_at DESC LIMIT 50")
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
      const { results: subs } = await env.DB.prepare("SELECT * FROM push_subscriptions").all();
      const payload = {
        title: "🚨 SOS: " + (body.sender_name || "Someone") + " needs help!",
        body: body.message || "Needs urgent assistance.",
        mobile: body.sender_mobile || "",
        lat: body.lat ?? null,
        lon: body.lon ?? null
      };
      await Promise.all(subs.map(async (sub) => {
        try {
          const r = await sendWebPush(env, sub, payload);
          console.log("sendWebPush result", { endpoint: sub.endpoint.slice(0, 60), ok: r.ok, statusCode: r.statusCode });
          if (r.stale) {
            await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
          }
        } catch (e) {
          /* One failed subscription should never block the others — but log it
             loudly so it actually shows up in the Workers Logs tab, instead of
             silently vanishing (which is what made this bug impossible to see
             before). */
          console.error("sendWebPush FAILED", { endpoint: sub.endpoint.slice(0, 60), error: String(e && e.stack ? e.stack : e) });
        }
      }));
    } catch (e) {
      console.error("push fan-out FAILED entirely", { error: String(e && e.stack ? e.stack : e) });
    }
  }

  return Response.json({ ok: true, id: result.meta.last_row_id, created_at: now });
}
