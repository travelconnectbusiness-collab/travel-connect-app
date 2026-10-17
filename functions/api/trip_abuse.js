import { verifyAdminToken } from "./_auth_helper.js";

/* Abuse limits for trip requests (customers pressing "Find a Vehicle").
   Free of cost: it only counts the rows trip_alerts already stores. Phone numbers are not verified in this app, so a
   number alone is not trusted: the same request is also counted per phone/browser (device token) and per network (IP).
   Limits (per rolling window) - change here:
     same number : MOBILE_HOUR per hour, MOBILE_DAY per 24 h
     same device : DEVICE_HOUR per hour
     same IP     : IP_HOUR per hour (high, because many phones can share one mobile-network IP)
   A second tap of the same request within DUP_SECONDS returns the first request instead of alerting drivers again.
   The admin can block a number / device / IP (table trip_blocks); app users blocked in "All Users" are refused too. */
const MOBILE_HOUR = 5, MOBILE_DAY = 12, DEVICE_HOUR = 6, IP_HOUR = 25, DUP_SECONDS = 90;
const KEEP_LOG_DAYS = 7;

let ready = false;
export async function ensureAbuse(env) {
  if (ready) return;
  for (const stmt of [
    "ALTER TABLE trip_alerts ADD COLUMN mobile10 TEXT",
    "ALTER TABLE trip_alerts ADD COLUMN device TEXT",
    "ALTER TABLE trip_alerts ADD COLUMN ip TEXT",
  ]) { try { await env.DB.prepare(stmt).run(); } catch (e) { /* already exists */ } }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_trip_alerts_created ON trip_alerts (created_at)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS trip_blocks (kind TEXT NOT NULL, value TEXT NOT NULL, reason TEXT, created_at TEXT, PRIMARY KEY (kind, value))").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS trip_abuse_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, mobile10 TEXT, device TEXT, ip TEXT, why TEXT)").run();
  ready = true;
}

export const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const iso = (ms) => new Date(ms).toISOString();
const minutesUntil = (oldestIso, windowMs, now) => oldestIso ? Math.max(1, Math.ceil((new Date(oldestIso).getTime() + windowMs - now) / 60000)) : 60;

async function logAttempt(env, m10, device, ip, why) {
  try {
    await env.DB.prepare("INSERT INTO trip_abuse_log (created_at, mobile10, device, ip, why) VALUES (?,?,?,?,?)").bind(iso(Date.now()), m10, device, ip, why).run();
    if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM trip_abuse_log WHERE created_at < ?").bind(iso(Date.now() - KEEP_LOG_DAYS * 86400000)).run();
  } catch (e) {}
}

/* Returns { ok:true } to carry on, { ok:true, duplicate:{...} } to reuse the first request,
   or { ok:false, status, error, retry_after_min } to refuse. */
export async function checkBroadcast(env, { mobile, device, ip, businessType, vclass, rateCat }) {
  await ensureAbuse(env);
  const m10 = last10(mobile), now = Date.now();
  device = String(device || "").slice(0, 80); ip = String(ip || "").slice(0, 64);

  /* 1. blocked? */
  const blocked = await env.DB.prepare(
    "SELECT kind FROM trip_blocks WHERE (kind='mobile' AND value=?) OR (kind='device' AND value=? AND value<>'') OR (kind='ip' AND value=? AND value<>'') LIMIT 1"
  ).bind(m10, device, ip).first();
  let appBlocked = null;
  if (!blocked && m10) { try { appBlocked = await env.DB.prepare("SELECT 1 AS x FROM app_users WHERE blocked=1 AND mobile LIKE ? LIMIT 1").bind("%" + m10).first(); } catch (e) {} }
  if (blocked || appBlocked) {
    await logAttempt(env, m10, device, ip, "blocked (" + (blocked ? blocked.kind : "user") + ")");
    return { ok: false, status: 403, error: "blocked" };
  }

  /* 2. the same request tapped twice -> hand back the first one (a different Rate Master category is a different request) */
  const dup = await env.DB.prepare(
    "SELECT id, notified_count FROM trip_alerts WHERE mobile10=? AND business_type=? AND COALESCE(vclass,'')=? AND COALESCE(rate_cat,'')=? AND status='open' AND created_at>=? ORDER BY id DESC LIMIT 1"
  ).bind(m10, businessType, vclass || "", rateCat == null ? "" : String(rateCat), iso(now - DUP_SECONDS * 1000)).first();
  if (dup) return { ok: true, duplicate: { alert_id: dup.id, notified_count: dup.notified_count } };

  /* 3. counts */
  const h = iso(now - 3600000), d = iso(now - 86400000);
  const c = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN mobile10=? AND created_at>=? THEN 1 ELSE 0 END) AS m_hour,
       MIN(CASE WHEN mobile10=? AND created_at>=? THEN created_at END) AS m_hour_old,
       SUM(CASE WHEN mobile10=? THEN 1 ELSE 0 END) AS m_day,
       MIN(CASE WHEN mobile10=? THEN created_at END) AS m_day_old,
       SUM(CASE WHEN device=? AND device<>'' AND created_at>=? THEN 1 ELSE 0 END) AS d_hour,
       MIN(CASE WHEN device=? AND device<>'' AND created_at>=? THEN created_at END) AS d_hour_old,
       SUM(CASE WHEN ip=? AND ip<>'' AND created_at>=? THEN 1 ELSE 0 END) AS ip_hour,
       MIN(CASE WHEN ip=? AND ip<>'' AND created_at>=? THEN created_at END) AS ip_hour_old
     FROM trip_alerts WHERE created_at>=?`
  ).bind(m10, h, m10, h, m10, m10, device, h, device, h, ip, h, ip, h, d).first() || {};
  let why = null, wait = 60;
  if ((c.m_hour || 0) >= MOBILE_HOUR) { why = "same number: " + MOBILE_HOUR + " per hour"; wait = minutesUntil(c.m_hour_old, 3600000, now); }
  else if ((c.m_day || 0) >= MOBILE_DAY) { why = "same number: " + MOBILE_DAY + " per day"; wait = minutesUntil(c.m_day_old, 86400000, now); }
  else if ((c.d_hour || 0) >= DEVICE_HOUR) { why = "same device: " + DEVICE_HOUR + " per hour"; wait = minutesUntil(c.d_hour_old, 3600000, now); }
  else if ((c.ip_hour || 0) >= IP_HOUR) { why = "same network (IP): " + IP_HOUR + " per hour"; wait = minutesUntil(c.ip_hour_old, 3600000, now); }
  if (why) {
    await logAttempt(env, m10, device, ip, "limit - " + why);
    return { ok: false, status: 429, error: "rate_limited", retry_after_min: wait };
  }
  return { ok: true };
}

const j = (o, s) => Response.json(o, s ? { status: s } : undefined);

/* Admin endpoints, called from trip_alerts.js. Return null when the action is not theirs. */
export async function abuseGet(env, action, url) {
  if (action !== "abuse_recent") return null;
  if (!(await verifyAdminToken(env, url.searchParams.get("token")))) return j({ ok: false, error: "unauthorized" }, 401);
  await ensureAbuse(env);
  const d = iso(Date.now() - 86400000);
  const recent = ((await env.DB.prepare(
    `SELECT t.id, t.created_at, t.business_type, t.vclass, t.customer_name, t.customer_mobile, t.mobile10, t.notified_count, t.status, t.device, t.ip,
            (SELECT COUNT(*) FROM trip_alerts x WHERE x.mobile10=t.mobile10 AND t.mobile10<>'' AND x.created_at>=?) AS count_24h
     FROM trip_alerts t ORDER BY t.id DESC LIMIT 40`
  ).bind(d).all()).results) || [];
  const blocks = ((await env.DB.prepare("SELECT kind, value, reason, created_at FROM trip_blocks ORDER BY created_at DESC LIMIT 100").all()).results) || [];
  const log = ((await env.DB.prepare("SELECT created_at, mobile10, why FROM trip_abuse_log ORDER BY id DESC LIMIT 20").all()).results) || [];
  const total = await env.DB.prepare("SELECT COUNT(*) AS c FROM trip_alerts WHERE created_at>=?").bind(d).first();
  return j({ ok: true, total_24h: total ? total.c : 0, recent, blocks, log,
    limits: { mobile_hour: MOBILE_HOUR, mobile_day: MOBILE_DAY, device_hour: DEVICE_HOUR, ip_hour: IP_HOUR } });
}

export async function abusePost(env, body) {
  if (body.action !== "abuse_block" && body.action !== "abuse_unblock") return null;
  if (!(await verifyAdminToken(env, body.token))) return j({ ok: false, error: "unauthorized" }, 401);
  await ensureAbuse(env);
  const kind = String(body.kind || ""), value = kind === "mobile" ? last10(body.value) : String(body.value || "").slice(0, 80);
  if (!["mobile", "device", "ip"].includes(kind) || !value) return j({ ok: false, error: "bad_request" }, 400);
  if (body.action === "abuse_unblock") { await env.DB.prepare("DELETE FROM trip_blocks WHERE kind=? AND value=?").bind(kind, value).run(); return j({ ok: true }); }
  await env.DB.prepare("INSERT INTO trip_blocks (kind, value, reason, created_at) VALUES (?,?,?,?) ON CONFLICT(kind, value) DO UPDATE SET reason=excluded.reason")
    .bind(kind, value, String(body.reason || "").slice(0, 120), iso(Date.now())).run();
  return j({ ok: true });
}
