/* functions/api/trip_alerts.js
   The "Kerala Safari style" dispatch flow: a customer searching for a
   nearby Taxi/Auto/Pickup-Goods vehicle sends ONE alert; every currently
   Active, verified partner of that category nearby gets a push
   notification at the same time; whichever one taps Accept FIRST gets
   the trip, and the rest simply stop seeing it as available. The
   customer and the accepting partner then talk directly (call/message)
   to finalise - this backend only handles the "who gets it" race, never
   the trip itself.

   Distance/time shown to both sides is the ACTUAL driving distance and
   duration from the vehicle's own registered location to the customer's
   pickup point (Google Routes API) - not a straight-line guess, since a
   straight-line number can be badly misleading on Kerala's roads. A
   cheap straight-line (Haversine) distance is still used FIRST, purely
   to narrow down which partners are even worth asking Google about -
   this keeps the number of paid-API calls small (only genuinely nearby
   candidates), while what both the driver and the customer actually SEE
   is always the real driving figure. */

import { sendWebPush } from "./_webpush.js";
import { verifyAdminToken } from "./_auth_helper.js";
import { eligiblePartners, partnerMatches, VCLASSES } from "./trip_class.js";
import { ensureAbuse, checkBroadcast, last10 as last10Digits, abuseGet, abusePost } from "./trip_abuse.js";
import { fallbackGet, fallbackPost } from "./trip_fallback.js";

const RADIUS_KM = 15; // straight-line pre-filter only, not what's shown
const ALERT_LIFETIME_MINUTES = 10;

let ready = false;
async function ensure(env) {
  if (ready) return;
  /* The table/column set-up below is ~15 database calls. On Cloudflare's Free plan a request may make only 50,
     so it is done ONCE (remembered in app_flags) instead of at every cold start of the Worker. */
  const SCHEMA = "batch2";
  let done = false;
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const f = await env.DB.prepare("SELECT value FROM app_flags WHERE key='trip_alerts_schema'").first();
    done = !!(f && f.value === SCHEMA);
  } catch (e) { done = false; }
  if (!done) {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS trip_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_type TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_mobile TEXT NOT NULL,
        pickup_lat REAL,
        pickup_lon REAL,
        pickup_text TEXT,
        destinations TEXT,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        accepted_partner_id INTEGER,
        accepted_distance_km REAL,
        accepted_duration_min REAL,
        notified_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`
    ).run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_trip_alerts_status ON trip_alerts (status, created_at)").run();
    /* One row per partner actually notified for one alert - holds the real
       driving distance/duration computed ONCE at broadcast time, so
       re-opening the Accept prompt later (pending_for_partner) never needs
       to call Google again for the same figure. */
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS trip_alert_candidates (
        alert_id INTEGER NOT NULL,
        partner_id INTEGER NOT NULL,
        distance_km REAL,
        duration_min REAL,
        notified INTEGER NOT NULL DEFAULT 1,
        ord INTEGER NOT NULL DEFAULT 0,
        tier INTEGER NOT NULL DEFAULT 2,
        rel INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (alert_id, partner_id)
      )`
    ).run();
    /* Counts Google Routes calls per calendar month so the bill can never run
       away: see routeCallAllowed() below. */
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS maps_usage (
        month TEXT PRIMARY KEY,
        calls INTEGER NOT NULL DEFAULT 0
      )`
    ).run();
    /* Safe to run against a DB from before destinations/accepted_distance_km
       existed - SQLite has no "ADD COLUMN IF NOT EXISTS", so each is simply
       attempted and the harmless "already exists" error is swallowed. */
    for (const stmt of [
      "ALTER TABLE trip_alerts ADD COLUMN destinations TEXT",
      "ALTER TABLE trip_alerts ADD COLUMN vclass TEXT",
      "ALTER TABLE trip_alerts ADD COLUMN accepted_distance_km REAL",
      "ALTER TABLE trip_alerts ADD COLUMN accepted_duration_min REAL",
      /* batch sending (see notifyBatch): notified=0 means "alert saved for this driver but push not sent yet".
         Default 1 so rows from before this change are never pushed twice. */
      "ALTER TABLE trip_alert_candidates ADD COLUMN notified INTEGER NOT NULL DEFAULT 1",
      "ALTER TABLE trip_alert_candidates ADD COLUMN ord INTEGER NOT NULL DEFAULT 0",
      /* priority order (see planTier): tier 0 = Premium, 1 = Plus, 2 = Free; rel = seconds after the request
         when this driver's turn comes */
      "ALTER TABLE trip_alert_candidates ADD COLUMN tier INTEGER NOT NULL DEFAULT 2",
      "ALTER TABLE trip_alert_candidates ADD COLUMN rel INTEGER NOT NULL DEFAULT 0",
      /* current_lat/current_lon/current_location_at on travel_partners are
         normally added by partners.js's own migration, but this Worker
         instance may serve a broadcast/accept before partners.js has ever
         run, and both queries below read these columns - so the same safe,
         idempotent ALTER is repeated here too. */
      "ALTER TABLE travel_partners ADD COLUMN current_lat REAL",
      "ALTER TABLE travel_partners ADD COLUMN current_lon REAL",
      "ALTER TABLE travel_partners ADD COLUMN current_location_at TEXT",
      /* plan / plan_expires_at are read below to decide who still gets real road
         distance once the monthly free Google budget is used up. */
      "ALTER TABLE travel_partners ADD COLUMN plan TEXT",
      "ALTER TABLE travel_partners ADD COLUMN plan_expires_at TEXT",
    ]) {
      try { await env.DB.prepare(stmt).run(); } catch (e) { /* already exists */ }
    }
    try { await env.DB.prepare("INSERT OR REPLACE INTO app_flags (key, value) VALUES ('trip_alerts_schema', ?)").bind(SCHEMA).run(); } catch (e) {}
  }
  await ensureAbuse(env);
  ready = true;
}

/* Straight-line distance in KM (Haversine) - cheap, no API call, used only
   to decide which partners are worth asking Google's Routes API about. */
function haversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* Real driving distance (km) and duration (minutes) via Google's Routes
   API. Returns null (never throws) if the API key isn't configured, the
   call fails, or either point is missing - every caller falls back to
   the straight-line figure in that case, so a Google outage or a
   momentarily-missing key never breaks the trip-alert flow itself, it
   just makes the shown distance a little less precise. */
async function drivingRoute(env, lat1, lon1, lat2, lon2) {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: lat1, longitude: lon1 } } },
        destination: { location: { latLng: { latitude: lat2, longitude: lon2 } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) return null;
    const seconds = parseInt(String(route.duration || "0s").replace("s", ""), 10) || 0;
    return {
      distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
      durationMin: Math.round(seconds / 60),
    };
  } catch (e) {
    return null;
  }
}

/* ---------- GOOGLE ROUTES CALL BUDGET ----------
   Each real driving-distance lookup is a billable Google call, and one trip
   request makes one call per nearby driver. To keep the monthly bill at zero:
     - ROUTES_FREE_MONTHLY_LIMIT (default 300): after this many calls in a
       calendar month, only PREMIUM / Owner-Free drivers still get real road
       distance; everyone else gets the straight-line estimate instead.
     - ROUTES_HARD_MONTHLY_LIMIT (default 4000): after this, NOBODY triggers a
       Google call until next month (kept below Google's own free allowance).
   Trip alerts themselves are NEVER blocked by any of this - only how precise
   the shown distance/ETA is. Both limits can be changed any time as
   Cloudflare Worker variables, no code change needed. */
function monthKey() {
  return new Date().toISOString().slice(0, 7);
}
function envInt(v, dflt) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}
/* Premium (not yet expired) or Owner Free. An expired Premium counts as free. */
function isPremiumPlan(p) {
  if (!p) return false;
  if (p.plan === "owner_free") return true;
  if (p.plan !== "premium") return false;
  return !p.plan_expires_at || new Date(p.plan_expires_at).getTime() > Date.now();
}
/* Priority tier of a driver - the same grouping the Directory already uses:
   0 = Premium (running) or Owner Free, 1 = Plus / Paid (running) or Owner Plus, 2 = Free (or an expired plan). */
function planTier(p) {
  if (!p) return 2;
  if (p.plan === "owner_free") return 0;
  const running = !p.plan_expires_at || new Date(p.plan_expires_at).getTime() > Date.now();
  if (p.plan === "premium" && running) return 0;
  if (p.plan === "owner_plus") return 1;
  if (p.plan === "paid" && running) return 1;
  return 2;
}
/* seconds between the priority groups (Premium -> Plus -> Free); Cloudflare variable TRIP_TIER_DELAY_SEC, 0 = everybody at once */
function tierDelaySec(env) {
  return Math.min(10, envInt(env.TRIP_TIER_DELAY_SEC, 3));
}
function ageSec(iso) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 1000) : 0;
}
async function routeCallAllowed(env, isPremium) {
  const soft = envInt(env.ROUTES_FREE_MONTHLY_LIMIT, 300);
  const hard = envInt(env.ROUTES_HARD_MONTHLY_LIMIT, 4000);
  const limit = isPremium ? hard : Math.min(soft, hard);
  const month = monthKey();
  await env.DB.prepare("INSERT OR IGNORE INTO maps_usage (month, calls) VALUES (?, 0)").bind(month).run();
  /* One conditional UPDATE: only counts (and allows) the call if still under
     the limit - so concurrent requests cannot overshoot it. */
  const r = await env.DB
    .prepare("UPDATE maps_usage SET calls = calls + 1 WHERE month = ? AND calls < ?")
    .bind(month, limit)
    .run();
  return !!(r.meta && r.meta.changes > 0);
}

/* Best-effort real distance/time: tries the actual driving route first
   (while the monthly budget allows it for this driver's plan), falls back to
   straight-line (with a rough 28 km/h local-roads average for the duration
   estimate) otherwise - so a figure is always returned, just less precise
   without Google. */
async function bestRoute(env, lat1, lon1, lat2, lon2, isPremium) {
  let real = null;
  const canCall = env.GOOGLE_MAPS_API_KEY && lat1 != null && lon1 != null && lat2 != null && lon2 != null;
  if (canCall) {
    let allowed = false;
    try { allowed = await routeCallAllowed(env, !!isPremium); } catch (e) { allowed = false; }
    if (allowed) real = await drivingRoute(env, lat1, lon1, lat2, lon2);
  }
  if (real) return { ...real, estimated: false };
  const straight = haversineKm(lat1, lon1, lat2, lon2);
  if (straight == null) return null;
  return { distanceKm: Math.round(straight * 10) / 10, durationMin: Math.round((straight / 28) * 60), estimated: true };
}

async function expireIfDue(env, alert) {
  if (alert.status === "open" && new Date(alert.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("UPDATE trip_alerts SET status='expired' WHERE id=? AND status='open'").bind(alert.id).run();
    alert.status = "expired";
  }
  return alert;
}

/* ---------- BATCH SENDING (keeps every request under the Free-plan limit) ----------
   Cloudflare's Free plan allows only 50 database queries + outgoing calls per
   request, and every push to a phone is one outgoing call. So a request can
   safely push to only a few drivers at once. Instead of trying to alert
   everybody inside ONE request (the extra drivers would silently be skipped),
   the broadcast saves ALL drivers (nearest first, notified=0) and sends the
   first small batch at once; the customer's waiting screen already asks
   "status" every few seconds, and each of those requests (own fresh limit)
   sends the next batch - until every driver has been alerted.
   Safe to call from many requests at once: a driver is "claimed" with one
   atomic UPDATE, so nobody is pushed twice. */
const BATCH_DRIVERS = 8;        /* max drivers claimed per request */
const BATCH_PUSHES = 12;        /* max phones (devices) pushed per request */
const BATCH_ROUTES = 2;         /* max Google road-distance lookups per request */
const FIRST_DRIVERS = 5, FIRST_PUSHES = 6; /* the broadcast request itself has more other work to do */
const FIRST_ROUTES = 1;
/* All of these can be changed later as Cloudflare variables (TRIP_BATCH_DRIVERS, TRIP_BATCH_PUSHES) without a code change. */

async function notifyBatch(env, alert, opts) {
  const maxDrivers = (opts && opts.drivers) || Math.min(30, Math.max(1, envInt(env.TRIP_BATCH_DRIVERS, BATCH_DRIVERS)));
  const maxPushes = (opts && opts.pushes) || Math.min(30, Math.max(1, envInt(env.TRIP_BATCH_PUSHES, BATCH_PUSHES)));
  const maxRoutes = (opts && opts.routes != null) ? opts.routes : BATCH_ROUTES;
  const { results: rows } = await env.DB
    .prepare(
      `SELECT c.partner_id, c.distance_km, c.duration_min, p.mobile1, p.mobile2, p.plan, p.plan_expires_at,
              COALESCE(p.current_lat, p.lat) AS lat, COALESCE(p.current_lon, p.lon) AS lon
       FROM trip_alert_candidates c JOIN travel_partners p ON p.id = c.partner_id
       WHERE c.alert_id=? AND c.notified=0 AND c.rel<=? ORDER BY c.ord LIMIT ?`
    )
    .bind(alert.id, Math.floor(ageSec(alert.created_at)), maxDrivers)
    .all();
  if (!rows || !rows.length) return { sent: 0, claimed: 0 };

  /* all phones of these drivers in ONE query */
  const numbers = [...new Set(rows.flatMap((r) => [r.mobile1, r.mobile2]).filter(Boolean))];
  let subs = [];
  if (numbers.length) {
    const ph = numbers.map(() => "?").join(",");
    subs = ((await env.DB.prepare(`SELECT * FROM push_subscriptions WHERE mobile IN (${ph})`).bind(...numbers).all()).results) || [];
  }
  /* take drivers (nearest first) while the phone budget lasts; the rest wait for the next request */
  const pick = [];
  let phones = 0;
  for (const r of rows) {
    const mine = subs.filter((x) => x.mobile === r.mobile1 || x.mobile === r.mobile2);
    if (pick.length && phones + mine.length > maxPushes) break;
    r._subs = mine;
    phones += mine.length;
    pick.push(r);
  }
  /* claim them atomically - a driver claimed by a parallel request is skipped here */
  const ids = pick.map((r) => r.partner_id);
  const claim = await env.DB
    .prepare(`UPDATE trip_alert_candidates SET notified=1 WHERE alert_id=? AND notified=0 AND partner_id IN (${ids.map(() => "?").join(",")}) RETURNING partner_id`)
    .bind(alert.id, ...ids)
    .all();
  const mine = new Set(((claim && claim.results) || []).map((x) => x.partner_id));
  const send = pick.filter((r) => mine.has(r.partner_id));

  /* real road distance for the nearest few of this batch only (monthly Google budget still applies) */
  const hasPoint = alert.pickup_lat != null && alert.pickup_lon != null;
  let routed = 0;
  for (const r of send) {
    if (!hasPoint || routed >= maxRoutes || r.lat == null || r.lon == null) continue;
    routed++;
    const route = await bestRoute(env, r.lat, r.lon, alert.pickup_lat, alert.pickup_lon, isPremiumPlan(r));
    if (route && !route.estimated) {
      r.distance_km = route.distanceKm; r.duration_min = route.durationMin;
      await env.DB.prepare("UPDATE trip_alert_candidates SET distance_km=?, duration_min=? WHERE alert_id=? AND partner_id=?")
        .bind(r.distance_km, r.duration_min, alert.id, r.partner_id).run();
    }
  }

  const stale = [];
  let sent = 0;
  const tasks = [];
  for (const r of send) {
    const distText = r.distance_km != null ? `${r.distance_km} km away, ~${formatEta(r.duration_min)}` : "";
    const payload = {
      type: "trip_alert",
      alert_id: alert.id,
      title: "\ud83d\ude95 New trip request nearby",
      body: [alert.customer_name, distText, alert.pickup_text].filter(Boolean).join(" \u2022 "),
      tag: "tc-trip-" + alert.id,
    };
    for (const sub of r._subs) {
      sent++;
      tasks.push(
        sendWebPush(env, sub, payload).then((x) => { if (x && x.stale) stale.push(sub.endpoint); }).catch(() => { /* one device failing never stops the rest */ })
      );
    }
  }
  await Promise.all(tasks);
  if (stale.length) {
    try { await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint IN (${stale.map(() => "?").join(",")})`).bind(...stale).run(); } catch (e) {}
  }
  return { sent, claimed: send.length };
}

function formatEta(durationMin) {
  if (durationMin == null) return "";
  if (durationMin < 1) return "<1 min";
  return durationMin + " min" + (durationMin === 1 ? "" : "s");
}

export async function onRequestPost({ request, env, ctx }) {
  await ensure(env);
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const adminRes = (await abusePost(env, body)) || (await fallbackPost(env, body));
  if (adminRes) return adminRes;

  if (body.action === "broadcast") {
    const businessType = (body.business_type || "").trim();
    const customerName = (body.customer_name || "").trim();
    const customerMobile = (body.customer_mobile || "").trim();
    if (!businessType || !customerName || !customerMobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    /* Abuse limits (trip_abuse.js): blocked / too many requests / same request tapped twice */
    const device = String(body.device || "").slice(0, 80);
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const gate = await checkBroadcast(env, { mobile: customerMobile, device, ip, businessType, vclass: VCLASSES.includes(body.vclass) && businessType === "taxi_travel" ? body.vclass : null });
    if (!gate.ok) return Response.json({ ok: false, error: gate.error, retry_after_min: gate.retry_after_min || null }, { status: gate.status });
    if (gate.duplicate) return Response.json({ ok: true, alert_id: gate.duplicate.alert_id, notified_count: gate.duplicate.notified_count, duplicate: true });

    const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : null;
    const lon = body.lon != null && body.lon !== "" ? Number(body.lon) : null;
    const destinations = Array.isArray(body.destinations) ? body.destinations.map((d) => String(d).trim()).filter(Boolean).slice(0, 8) : [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ALERT_LIFETIME_MINUTES * 60000).toISOString();

    /* Travel Agency / Motor Cab / Contract Carriage / Auto / Goods - see trip_class.js */
    const vclass = VCLASSES.includes(body.vclass) && businessType === "taxi_travel" ? body.vclass : null;
    const partnersRes = { results: await eligiblePartners(env, businessType, vclass) };
    /* The person asking is never alerted about their own request - e.g. a
       business owner who taps "Nearby Vehicles" because they need another
       vehicle must not get the enquiry on their own phone. Compared by the
       last 10 digits so +91 / spaces don't matter. */
    const last10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
    const askerNum = last10(customerMobile);
    let candidates = (partnersRes.results || []).filter(
      (p) => !askerNum || (last10(p.mobile1) !== askerNum && last10(p.mobile2) !== askerNum)
    );
    if (lat != null && lon != null) {
      candidates = candidates
        .map((p) => ({ ...p, straight_km: haversineKm(lat, lon, p.lat, p.lon) }))
        .filter((p) => p.straight_km == null || p.straight_km <= RADIUS_KM)
        .sort((a, b) => (a.straight_km ?? 999) - (b.straight_km ?? 999));
    }

    const result = await env.DB
      .prepare(
        `INSERT INTO trip_alerts (business_type, customer_name, customer_mobile, pickup_lat, pickup_lon, pickup_text, destinations, message, status, notified_count, created_at, expires_at, vclass, mobile10, device, ip)
         VALUES (?,?,?,?,?,?,?,?,'open',?,?,?,?,?,?,?)`
      )
      .bind(
        businessType,
        customerName,
        customerMobile,
        lat,
        lon,
        (body.pickup_text || "").trim(),
        destinations.length ? JSON.stringify(destinations) : null,
        (body.message || "").trim(),
        candidates.length,
        now.toISOString(),
        expiresAt,
        vclass,
        last10Digits(customerMobile),
        device,
        ip
      )
      .run();
    const alertId = result.meta.last_row_id;

    /* Every driver is saved with a straight-line distance (nearest first) in ONE query, then the
       first small batch is pushed right now; the rest are pushed by the customer's status
       polls (notifyBatch) - so any number of drivers is reached without ever passing the
       Free-plan 50-call limit of a single request. Real road distance is looked up for the
       nearest few of each batch inside notifyBatch. */
    if (candidates.length) {
      /* Premium drivers first, then Plus, then Free (nearest first inside each group). A group that has no
         driver at all is skipped at once, so e.g. with no Premium driver the Plus drivers get it immediately. */
      const gap = tierDelaySec(env);
      candidates.forEach((p) => { p._tier = planTier(p); });
      candidates.sort((a, b) => a._tier - b._tier || (a.straight_km ?? 999) - (b.straight_km ?? 999));
      const present = [...new Set(candidates.map((p) => p._tier))].sort();
      const rowsJson = JSON.stringify(
        candidates.map((p, i) => {
          const km = p.straight_km != null ? Math.round(p.straight_km * 10) / 10 : null;
          return [p.id, km, km != null ? Math.round((km / 28) * 60) : null, i, p._tier, present.indexOf(p._tier) * gap];
        })
      );
      try {
        await env.DB
          .prepare(
            `INSERT OR REPLACE INTO trip_alert_candidates (alert_id, partner_id, distance_km, duration_min, notified, ord, tier, rel)
             SELECT ?, json_extract(value,'$[0]'), json_extract(value,'$[1]'), json_extract(value,'$[2]'), 0, json_extract(value,'$[3]'), json_extract(value,'$[4]'), json_extract(value,'$[5]') FROM json_each(?)`
          )
          .bind(alertId, rowsJson)
          .run();
      } catch (e) {
        /* safety net: plain multi-row insert, 16 drivers per query */
        const all = JSON.parse(rowsJson);
        for (let i = 0; i < all.length; i += 16) {
          const part = all.slice(i, i + 16);
          await env.DB
            .prepare(`INSERT OR REPLACE INTO trip_alert_candidates (alert_id, partner_id, distance_km, duration_min, notified, ord, tier, rel) VALUES ${part.map(() => "(?,?,?,?,0,?,?,?)").join(",")}`)
            .bind(...part.flatMap((r) => [alertId, r[0], r[1], r[2], r[3], r[4], r[5]]))
            .run();
        }
      }
      const first = { id: alertId, created_at: now.toISOString(), customer_name: customerName, pickup_text: (body.pickup_text || "").trim(), pickup_lat: lat, pickup_lon: lon };
      try {
        await notifyBatch(env, first, { drivers: FIRST_DRIVERS, pushes: FIRST_PUSHES, routes: FIRST_ROUTES });
      } catch (e) { /* the status polls will retry the rest */ }
    }

    return Response.json({ ok: true, alert_id: alertId, notified_count: candidates.length });
  }

  if (body.action === "accept") {
    const alertId = Number(body.alert_id);
    const partnerId = Number(body.partner_id);
    const mobile = (body.mobile || "").trim();
    if (!alertId || !partnerId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });

    const partner = await env.DB.prepare("SELECT id, business_name, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(partnerId).first();
    if (!partner || (partner.mobile1 !== mobile && partner.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    let alert = await env.DB.prepare("SELECT * FROM trip_alerts WHERE id=?").bind(alertId).first();
    if (!alert) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    alert = await expireIfDue(env, alert);
    if (alert.status !== "open") {
      return Response.json({ ok: true, accepted: false, reason: alert.status === "accepted" ? "already_taken" : "expired" });
    }
    if (alert.vclass && !(await partnerMatches(env, partnerId, alert.business_type, alert.vclass))) {
      return Response.json({ ok: false, error: "not_eligible" }, { status: 403 });
    }

    const candidate = await env.DB.prepare("SELECT distance_km, duration_min FROM trip_alert_candidates WHERE alert_id=? AND partner_id=?").bind(alertId, partnerId).first();

    const update = await env.DB
      .prepare("UPDATE trip_alerts SET status='accepted', accepted_partner_id=?, accepted_distance_km=?, accepted_duration_min=? WHERE id=? AND status='open'")
      .bind(partnerId, candidate ? candidate.distance_km : null, candidate ? candidate.duration_min : null, alertId)
      .run();
    const won = (update.meta.changes || 0) > 0;
    if (!won) {
      return Response.json({ ok: true, accepted: false, reason: "already_taken" });
    }

    const notifyCustomer = (async () => {
      try {
        const etaText = candidate ? `${candidate.distance_km} km away, ~${formatEta(candidate.duration_min)}` : "";
        const { results: subs } = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE mobile=?").bind(alert.customer_mobile).all();
        await Promise.all(
          subs.map((sub) =>
            sendWebPush(env, sub, {
              type: "trip_alert_accepted",
              alert_id: alertId,
              title: "\u2705 " + partner.business_name + " accepted your trip",
              body: [etaText, "Call " + (partner.mobile1 || partner.mobile2) + " to confirm."].filter(Boolean).join(" \u2022 "),
              tag: "tc-trip-" + alertId,
            }).catch(() => {})
          )
        );
      } catch (e) {}
    })();
    if (ctx && ctx.waitUntil) ctx.waitUntil(notifyCustomer);
    else await notifyCustomer;

    return Response.json({
      ok: true,
      accepted: true,
      partner: { id: partner.id, business_name: partner.business_name, mobile1: partner.mobile1, mobile2: partner.mobile2 },
      /* The customer's number is handed over only to the driver who actually
         won the trip, so they can call the customer. */
      customer: { name: alert.customer_name, mobile: alert.customer_mobile },
      distance_km: candidate ? candidate.distance_km : null,
      duration_min: candidate ? candidate.duration_min : null,
    });
  }

  if (body.action === "cancel") {
    const alertId = Number(body.alert_id);
    const mobile = (body.mobile || "").trim();
    if (!alertId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const alert = await env.DB.prepare("SELECT customer_mobile, status FROM trip_alerts WHERE id=?").bind(alertId).first();
    if (!alert) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (alert.customer_mobile !== mobile) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    await env.DB.prepare("UPDATE trip_alerts SET status='cancelled' WHERE id=? AND status='open'").bind(alertId).run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

export async function onRequestGet({ request, env }) {
  await ensure(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const adminRes = (await abuseGet(env, action, url)) || (await fallbackGet(env, action, url));
  if (adminRes) return adminRes;

  if (action === "status") {
    const alertId = Number(url.searchParams.get("alert_id"));
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!alertId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    let alert = await env.DB
      .prepare("SELECT a.*, (SELECT COUNT(*) FROM trip_alert_candidates c WHERE c.alert_id=a.id AND c.notified=0) AS waiting_push FROM trip_alerts a WHERE a.id=?")
      .bind(alertId)
      .first();
    if (!alert) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (alert.customer_mobile !== mobile) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    alert = await expireIfDue(env, alert);
    /* drivers not yet pushed (see notifyBatch): this poll sends the next batch */
    let waitingPush = alert.waiting_push || 0;
    if (alert.status === "open" && waitingPush > 0) {
      try {
        const r = await notifyBatch(env, alert);
        waitingPush = Math.max(0, waitingPush - r.claimed);
      } catch (e) { /* next poll retries */ }
    }
    let partner = null;
    if (alert.status === "accepted" && alert.accepted_partner_id) {
      partner = await env.DB.prepare("SELECT id, business_name, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(alert.accepted_partner_id).first();
    }
    return Response.json({
      ok: true,
      status: alert.status,
      notified_count: alert.notified_count,
      waiting_push: waitingPush,
      partner,
      distance_km: alert.accepted_distance_km,
      duration_min: alert.accepted_duration_min,
    });
  }

  if (action === "pending_for_partner") {
    const partnerId = Number(url.searchParams.get("partner_id"));
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!partnerId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const partner = await env.DB.prepare("SELECT id, business_type, mobile1, mobile2, COALESCE(current_lat, lat) AS lat, COALESCE(current_lon, lon) AS lon FROM travel_partners WHERE id=?").bind(partnerId).first();
    if (!partner || (partner.mobile1 !== mobile && partner.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const { results } = await env.DB
      .prepare("SELECT * FROM trip_alerts WHERE business_type=? AND status='open' ORDER BY created_at DESC LIMIT 20")
      .bind(partner.business_type)
      .all();
    const now = Date.now();
    const open = [];
    const l10 = (v) => String(v || "").replace(/\D/g, "").slice(-10);
    for (const a of results) {
      if (new Date(a.expires_at).getTime() < now) {
        await env.DB.prepare("UPDATE trip_alerts SET status='expired' WHERE id=? AND status='open'").bind(a.id).run();
        continue;
      }
      /* never show a business its own request */
      if (l10(a.customer_mobile) && (l10(a.customer_mobile) === l10(partner.mobile1) || l10(a.customer_mobile) === l10(partner.mobile2))) continue;
      /* Cab / Carriage alerts only for businesses that really have a matching verified vehicle */
      if (a.vclass && !(await partnerMatches(env, partnerId, a.business_type, a.vclass))) continue;
      const candidate = await env.DB.prepare("SELECT distance_km, duration_min, notified, rel FROM trip_alert_candidates WHERE alert_id=? AND partner_id=?").bind(a.id, partnerId).first();
      /* Premium -> Plus -> Free: a driver whose turn has not come yet does not see the request in the app either */
      if (candidate && candidate.notified === 0 && candidate.rel > ageSec(a.created_at)) continue;
      const { customer_mobile: _hidden, ...aSafe } = a; /* number only revealed after Accept */
      open.push({
        ...aSafe,
        destinations: a.destinations ? JSON.parse(a.destinations) : [],
        distance_km: candidate ? candidate.distance_km : null,
        duration_min: candidate ? candidate.duration_min : null,
      });
    }
    return Response.json({ ok: true, alerts: open });
  }

  /* Admin-only diagnostic: shows exactly which partners of a category
     would be candidates for a broadcast right now, and - for every
     OTHER partner of that same category who did NOT qualify - exactly
     which condition excluded them (not verified, not Active, or outside
     the radius). Nothing here sends a real alert or a push; it only
     reports what a real broadcast from the given lat/lon would see,
     so a specific "why isn't my test account receiving this" case can
     be diagnosed from the data itself instead of guessing blind. */
  /* Admin-only diagnostic: every travel_partners row tied to a mobile
     number, regardless of category, verified status, or anything else -
     a direct ground-truth answer to "how many businesses does this
     number actually have, and what category is each one really filed
     under", for exactly the situation a person scrolling an admin list
     by eye can miss an entry whose category or name isn't what they
     expect to see. */
  /* Admin: how many Google Routes calls this month vs the limits. */
  if (action === "maps_usage") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const row = await env.DB.prepare("SELECT calls FROM maps_usage WHERE month=?").bind(monthKey()).first();
    return Response.json({
      ok: true,
      month: monthKey(),
      calls: row ? row.calls : 0,
      free_limit: envInt(env.ROUTES_FREE_MONTHLY_LIMIT, 300),
      hard_limit: envInt(env.ROUTES_HARD_MONTHLY_LIMIT, 4000),
    });
  }

  if (action === "debug_mobile") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const { results } = await env.DB
      .prepare("SELECT id, business_name, business_type, business_subtype, mobile1, mobile2, verified, available, created_at FROM travel_partners WHERE mobile1=? OR mobile2=?")
      .bind(mobile, mobile)
      .all();
    return Response.json({ ok: true, mobile, count: results.length, partners: results });
  }

  if (action === "debug_candidates") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const businessType = (url.searchParams.get("business_type") || "").trim();
    if (!businessType) return Response.json({ ok: false, error: "missing_business_type" }, { status: 400 });
    const lat = url.searchParams.get("lat") != null && url.searchParams.get("lat") !== "" ? Number(url.searchParams.get("lat")) : null;
    const lon = url.searchParams.get("lon") != null && url.searchParams.get("lon") !== "" ? Number(url.searchParams.get("lon")) : null;
    const { results } = await env.DB
      .prepare(
        "SELECT id, business_name, mobile1, mobile2, verified, available, lat, lon, current_lat, current_lon, current_location_at FROM travel_partners WHERE business_type=?"
      )
      .bind(businessType)
      .all();
    const report = results.map((p) => {
      const effLat = p.current_lat != null ? p.current_lat : p.lat;
      const effLon = p.current_lon != null ? p.current_lon : p.lon;
      const straightKm = lat != null && lon != null ? haversineKm(lat, lon, effLat, effLon) : null;
      const reasons = [];
      if (!p.verified) reasons.push("not verified");
      if (!p.available) reasons.push("not marked Active");
      if (lat != null && lon != null && straightKm != null && straightKm > RADIUS_KM) reasons.push("outside " + RADIUS_KM + " km radius (" + straightKm.toFixed(1) + " km away)");
      if (lat != null && lon != null && effLat == null) reasons.push("no location pinned at all (treated as unknown distance, NOT excluded by radius)");
      return {
        id: p.id,
        business_name: p.business_name,
        mobile1: p.mobile1,
        mobile2: p.mobile2,
        verified: !!p.verified,
        available: !!p.available,
        using_live_location: p.current_lat != null,
        lat: effLat,
        lon: effLon,
        location_updated_at: p.current_location_at,
        straight_line_km: straightKm != null ? Math.round(straightKm * 10) / 10 : null,
        would_be_notified: reasons.length === 0,
        excluded_because: reasons,
      };
    });
    return Response.json({ ok: true, business_type: businessType, query_lat: lat, query_lon: lon, radius_km: RADIUS_KM, partners: report });
  }

  /* A customer's own past requests - every one they've ever sent, newest
     first, with its outcome (who accepted, or why it never got picked
     up). No authorization beyond matching mobile is needed since this
     only ever reads what that mobile itself created. */
  if (action === "my_history") {
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const { results } = await env.DB
      .prepare(
        `SELECT ta.id, ta.business_type, ta.vclass, ta.customer_name, ta.pickup_text, ta.destinations, ta.status, ta.notified_count, ta.created_at,
                ta.accepted_partner_id, ta.accepted_distance_km, ta.accepted_duration_min, p.business_name AS accepted_business_name, p.mobile1 AS accepted_mobile1
         FROM trip_alerts ta
         LEFT JOIN travel_partners p ON p.id = ta.accepted_partner_id
         WHERE ta.customer_mobile=?
         ORDER BY ta.created_at DESC
         LIMIT 50`
      )
      .bind(mobile)
      .all();
    const history = results.map((r) => ({
      ...r,
      destinations: r.destinations ? JSON.parse(r.destinations) : [],
    }));
    return Response.json({ ok: true, history });
  }

  /* A partner's own history - every alert they were ever a candidate
     for, newest first, each tagged with what actually happened: they
     themselves accepted it, someone else got there first (a genuinely
     missed trip), or nobody claimed it before it expired. The summary
     counts exist specifically so "how many trips am I missing" has a
     direct answer instead of needing to count rows by eye. */
  if (action === "partner_history") {
    const partnerId = Number(url.searchParams.get("partner_id"));
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!partnerId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const partner = await env.DB.prepare("SELECT id, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(partnerId).first();
    if (!partner || (partner.mobile1 !== mobile && partner.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const { results } = await env.DB
      .prepare(
        `SELECT ta.id, ta.customer_name, ta.pickup_text, ta.destinations, ta.status, ta.created_at, ta.accepted_partner_id,
                tac.distance_km, tac.duration_min
         FROM trip_alert_candidates tac
         JOIN trip_alerts ta ON ta.id = tac.alert_id
         WHERE tac.partner_id=?
         ORDER BY ta.created_at DESC
         LIMIT 50`
      )
      .bind(partnerId)
      .all();
    let acceptedByYou = 0, missed = 0, unclaimed = 0;
    const history = results.map((r) => {
      let outcome;
      if (r.status === "accepted" && r.accepted_partner_id === partnerId) { outcome = "accepted_by_you"; acceptedByYou++; }
      else if (r.status === "accepted") { outcome = "missed"; missed++; }
      else if (r.status === "expired") { outcome = "unclaimed"; unclaimed++; }
      else if (r.status === "cancelled") { outcome = "cancelled"; }
      else { outcome = "open"; }
      return { ...r, destinations: r.destinations ? JSON.parse(r.destinations) : [], outcome };
    });
    return Response.json({ ok: true, summary: { total: results.length, accepted_by_you: acceptedByYou, missed, unclaimed }, history });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
