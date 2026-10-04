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

const RADIUS_KM = 15; // straight-line pre-filter only, not what's shown
const ALERT_LIFETIME_MINUTES = 10;

let ready = false;
async function ensure(env) {
  if (ready) return;
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
      PRIMARY KEY (alert_id, partner_id)
    )`
  ).run();
  /* Safe to run against a DB from before destinations/accepted_distance_km
     existed - SQLite has no "ADD COLUMN IF NOT EXISTS", so each is simply
     attempted and the harmless "already exists" error is swallowed. */
  for (const stmt of [
    "ALTER TABLE trip_alerts ADD COLUMN destinations TEXT",
    "ALTER TABLE trip_alerts ADD COLUMN accepted_distance_km REAL",
    "ALTER TABLE trip_alerts ADD COLUMN accepted_duration_min REAL",
    /* current_lat/current_lon/current_location_at on travel_partners are
       normally added by partners.js's own migration, but this Worker
       instance may serve a broadcast/accept before partners.js has ever
       run, and both queries below read these columns - so the same safe,
       idempotent ALTER is repeated here too. */
    "ALTER TABLE travel_partners ADD COLUMN current_lat REAL",
    "ALTER TABLE travel_partners ADD COLUMN current_lon REAL",
    "ALTER TABLE travel_partners ADD COLUMN current_location_at TEXT",
  ]) {
    try { await env.DB.prepare(stmt).run(); } catch (e) { /* already exists */ }
  }
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

/* Best-effort real distance/time: tries the actual driving route first,
   falls back to straight-line (with a rough 28 km/h local-roads average
   for the duration estimate) only if Google can't be reached - so a
   figure is always returned, just less precise without Google. */
async function bestRoute(env, lat1, lon1, lat2, lon2) {
  const real = await drivingRoute(env, lat1, lon1, lat2, lon2);
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

async function pushToPartner(env, partner, payload) {
  const numbers = [partner.mobile1, partner.mobile2].filter(Boolean);
  if (!numbers.length) return;
  const ph = numbers.map(() => "?").join(",");
  const { results: subs } = await env.DB.prepare(`SELECT * FROM push_subscriptions WHERE mobile IN (${ph})`).bind(...numbers).all();
  await Promise.all(
    subs.map(async (sub) => {
      try {
        const r = await sendWebPush(env, sub, payload);
        if (r.stale) await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
      } catch (e) {
        /* one device failing to receive a push should never break the rest */
      }
    })
  );
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

  if (body.action === "broadcast") {
    const businessType = (body.business_type || "").trim();
    const customerName = (body.customer_name || "").trim();
    const customerMobile = (body.customer_mobile || "").trim();
    if (!businessType || !customerName || !customerMobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : null;
    const lon = body.lon != null && body.lon !== "" ? Number(body.lon) : null;
    const destinations = Array.isArray(body.destinations) ? body.destinations.map((d) => String(d).trim()).filter(Boolean).slice(0, 8) : [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ALERT_LIFETIME_MINUTES * 60000).toISOString();

    const partnersRes = await env.DB
      .prepare("SELECT id, business_name, mobile1, mobile2, COALESCE(current_lat, lat) AS lat, COALESCE(current_lon, lon) AS lon FROM travel_partners WHERE business_type=? AND verified=1 AND available=1")
      .bind(businessType)
      .all();
    let candidates = partnersRes.results || [];
    if (lat != null && lon != null) {
      candidates = candidates
        .map((p) => ({ ...p, straight_km: haversineKm(lat, lon, p.lat, p.lon) }))
        .filter((p) => p.straight_km == null || p.straight_km <= RADIUS_KM)
        .sort((a, b) => (a.straight_km ?? 999) - (b.straight_km ?? 999));
    }

    const result = await env.DB
      .prepare(
        `INSERT INTO trip_alerts (business_type, customer_name, customer_mobile, pickup_lat, pickup_lon, pickup_text, destinations, message, status, notified_count, created_at, expires_at)
         VALUES (?,?,?,?,?,?,?,?,'open',?,?,?)`
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
        expiresAt
      )
      .run();
    const alertId = result.meta.last_row_id;

    /* Real driving distance/time is computed ONCE here, per candidate, and
       stored - every later read (the Accept prompt re-opened, the
       customer's status poll) reuses this instead of calling Google
       again for the same pair of points. */
    const work = Promise.all(
      candidates.map(async (p) => {
        const route = (lat != null && lon != null) ? await bestRoute(env, p.lat, p.lon, lat, lon) : null;
        if (route) {
          await env.DB
            .prepare(`INSERT OR REPLACE INTO trip_alert_candidates (alert_id, partner_id, distance_km, duration_min) VALUES (?,?,?,?)`)
            .bind(alertId, p.id, route.distanceKm, route.durationMin)
            .run();
        }
        const distText = route ? `${route.distanceKm} km away, ~${formatEta(route.durationMin)}` : "";
        return pushToPartner(env, p, {
          type: "trip_alert",
          alert_id: alertId,
          title: "\ud83d\ude95 New trip request nearby",
          body: [customerName, distText, body.pickup_text].filter(Boolean).join(" \u2022 "),
          tag: "tc-trip-" + alertId,
        });
      })
    );
    if (ctx && ctx.waitUntil) ctx.waitUntil(work);
    else await work;

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

  if (action === "status") {
    const alertId = Number(url.searchParams.get("alert_id"));
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!alertId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    let alert = await env.DB.prepare("SELECT * FROM trip_alerts WHERE id=?").bind(alertId).first();
    if (!alert) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (alert.customer_mobile !== mobile) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    alert = await expireIfDue(env, alert);
    let partner = null;
    if (alert.status === "accepted" && alert.accepted_partner_id) {
      partner = await env.DB.prepare("SELECT id, business_name, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(alert.accepted_partner_id).first();
    }
    return Response.json({
      ok: true,
      status: alert.status,
      notified_count: alert.notified_count,
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
    for (const a of results) {
      if (new Date(a.expires_at).getTime() < now) {
        await env.DB.prepare("UPDATE trip_alerts SET status='expired' WHERE id=? AND status='open'").bind(a.id).run();
        continue;
      }
      const candidate = await env.DB.prepare("SELECT distance_km, duration_min FROM trip_alert_candidates WHERE alert_id=? AND partner_id=?").bind(a.id, partnerId).first();
      open.push({
        ...a,
        destinations: a.destinations ? JSON.parse(a.destinations) : [],
        distance_km: candidate ? candidate.distance_km : null,
        duration_min: candidate ? candidate.duration_min : null,
      });
    }
    return Response.json({ ok: true, alerts: open });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
