import { deviceKnown } from "./_loginotp.js";
import { planLevel } from "./partner_media.js";
import { verifyAdminToken } from "./_auth_helper.js";

/* ============================================================================
   /api/roadkm  -  ROAD KM FROM GOOGLE (Routes API) for Premium / Platinum.
   Owner 2026-11-19: "the km should come from Google inside our app, and the route on a map".
   The phone sends the points of a trip / quotation (saved GPS points, or the place names as typed);
   this asks Google for the DRIVING route and returns the km, the time and the route line.

   SAFETY / COST:
     - the Google key stays here (Cloudflare secret GOOGLE_MAPS_API_KEY); the phone never sees it.
     - only a logged-in phone (mobile + device_token of a known device) whose business is Premium or
       Platinum (planLevel >= 2) is answered; everybody else keeps the free map (OSRM) on the phone.
     - a daily limit per mobile (ROADKM_DAY_LIMIT, default 30; Platinum twice that) and the SAME monthly
       budget as the trip alerts (table maps_usage, ROUTES_HARD_MONTHLY_LIMIT, default 4000 - below
       Google's free allowance). Over a limit the phone just falls back to the free map.
     - the same route asked again within 30 days comes from roadkm_cache (no Google call, no count).
     - Essentials fields only (distance, duration, line), no traffic = the cheapest kind of call.
   POST JSON { mobile, device_token, pts:[ {lat,lon} | {q:"place name"} , ... ] }   (2 to 11 points)
     -> { ok, km, min, poly, pts:[[lat,lon]...], cached }  |  { ok:false, error }
   Admin: POST ?action=admin_usage { token } -> this month's calls, the limits and today's top users.
   ========================================================================== */

const j = (o, s) => Response.json(o, { status: s || 200 });
const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const CACHE_DAYS = 30;
const MAX_PTS = 11;   /* start + 9 stops + end: stays in Google's cheapest (Essentials) tier */
function envInt(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; }
const monthKey = () => new Date().toISOString().slice(0, 7);
const dayKey = () => new Date().toISOString().slice(0, 10);

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  for (const s of [
    "CREATE TABLE IF NOT EXISTS maps_usage (month TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS roadkm_usage (day TEXT NOT NULL, mobile TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, mobile))",
    "CREATE TABLE IF NOT EXISTS roadkm_cache (k TEXT PRIMARY KEY, data TEXT NOT NULL, at TEXT NOT NULL)",
  ]) await env.DB.prepare(s).run();
  ready = true;
}

/* one point: {lat,lon} (numbers on the earth) or {q:"place"} (plain text, no control characters) */
function cleanPt(p) {
  if (!p || typeof p !== "object") return null;
  const la = Number(p.lat), lo = Number(p.lon);
  if (p.lat != null && p.lon != null && Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0))
    return { lat: Math.round(la * 1e5) / 1e5, lon: Math.round(lo * 1e5) / 1e5 };
  const q = String(p.q == null ? "" : p.q).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return q.length >= 2 ? { q } : null;
}
function waypoint(p) {
  return p.q != null ? { address: p.q } : { location: { latLng: { latitude: p.lat, longitude: p.lon } } };
}
async function sha(t) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/* cache key: the points in order, GPS rounded to ~10 m, names in small letters */
async function cacheKey(pts) {
  return sha("rk1|" + pts.map((p) => (p.q != null ? "q:" + p.q.toLowerCase() : p.lat.toFixed(4) + "," + p.lon.toFixed(4))).join("|"));
}
/* owner 2026-11-25: a vehicle business on a YEARLY plan has no Google Maps (nomaps=1) - that business counts 0 here */
async function premiumOf(env, mobile) {
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT plan, plan_expires_at, platinum, nomaps FROM travel_partners WHERE mobile1=? OR mobile2=?").bind(mobile, mobile).all()).results || []; }
  catch (e) { try { rows = (await env.DB.prepare("SELECT plan, plan_expires_at, platinum FROM travel_partners WHERE mobile1=? OR mobile2=?").bind(mobile, mobile).all()).results || []; } catch (e2) { return 0; } }
  const lvl = rows.reduce((m, p) => Math.max(m, p.nomaps ? 0 : planLevel(p)), 0);
  if (!lvl && rows.some((p) => p.nomaps && planLevel(p) >= 2)) return -1;   /* paid, but on a yearly plan without Google Maps */
  return lvl;
}
/* counts the call only while under the limit (one conditional UPDATE, so two phones at once cannot overshoot) */
async function takeDay(env, mobile, limit) {
  const d = dayKey();
  await env.DB.prepare("INSERT OR IGNORE INTO roadkm_usage (day, mobile, calls) VALUES (?, ?, 0)").bind(d, mobile).run();
  const r = await env.DB.prepare("UPDATE roadkm_usage SET calls = calls + 1 WHERE day = ? AND mobile = ? AND calls < ?").bind(d, mobile, limit).run();
  return !!(r.meta && r.meta.changes > 0);
}
async function giveBackDay(env, mobile) {
  try { await env.DB.prepare("UPDATE roadkm_usage SET calls = calls - 1 WHERE day = ? AND mobile = ? AND calls > 0").bind(dayKey(), mobile).run(); } catch (e) {}
}
async function takeMonth(env) {
  const m = monthKey(), hard = envInt(env.ROUTES_HARD_MONTHLY_LIMIT, 4000);
  await env.DB.prepare("INSERT OR IGNORE INTO maps_usage (month, calls) VALUES (?, 0)").bind(m).run();
  const r = await env.DB.prepare("UPDATE maps_usage SET calls = calls + 1 WHERE month = ? AND calls < ?").bind(m, hard).run();
  return !!(r.meta && r.meta.changes > 0);
}

async function google(env, pts) {
  const body = {
    origin: waypoint(pts[0]),
    destination: waypoint(pts[pts.length - 1]),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_UNAWARE",
    regionCode: "IN",
    units: "METRIC",
  };
  if (pts.length > 2) body.intermediates = pts.slice(1, -1).map(waypoint);
  let res;
  try {
    res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation",
      },
      body: JSON.stringify(body),
    });
  } catch (e) { return { error: "google_unreachable" }; }
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const st = data && data.error && data.error.status;
    /* a place Google cannot find comes back as INVALID_ARGUMENT / NOT_FOUND; a key / API problem as PERMISSION_DENIED */
    return { error: st === "PERMISSION_DENIED" ? "google_denied" : (st === "INVALID_ARGUMENT" || st === "NOT_FOUND") ? "place_not_found" : "google_error" };
  }
  const r = data && data.routes && data.routes[0];
  if (!r || !(r.distanceMeters >= 0)) return { error: "no_route" };
  const sec = parseInt(String(r.duration || "0s").replace("s", ""), 10) || 0;
  const ll = (x) => (x && x.latLng && Number.isFinite(x.latLng.latitude) ? [Math.round(x.latLng.latitude * 1e5) / 1e5, Math.round(x.latLng.longitude * 1e5) / 1e5] : null);
  const legs = Array.isArray(r.legs) ? r.legs : [];
  const at = legs.map((l) => ll(l.startLocation));
  if (legs.length) at.push(ll(legs[legs.length - 1].endLocation));
  return {
    km: Math.round(r.distanceMeters / 100) / 10,
    min: Math.round(sec / 60),
    poly: String((r.polyline && r.polyline.encodedPolyline) || "").slice(0, 60000),
    pts: at,
  };
}

export async function onRequestPost({ request, env }) {
  await ensureTables(env);
  const action = new URL(request.url).searchParams.get("action") || "";
  let body = {};
  try { body = await request.json(); } catch (e) { return j({ ok: false, error: "bad_request" }, 400); }

  if (action === "admin_usage") {
    if (!(await verifyAdminToken(env, body.token))) return j({ ok: false, error: "unauthorized" }, 401);
    const m = await env.DB.prepare("SELECT calls FROM maps_usage WHERE month=?").bind(monthKey()).first();
    const top = await env.DB.prepare("SELECT mobile, calls FROM roadkm_usage WHERE day=? ORDER BY calls DESC LIMIT 20").bind(dayKey()).all();
    return j({ ok: true, month: monthKey(), month_calls: (m && m.calls) || 0, month_limit: envInt(env.ROUTES_HARD_MONTHLY_LIMIT, 4000), day_limit: envInt(env.ROADKM_DAY_LIMIT, 30), today: top.results || [], key: !!env.GOOGLE_MAPS_API_KEY });
  }
  if (action) return j({ ok: false, error: "unknown_action" }, 400);

  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return j({ ok: false, error: "unauthorized" }, 403);
  const raw = Array.isArray(body.pts) ? body.pts.slice(0, MAX_PTS + 1) : [];
  if (raw.length > MAX_PTS) return j({ ok: false, error: "too_many_points", max: MAX_PTS }, 400);
  const pts = raw.map(cleanPt);
  if (pts.length < 2 || pts.some((p) => !p)) return j({ ok: false, error: "bad_points" }, 400);

  const lvl = await premiumOf(env, mobile);
  if (lvl < 2) return j({ ok: false, error: lvl === -1 ? "nomaps" : "plan" }, 403);
  if (!env.GOOGLE_MAPS_API_KEY) return j({ ok: false, error: "no_key" }, 503);

  const k = await cacheKey(pts);
  try {
    const hit = await env.DB.prepare("SELECT data, at FROM roadkm_cache WHERE k=?").bind(k).first();
    if (hit && Date.now() - Date.parse(hit.at) < CACHE_DAYS * 86400000) return j(Object.assign({ ok: true, cached: 1 }, JSON.parse(hit.data)));
  } catch (e) {}

  const dayLimit = envInt(env.ROADKM_DAY_LIMIT, 30) * (lvl >= 3 ? 2 : 1);
  if (!(await takeDay(env, mobile, dayLimit))) return j({ ok: false, error: "day_limit", limit: dayLimit }, 429);
  if (!(await takeMonth(env))) { await giveBackDay(env, mobile); return j({ ok: false, error: "month_limit" }, 429); }

  const g = await google(env, pts);
  if (g.error) return j({ ok: false, error: g.error }, 502);
  try {
    await env.DB.prepare("INSERT INTO roadkm_cache (k, data, at) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET data=excluded.data, at=excluded.at").bind(k, JSON.stringify(g), new Date().toISOString()).run();
    if (Math.random() < 0.02) {
      await env.DB.prepare("DELETE FROM roadkm_cache WHERE at < ?").bind(new Date(Date.now() - CACHE_DAYS * 86400000).toISOString()).run();
      await env.DB.prepare("DELETE FROM roadkm_usage WHERE day < ?").bind(new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10)).run();
    }
  } catch (e) {}
  return j(Object.assign({ ok: true, cached: 0 }, g));
}
