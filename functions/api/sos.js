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
   screen at that exact moment (as long as the app tab is open). */
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
  return Response.json({ ok: true, id: result.meta.last_row_id, created_at: now });
}
