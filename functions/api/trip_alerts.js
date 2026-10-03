/* functions/api/trip_alerts.js
   The "Kerala Safari style" dispatch flow: a customer searching for a
   nearby Taxi/Auto/Pickup-Goods vehicle sends ONE alert; every currently
   Active, verified partner of that category nearby gets a push
   notification at the same time; whichever one taps Accept FIRST gets
   the trip, and the rest simply stop seeing it as available. The
   customer and the accepting partner then talk directly (call/message)
   to finalise - this backend only handles the "who gets it" race, never
   the trip itself.

   Nearness here is straight-line (Haversine) distance from the partner's
   own registered location to the customer's current GPS position - no
   Google API call needed for this filtering step, so it costs nothing
   even at high volume. The Google Maps key (now configured) is for
   drawing the actual map pins on screen, a separate, purely visual
   concern from this matching logic. */

import { sendWebPush } from "./_webpush.js";

const RADIUS_KM = 15;
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
      message TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      accepted_partner_id INTEGER,
      notified_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`
  ).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_trip_alerts_status ON trip_alerts (status, created_at)").run();
  ready = true;
}

/* Straight-line distance in KM between two lat/lon points (the standard
   Haversine formula) - plenty accurate for "which driver is roughly
   nearby", and needs no external API call. */
function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* Open alerts older than their own expiry are flipped to 'expired' here,
   the same lazy/opportunistic way messages.js ages out old rows - no
   separate scheduled job needed. Returns the alert as it now stands. */
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
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ALERT_LIFETIME_MINUTES * 60000).toISOString();

    const partnersRes = await env.DB
      .prepare("SELECT id, business_name, mobile1, mobile2, lat, lon FROM travel_partners WHERE business_type=? AND verified=1 AND available=1")
      .bind(businessType)
      .all();
    let candidates = partnersRes.results || [];
    if (lat != null && lon != null) {
      candidates = candidates
        .map((p) => ({ ...p, distance_km: distanceKm(lat, lon, p.lat, p.lon) }))
        .filter((p) => p.distance_km == null || p.distance_km <= RADIUS_KM)
        .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    }
    /* No candidates at all (no Active partners of this category right
       now) is still a valid, expected outcome - the alert is still
       created so the customer gets a clear "nobody available" message
       rather than a confusing silent failure. */
    const result = await env.DB
      .prepare(
        `INSERT INTO trip_alerts (business_type, customer_name, customer_mobile, pickup_lat, pickup_lon, pickup_text, message, status, notified_count, created_at, expires_at)
         VALUES (?,?,?,?,?,?,?,'open',?,?,?)`
      )
      .bind(businessType, customerName, customerMobile, lat, lon, (body.pickup_text || "").trim(), (body.message || "").trim(), candidates.length, now.toISOString(), expiresAt)
      .run();
    const alertId = result.meta.last_row_id;

    const work = Promise.all(
      candidates.map((p) =>
        pushToPartner(env, p, {
          type: "trip_alert",
          alert_id: alertId,
          title: "\ud83d\ude95 New trip request nearby",
          body: customerName + (p.distance_km != null ? " \u2022 " + p.distance_km.toFixed(1) + " km away" : "") + (body.pickup_text ? " \u2022 " + body.pickup_text : ""),
          tag: "tc-trip-" + alertId,
        })
      )
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

    /* The race is settled by this single conditional UPDATE: only the
       request that actually flips status from 'open' changes a row -
       everyone else who tries a moment later gets 0 rows changed and
       learns, correctly, that someone beat them to it. No separate lock
       or transaction needed; SQLite serialises writes to one row anyway. */
    const update = await env.DB
      .prepare("UPDATE trip_alerts SET status='accepted', accepted_partner_id=? WHERE id=? AND status='open'")
      .bind(partnerId, alertId)
      .run();
    const won = (update.meta.changes || 0) > 0;
    if (!won) {
      return Response.json({ ok: true, accepted: false, reason: "already_taken" });
    }

    const notifyCustomer = (async () => {
      try {
        const { results: subs } = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE mobile=?").bind(alert.customer_mobile).all();
        await Promise.all(
          subs.map((sub) =>
            sendWebPush(env, sub, {
              type: "trip_alert_accepted",
              alert_id: alertId,
              title: "\u2705 " + partner.business_name + " accepted your trip",
              body: "Call " + (partner.mobile1 || partner.mobile2) + " to confirm pickup details.",
              tag: "tc-trip-" + alertId,
            }).catch(() => {})
          )
        );
      } catch (e) {}
    })();
    if (ctx && ctx.waitUntil) ctx.waitUntil(notifyCustomer);
    else await notifyCustomer;

    return Response.json({ ok: true, accepted: true, partner: { id: partner.id, business_name: partner.business_name, mobile1: partner.mobile1, mobile2: partner.mobile2 } });
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
    return Response.json({ ok: true, status: alert.status, notified_count: alert.notified_count, partner });
  }

  /* A partner's own pending alerts, newest first - for reopening the
     Accept/Decline prompt if they dismissed the notification or their
     device missed the push outright (poor signal, battery saver etc). */
  if (action === "pending_for_partner") {
    const partnerId = Number(url.searchParams.get("partner_id"));
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!partnerId || !mobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const partner = await env.DB.prepare("SELECT id, business_type, mobile1, mobile2, lat, lon FROM travel_partners WHERE id=?").bind(partnerId).first();
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
      open.push({
        ...a,
        distance_km: distanceKm(partner.lat, partner.lon, a.pickup_lat, a.pickup_lon),
      });
    }
    return Response.json({ ok: true, alerts: open });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
