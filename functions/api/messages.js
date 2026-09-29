/* functions/api/messages.js
   Simple in-app messages between a customer and a business (partner).
   One conversation = one customer mobile + one partner. A customer
   starts it from the Local Directory / Active Vehicles Board; the
   business sees it under Messages and can reply. Text only (max 500
   characters), optionally with the customer's shared location.

   Identity here works the same way as the rest of the app (self-declared
   name + mobile, not OTP-verified): a partner can only read/reply to
   conversations for a business their mobile is registered on, and a
   customer can only read their own. Basic limits stop spam: a partner
   can only reply to someone who wrote first, and each side is limited
   to a number of messages per hour. */

import { sendWebPush } from "./_webpush.js";

/* Sends a push notification (works with the app closed / phone locked) to
   every device registered under the given mobile numbers. Uses the same
   subscription table and VAPID keys as the SOS alerts. count = how many
   unread messages that person now has in total, so the phone can show it
   on the app icon. Never throws - a failed push must not fail the message
   itself. */
async function unreadTotal(env, mobile) {
  const pu = await env.DB
    .prepare(
      `SELECT COUNT(*) AS c FROM messages m JOIN travel_partners p ON m.partner_id=p.id
       WHERE m.from_customer=1 AND m.read_at IS NULL AND (p.mobile1=? OR p.mobile2=?)`
    )
    .bind(mobile, mobile)
    .first();
  const cu = await env.DB
    .prepare("SELECT COUNT(*) AS c FROM messages WHERE from_customer=0 AND read_at IS NULL AND customer_mobile=?")
    .bind(mobile)
    .first();
  return (pu ? pu.c : 0) + (cu ? cu.c : 0);
}

async function pushToMobiles(env, mobiles, buildPayload) {
  if (!env.VAPID_PRIVATE_JWK) return;
  try {
    const uniq = [...new Set(mobiles.filter(Boolean))];
    for (const mobile of uniq) {
      const { results: subs } = await env.DB
        .prepare("SELECT * FROM push_subscriptions WHERE mobile=?")
        .bind(mobile)
        .all();
      if (!subs.length) continue;
      const payload = buildPayload(await unreadTotal(env, mobile));
      await Promise.all(
        subs.map(async (sub) => {
          let result;
          try {
            const r = await sendWebPush(env, sub, payload);
            result = { ok: r.ok ? 1 : 0, status_code: r.statusCode, error: null };
            if (r.stale) {
              await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
            }
          } catch (e) {
            result = { ok: 0, status_code: null, error: String(e && e.stack ? e.stack : e).slice(0, 500) };
          }
          try {
            await env.DB
              .prepare("INSERT INTO push_debug_log (endpoint, ok, status_code, error, created_at) VALUES (?,?,?,?,?)")
              .bind(sub.endpoint.slice(0, 100), result.ok, result.status_code, result.error, new Date().toISOString())
              .run();
          } catch (e) { /* debug log is best-effort */ }
        })
      );
    }
  } catch (e) {
    console.error("message push failed", String(e && e.stack ? e.stack : e));
  }
}

let ready = false;

/* Both messages and SOS alerts are kept for 90 days then permanently
   deleted - long enough to settle a dispute ("did this customer actually
   contact me?"), short enough not to grow forever. There is no separate
   scheduled job for this (Cloudflare Cron Triggers need dashboard/
   wrangler.toml setup outside what can be pushed as a plain file commit) -
   instead, cleanup runs opportunistically on a small fraction of requests
   here, which keeps both tables trimmed without adding cost to every
   single call. Safe to run concurrently / repeatedly - it is just a
   DELETE ... WHERE, a no-op once nothing is old enough. */
const RETENTION_DAYS = 90;
async function cleanupOld(env) {
  if (Math.random() >= 0.02) return; // runs on ~1 in 50 requests
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  try {
    await env.DB.prepare("DELETE FROM messages WHERE created_at < ?").bind(cutoff).run();
    await env.DB.prepare("DELETE FROM sos_alerts WHERE created_at < ?").bind(cutoff).run();
  } catch (e) {
    /* sos_alerts may not exist yet on a brand new DB - never let cleanup
       break an actual request. */
  }
}

async function ensure(env) {
  if (ready) {
    await cleanupOld(env);
    return;
  }
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      customer_mobile TEXT NOT NULL,
      customer_name TEXT,
      from_customer INTEGER NOT NULL,
      body TEXT NOT NULL,
      lat REAL,
      lon REAL,
      created_at TEXT NOT NULL,
      read_at TEXT
    )`
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (partner_id, customer_mobile)"
  ).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at)").run();
  /* "Delete chat" (see tcHideConversation below) only hides a conversation
     from ONE side's own inbox list - the other party's copy, and the
     actual message rows, are untouched. hidden_before_id is the newest
     message id that existed at the moment they hid it; the inbox query
     un-hides the conversation again as soon as a message newer than that
     arrives, so deleting a chat can never make a later reply disappear. */
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS message_hidden (
      partner_id INTEGER NOT NULL,
      customer_mobile TEXT NOT NULL,
      viewer TEXT NOT NULL,
      hidden_before_id INTEGER NOT NULL,
      PRIMARY KEY (partner_id, customer_mobile, viewer)
    )`
  ).run();
  ready = true;
  await cleanupOld(env);
}

const MAX_LEN = 500;
const CUSTOMER_PER_HOUR = 30;
const PARTNER_PER_HOUR = 60;

function isPartnerNumber(partner, mobile) {
  return !!mobile && (partner.mobile1 === mobile || partner.mobile2 === mobile);
}

export async function onRequestPost({ request, env, ctx }) {
  await ensure(env);
  let b;
  try {
    b = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (b.action === "hide") {
    const partnerId = Number(b.partner_id);
    const customerMobile = (b.customer_mobile || "").toString().trim();
    const viewer = b.viewer === "partner" ? "partner" : b.viewer === "customer" ? "customer" : null;
    const mobile = (b.mobile || "").toString().trim();
    if (!partnerId || !customerMobile || !viewer || !mobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const partner = await env.DB.prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?").bind(partnerId).first();
    if (!partner) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (viewer === "partner" && !isPartnerNumber(partner, mobile)) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    if (viewer === "customer" && mobile !== customerMobile) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    const last = await env.DB
      .prepare("SELECT MAX(id) AS id FROM messages WHERE partner_id=? AND customer_mobile=?")
      .bind(partnerId, customerMobile)
      .first();
    await env.DB
      .prepare(
        `INSERT INTO message_hidden (partner_id, customer_mobile, viewer, hidden_before_id) VALUES (?,?,?,?)
         ON CONFLICT(partner_id, customer_mobile, viewer) DO UPDATE SET hidden_before_id=excluded.hidden_before_id`
      )
      .bind(partnerId, customerMobile, viewer, (last && last.id) || 0)
      .run();
    return Response.json({ ok: true });
  }

  if (b.action !== "send") return Response.json({ ok: false, error: "unknown_action" });

  const partnerId = Number(b.partner_id);
  const body = (b.body || "").toString().trim();
  const senderMobile = (b.sender_mobile || "").toString().trim();
  const customerMobile = (b.customer_mobile || "").toString().trim();
  if (!partnerId || !body || !senderMobile || !customerMobile) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (body.length > MAX_LEN) return Response.json({ ok: false, error: "too_long" }, { status: 400 });

  const partner = await env.DB
    .prepare("SELECT id, business_name, mobile1, mobile2, verified FROM travel_partners WHERE id=?")
    .bind(partnerId)
    .first();
  if (!partner) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  const fromCustomer = b.from_customer ? 1 : 0;
  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();

  if (fromCustomer) {
    if (senderMobile !== customerMobile) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    if (isPartnerNumber(partner, senderMobile)) return Response.json({ ok: false, error: "cannot_message_self" }, { status: 400 });
    if (!partner.verified) return Response.json({ ok: false, error: "not_available" }, { status: 403 });
    const recent = await env.DB
      .prepare("SELECT COUNT(*) AS c FROM messages WHERE from_customer=1 AND customer_mobile=? AND created_at>?")
      .bind(customerMobile, hourAgo)
      .first();
    if (recent && recent.c >= CUSTOMER_PER_HOUR) return Response.json({ ok: false, error: "too_many" }, { status: 429 });
  } else {
    if (!isPartnerNumber(partner, senderMobile)) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    const started = await env.DB
      .prepare("SELECT 1 AS x FROM messages WHERE partner_id=? AND customer_mobile=? AND from_customer=1 LIMIT 1")
      .bind(partnerId, customerMobile)
      .first();
    if (!started) return Response.json({ ok: false, error: "no_conversation" }, { status: 400 });
    const recent = await env.DB
      .prepare("SELECT COUNT(*) AS c FROM messages WHERE from_customer=0 AND partner_id=? AND created_at>?")
      .bind(partnerId, hourAgo)
      .first();
    if (recent && recent.c >= PARTNER_PER_HOUR) return Response.json({ ok: false, error: "too_many" }, { status: 429 });
  }

  const lat = fromCustomer && b.lat != null && b.lat !== "" && !isNaN(Number(b.lat)) ? Number(b.lat) : null;
  const lon = fromCustomer && b.lon != null && b.lon !== "" && !isNaN(Number(b.lon)) ? Number(b.lon) : null;
  const result = await env.DB
    .prepare(
      `INSERT INTO messages (partner_id, customer_mobile, customer_name, from_customer, body, lat, lon, created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .bind(partnerId, customerMobile, (b.customer_name || "").toString().slice(0, 80), fromCustomer, body, lat, lon, new Date().toISOString())
    .run();
  const newId = result.meta.last_row_id;

  /* Tell the other side right away, even if their app is closed. A customer's
     message goes to the business owner's registered numbers; a business's
     reply goes to that customer. Runs in the background (waitUntil) so
     Send returns instantly; where no context is available it is awaited. */
  const preview = body.length > 120 ? body.slice(0, 120) + "..." : body;
  const senderName = (b.customer_name || "").toString().trim() || customerMobile;
  const notify = async () => {
    if (fromCustomer) {
      await pushToMobiles(env, [partner.mobile1, partner.mobile2], (count) => ({
        type: "message",
        title: "\u2709 New message from " + senderName,
        body: preview + (lat != null ? "  \ud83d\udccd location shared" : ""),
        tag: "tc-msg-" + newId,
        url: "/#messages",
        count
      }));
    } else {
      await pushToMobiles(env, [customerMobile], (count) => ({
        type: "message",
        title: "\u2709 Reply from " + (partner.business_name || "the business"),
        body: preview,
        tag: "tc-msg-" + newId,
        url: "/#messages",
        count
      }));
    }
  };
  if (ctx && ctx.waitUntil) ctx.waitUntil(notify());
  else await notify();
  return Response.json({ ok: true, id: newId });
}

export async function onRequestGet({ request, env }) {
  await ensure(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const mobile = (url.searchParams.get("mobile") || "").trim();
  if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });

  /* Counts for the badge: new messages waiting for this mobile, both as a
     business owner (customers writing to them) and as a customer (replies). */
  if (action === "unread") {
    const pu = await env.DB
      .prepare(
        `SELECT COUNT(*) AS c FROM messages m JOIN travel_partners p ON m.partner_id=p.id
         WHERE m.from_customer=1 AND m.read_at IS NULL AND (p.mobile1=? OR p.mobile2=?)`
      )
      .bind(mobile, mobile)
      .first();
    const cu = await env.DB
      .prepare("SELECT COUNT(*) AS c FROM messages WHERE from_customer=0 AND read_at IS NULL AND customer_mobile=?")
      .bind(mobile)
      .first();
    return Response.json({ ok: true, partner_unread: pu ? pu.c : 0, customer_unread: cu ? cu.c : 0 });
  }

  if (action === "inbox") {
    /* A conversation this viewer hid ("Delete chat") is left out UNLESS a
       message newer than the one they hid it at has since arrived - a
       later reply always brings it back, so "delete chat" can never make
       a message someone is actively waiting to be seen just vanish. */
    const hiddenRows = (
      await env.DB.prepare("SELECT partner_id, customer_mobile, hidden_before_id FROM message_hidden WHERE viewer=?").bind("partner").all()
    ).results;
    const hiddenPartner = {};
    hiddenRows.forEach((r) => (hiddenPartner[r.partner_id + "|" + r.customer_mobile] = r.hidden_before_id));
    const hiddenCustRows = (
      await env.DB.prepare("SELECT partner_id, hidden_before_id FROM message_hidden WHERE viewer='customer' AND customer_mobile=?").bind(mobile).all()
    ).results;
    const hiddenCustomer = {};
    hiddenCustRows.forEach((r) => (hiddenCustomer[r.partner_id] = r.hidden_before_id));

    let partnerGroups = (
      await env.DB
        .prepare(
          `SELECT m.partner_id, p.business_name, m.customer_mobile, MAX(m.id) AS last_id,
                  SUM(CASE WHEN m.from_customer=1 AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unread
           FROM messages m JOIN travel_partners p ON m.partner_id=p.id
           WHERE p.mobile1=? OR p.mobile2=?
           GROUP BY m.partner_id, m.customer_mobile
           ORDER BY last_id DESC LIMIT 50`
        )
        .bind(mobile, mobile)
        .all()
    ).results;
    partnerGroups = partnerGroups.filter((g) => {
      const h = hiddenPartner[g.partner_id + "|" + g.customer_mobile];
      return h == null || g.last_id > h;
    });
    let customerGroups = (
      await env.DB
        .prepare(
          `SELECT m.partner_id, p.business_name, MAX(m.id) AS last_id,
                  SUM(CASE WHEN m.from_customer=0 AND m.read_at IS NULL THEN 1 ELSE 0 END) AS unread
           FROM messages m JOIN travel_partners p ON m.partner_id=p.id
           WHERE m.customer_mobile=?
           GROUP BY m.partner_id
           ORDER BY last_id DESC LIMIT 50`
        )
        .bind(mobile)
        .all()
    ).results;
    customerGroups = customerGroups.filter((g) => {
      const h = hiddenCustomer[g.partner_id];
      return h == null || g.last_id > h;
    });

    const ids = [...partnerGroups, ...customerGroups].map((g) => g.last_id);
    const lastById = {};
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const rows = (
        await env.DB
          .prepare(`SELECT id, body, created_at, from_customer FROM messages WHERE id IN (${ph})`)
          .bind(...ids)
          .all()
      ).results;
      rows.forEach((r) => (lastById[r.id] = r));
    }
    const shape = (g) => {
      const last = lastById[g.last_id] || {};
      return { ...g, last_body: last.body || "", last_at: last.created_at || "", last_from_customer: last.from_customer };
    };
    const asPartner = partnerGroups.map(shape);
    for (const g of asPartner) {
      const nameRow = await env.DB
        .prepare(
          "SELECT customer_name FROM messages WHERE partner_id=? AND customer_mobile=? AND from_customer=1 AND customer_name<>'' ORDER BY id DESC LIMIT 1"
        )
        .bind(g.partner_id, g.customer_mobile)
        .first();
      g.customer_name = nameRow ? nameRow.customer_name : "";
    }
    return Response.json({ ok: true, as_partner: asPartner, as_customer: customerGroups.map(shape) });
  }

  if (action === "thread") {
    const partnerId = Number(url.searchParams.get("partner_id"));
    const customerMobile = (url.searchParams.get("customer_mobile") || "").trim();
    const viewer = url.searchParams.get("viewer");
    if (!partnerId || !customerMobile) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    const partner = await env.DB
      .prepare("SELECT id, business_name, mobile1, mobile2 FROM travel_partners WHERE id=?")
      .bind(partnerId)
      .first();
    if (!partner) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

    if (viewer === "partner") {
      if (!isPartnerNumber(partner, mobile)) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    } else if (viewer === "customer") {
      if (mobile !== customerMobile) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    } else {
      return Response.json({ ok: false, error: "bad_viewer" }, { status: 400 });
    }

    const rows = (
      await env.DB
        .prepare(
          `SELECT id, from_customer, body, lat, lon, created_at FROM messages
           WHERE partner_id=? AND customer_mobile=? ORDER BY id DESC LIMIT 200`
        )
        .bind(partnerId, customerMobile)
        .all()
    ).results.reverse();

    /* Opening the conversation marks what was addressed to this viewer as read. */
    const unreadFrom = viewer === "partner" ? 1 : 0;
    await env.DB
      .prepare("UPDATE messages SET read_at=? WHERE partner_id=? AND customer_mobile=? AND from_customer=? AND read_at IS NULL")
      .bind(new Date().toISOString(), partnerId, customerMobile, unreadFrom)
      .run();

    return Response.json({ ok: true, business_name: partner.business_name, messages: rows });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
