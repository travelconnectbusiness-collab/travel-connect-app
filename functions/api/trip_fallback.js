import { verifyAdminToken } from "./_auth_helper.js";

/* When nobody accepts a trip request:
   - after WAIT minutes (admin setting, default 5) the customer's waiting screen shows the nearby drivers that were
     alerted (name, distance, Call button) and the help number of Krishna Tours (admin setting);
   - the admin sees, for the last 30 days, how many requests went unanswered and per driver: alerts received / accepted.
   Free: only reads rows that trip_alerts already stores (trip_alert_candidates = every driver alerted for a request). */
const DEFAULT_WAIT = 5, MIN_WAIT = 2, MAX_WAIT = 9; /* a request lives 10 minutes */

const j = (o, s) => Response.json(o, s ? { status: s } : undefined);
async function setting(env, key) {
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key=?").bind(key).first();
    return r ? r.value : null;
  } catch (e) { return null; }
}
async function put(env, key, value) {
  await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, value).run();
}
async function waitMinutes(env) {
  const n = parseInt(await setting(env, "fallback_minutes"), 10);
  return n >= MIN_WAIT && n <= MAX_WAIT ? n : DEFAULT_WAIT;
}

export async function fallbackGet(env, action, url) {
  if (action === "fallback") {
    const alertId = Number(url.searchParams.get("alert_id"));
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!alertId || !mobile) return j({ ok: false, error: "missing_fields" }, 400);
    const a = await env.DB.prepare("SELECT id, customer_mobile, status, created_at FROM trip_alerts WHERE id=?").bind(alertId).first();
    if (!a) return j({ ok: false, error: "not_found" }, 404);
    if (a.customer_mobile !== mobile) return j({ ok: false, error: "unauthorized" }, 403);
    const minutes = await waitMinutes(env);
    const left = Math.ceil((new Date(a.created_at).getTime() + minutes * 60000 - Date.now()) / 1000);
    if (a.status === "accepted" || a.status === "cancelled") return j({ ok: true, ready: false, status: a.status, seconds_left: 0 });
    if (left > 0 && a.status === "open") return j({ ok: true, ready: false, status: a.status, seconds_left: left, minutes });
    const nearby = ((await env.DB.prepare(
      `SELECT p.id, p.business_name, p.mobile1, c.distance_km
       FROM trip_alert_candidates c JOIN travel_partners p ON p.id=c.partner_id
       WHERE c.alert_id=? AND p.verified=1 ORDER BY (c.distance_km IS NULL), c.distance_km LIMIT 5`
    ).bind(alertId).all()).results) || [];
    const phone = await setting(env, "fallback_phone");
    return j({ ok: true, ready: true, status: a.status, minutes, nearby: nearby.map((n) => ({ name: n.business_name, mobile: n.mobile1, distance_km: n.distance_km })), help_phone: phone || null });
  }

  if (action === "fallback_admin") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) return j({ ok: false, error: "unauthorized" }, 401);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const t = await env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) AS accepted,
              SUM(CASE WHEN status<>'accepted' AND status<>'cancelled' AND notified_count=0 THEN 1 ELSE 0 END) AS nobody_online,
              SUM(CASE WHEN status='expired' AND notified_count>0 THEN 1 ELSE 0 END) AS unanswered
       FROM trip_alerts WHERE created_at>=?`
    ).bind(since).first() || {};
    const drivers = ((await env.DB.prepare(
      `SELECT p.id, p.business_name, p.business_type, p.mobile1,
              COUNT(*) AS received,
              SUM(CASE WHEN a.accepted_partner_id=p.id THEN 1 ELSE 0 END) AS accepted
       FROM trip_alert_candidates c
       JOIN trip_alerts a ON a.id=c.alert_id
       JOIN travel_partners p ON p.id=c.partner_id
       WHERE a.created_at>=? GROUP BY p.id ORDER BY received DESC, accepted ASC LIMIT 60`
    ).bind(since).all()).results) || [];
    return j({ ok: true, minutes: await waitMinutes(env), help_phone: (await setting(env, "fallback_phone")) || "",
      totals: { total: t.total || 0, accepted: t.accepted || 0, unanswered: t.unanswered || 0, nobody_online: t.nobody_online || 0 }, drivers,
      limits: { min: MIN_WAIT, max: MAX_WAIT } });
  }
  return null;
}

export async function fallbackPost(env, body) {
  if (body.action !== "fallback_set") return null;
  if (!(await verifyAdminToken(env, body.token))) return j({ ok: false, error: "unauthorized" }, 401);
  const minutes = parseInt(body.minutes, 10);
  if (!(minutes >= MIN_WAIT && minutes <= MAX_WAIT)) return j({ ok: false, error: "bad_minutes" }, 400);
  const phone = String(body.phone || "").replace(/[^\d+]/g, "").slice(0, 16);
  if (phone && phone.replace(/\D/g, "").length < 8) return j({ ok: false, error: "bad_phone" }, 400);
  await put(env, "fallback_minutes", String(minutes));
  await put(env, "fallback_phone", phone);
  return j({ ok: true, minutes, phone });
}
