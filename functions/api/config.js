const ADMIN_PASSWORD = "Krishna@123";

/* Public read — every device fetches the current shared rates/platform config on load. */
export async function onRequestGet({ env }) {
  try {
    const row = await env.DB
      .prepare("SELECT config_json, updated_at FROM shared_config WHERE id=1")
      .first();
    if (!row) return Response.json({ ok: true, config: null });
    return Response.json({
      ok: true,
      config: JSON.parse(row.config_json),
      updated_at: row.updated_at,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/* Owner-only write — pushes the current rates/platform config to every device.
   Protected by the same admin password used for rate editing in the app. */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    if (body.password !== ADMIN_PASSWORD) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const configJson = JSON.stringify(body.config || {});
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO shared_config (id, config_json, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET config_json=excluded.config_json, updated_at=excluded.updated_at`
    ).bind(configJson, now).run();
    return Response.json({ ok: true, updated_at: now });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
