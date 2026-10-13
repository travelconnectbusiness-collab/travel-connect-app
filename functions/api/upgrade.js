import { verifyAdminToken } from "./_auth_helper.js";

/* ============================================================================
   /api/upgrade  -  email verification, "request verification", and
   "upgrade to Plus / Premium" (paid by UPI, activated by the admin).

   OWNER actions (the logged-in business owner; checked by partner id + the
   mobile they logged in with + the device token recorded at login):
     GET  ?action=status            what the owner's card needs: email state,
                                    verified?, plan, prices for their category,
                                    UPI id, latest requests
     POST ?action=email_send_otp    emails a 6-digit code to the given address
     POST ?action=email_verify_otp  checks the code -> email saved as VERIFIED
     POST ?action=verify_request    (multipart) asks the admin to verify the
                                    business: note + 1-2 photos
     POST ?action=upgrade_request   (multipart) asks for Plus/Premium: the UPI
                                    reference (UTR) after paying; photos too if
                                    the business is not verified yet

   ADMIN actions (admin token): admin_list, file, settings, save_settings,
     admin_verify_decision, admin_upgrade_decision, admin_update_upgrade,
     admin_delete, admin_set_email.

   Email is sent with Resend (https://resend.com). Add a Cloudflare secret
   RESEND_API_KEY; optionally MAIL_FROM (default
   "Travel Connect <no-reply@travelconnect.dev>"). Without the key, the
   email step simply reports "email not set up yet" - nothing else breaks.
   ========================================================================== */

/* Vehicle-based categories are billed MONTHLY; every other category YEARLY. */
const VEHICLE_TYPES = ["taxi_travel", "auto_rickshaw", "pickup_goods"];

/* Defaults - the admin can change every one of these inside the app
   (Partner Plans page -> Prices & UPI). */
const DEFAULT_SETTINGS = {
  price_plus_month: "99",
  price_premium_month: "299",
  price_plus_year: "99",
  price_premium_year: "999",
  upi_id: "",
  upi_name: "Travel Connect",
};

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const j = (obj, status) => Response.json(obj, { status: status || 200 });

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  for (const s of [
    "CREATE TABLE IF NOT EXISTS upgrade_settings (key TEXT PRIMARY KEY, value TEXT)",
    "CREATE TABLE IF NOT EXISTS email_otps (partner_id INTEGER PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_sent_at INTEGER NOT NULL, window_start INTEGER NOT NULL, sends_in_window INTEGER NOT NULL DEFAULT 1)",
    "CREATE TABLE IF NOT EXISTS verify_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, partner_id INTEGER NOT NULL, note TEXT, doc1_key TEXT, doc2_key TEXT, status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, created_at TEXT NOT NULL, decided_at TEXT)",
    "CREATE TABLE IF NOT EXISTS upgrade_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, partner_id INTEGER NOT NULL, plan TEXT NOT NULL, period TEXT NOT NULL, amount INTEGER NOT NULL, utr TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, created_at TEXT NOT NULL, decided_at TEXT)",
  ]) {
    await env.DB.prepare(s).run();
  }
  for (const s of [
    "ALTER TABLE travel_partners ADD COLUMN email_verified INTEGER DEFAULT 0",
    "ALTER TABLE travel_partners ADD COLUMN plan_expires_at TEXT",
  ]) {
    try { await env.DB.prepare(s).run(); } catch (e) { /* column already exists */ }
  }
  ready = true;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM upgrade_settings").all();
  const s = Object.assign({}, DEFAULT_SETTINGS);
  for (const r of results) if (r.key in DEFAULT_SETTINGS) s[r.key] = r.value;
  return s;
}

function periodFor(businessType) {
  return VEHICLE_TYPES.includes(businessType || "taxi_travel") ? "month" : "year";
}
function priceFor(settings, businessType, plan) {
  const period = periodFor(businessType);
  const key = "price_" + (plan === "premium" ? "premium" : "plus") + "_" + period;
  return parseInt(settings[key], 10) || 0;
}

/* Is this person really the owner of this business, on a device that logged
   in as them? (Same idea as the blood-donor checks in auth.js.) */
async function ownerAuth(env, partnerId, mobile, device) {
  partnerId = parseInt(partnerId, 10);
  mobile = (mobile || "").toString().trim();
  device = (device || "").toString().trim();
  if (!partnerId || !mobile || !device) return null;
  const p = await env.DB.prepare("SELECT * FROM travel_partners WHERE id=?").bind(partnerId).first();
  if (!p || (p.mobile1 !== mobile && p.mobile2 !== mobile)) return null;
  const u = await env.DB.prepare("SELECT device_token, blocked FROM app_users WHERE mobile=?").bind(mobile).first();
  if (!u || u.blocked) return null;
  if (!u.device_token) {
    await env.DB.prepare("UPDATE app_users SET device_token=? WHERE mobile=?").bind(device, mobile).run();
    return p;
  }
  if (u.device_token === device) return p;
  try {
    const known = await env.DB.prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?").bind(mobile, device).first();
    if (known) return p;
  } catch (e) { /* table may not exist yet */ }
  return null;
}

async function sendMail(env, to, subject, html, text) {
  if (!env.RESEND_API_KEY) return { ok: false, error: "email_not_configured" };
  const from = env.MAIL_FROM || "Travel Connect <no-reply@travelconnect.dev>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      return { ok: false, error: "email_send_failed", detail };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "email_send_failed", detail: String(e).slice(0, 200) };
  }
}

function isImage(f) {
  return f && typeof f.arrayBuffer === "function" && f.size > 0 && (f.type || "").startsWith("image/");
}
async function saveDoc(env, partnerId, file, n) {
  if (!isImage(file)) return null;
  if (file.size > MAX_IMAGE_BYTES) return "too_big";
  const nameParts = (file.name || "").split(".");
  let ext = nameParts.length > 1 ? nameParts.pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
  if (!ext) ext = "jpg";
  const key = `verify/${partnerId}/${Date.now()}-${n}.${ext}`;
  await env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "image/jpeg" } });
  return key;
}

async function latest(env, table, partnerId) {
  return await env.DB.prepare(`SELECT * FROM ${table} WHERE partner_id=? ORDER BY id DESC LIMIT 1`).bind(partnerId).first();
}

/* Creates a verification request from the uploaded form. Returns
   {ok:true,id} or {ok:false,error}. */
async function createVerifyRequest(env, p, fd) {
  const f1 = fd.get("doc1");
  const f2 = fd.get("doc2");
  if (!isImage(f1)) return { ok: false, error: "docs_required" };
  const k1 = await saveDoc(env, p.id, f1, 1);
  if (k1 === "too_big") return { ok: false, error: "image_too_big" };
  let k2 = null;
  if (isImage(f2)) {
    k2 = await saveDoc(env, p.id, f2, 2);
    if (k2 === "too_big") return { ok: false, error: "image_too_big" };
  }
  const note = (fd.get("note") || "").toString().trim().slice(0, 500);
  const r = await env.DB
    .prepare("INSERT INTO verify_requests (partner_id, note, doc1_key, doc2_key, status, created_at) VALUES (?,?,?,?, 'pending', ?)")
    .bind(p.id, note || null, k1, k2, new Date().toISOString())
    .run();
  return { ok: true, id: r.meta.last_row_id };
}

/* ------------------------------------------------------------------ GET */
export async function onRequestGet({ request, env }) {
  await ensureTables(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "status") {
    const p = await ownerAuth(env, url.searchParams.get("partner_id"), url.searchParams.get("mobile"), url.searchParams.get("device"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    const settings = await getSettings(env);
    const vr = await latest(env, "verify_requests", p.id);
    const ur = await latest(env, "upgrade_requests", p.id);
    return j({
      ok: true,
      partner: {
        id: p.id,
        business_name: p.business_name,
        business_type: p.business_type,
        email: p.email || "",
        email_verified: p.email_verified ? 1 : 0,
        verified: p.verified ? 1 : 0,
        plan: p.plan || "free",
        plan_expires_at: p.plan_expires_at || null,
      },
      period: periodFor(p.business_type),
      prices: { paid: priceFor(settings, p.business_type, "paid"), premium: priceFor(settings, p.business_type, "premium") },
      upi: { id: settings.upi_id, name: settings.upi_name },
      email_ready: !!env.RESEND_API_KEY,
      verify: vr ? { id: vr.id, status: vr.status, admin_note: vr.admin_note, created_at: vr.created_at } : null,
      upgrade: ur ? { id: ur.id, plan: ur.plan, period: ur.period, amount: ur.amount, utr: ur.utr, status: ur.status, admin_note: ur.admin_note, created_at: ur.created_at } : null,
    });
  }

  /* ---- admin-only below ---- */
  if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
    return j({ ok: false, error: "unauthorized" }, 401);
  }

  if (action === "admin_list") {
    const all = url.searchParams.get("all") === "1";
    const where = all ? "" : "WHERE r.status='pending'";
    const vr = await env.DB.prepare(
      `SELECT r.*, p.business_name, p.owner_name, p.mobile1, p.business_type, p.business_subtype, p.email, p.email_verified, p.verified
       FROM verify_requests r JOIN travel_partners p ON p.id=r.partner_id ${where} ORDER BY r.id DESC LIMIT 100`
    ).all();
    const ur = await env.DB.prepare(
      `SELECT r.*, p.business_name, p.owner_name, p.mobile1, p.business_type, p.business_subtype, p.email, p.email_verified, p.verified, p.plan AS current_plan, p.plan_expires_at
       FROM upgrade_requests r JOIN travel_partners p ON p.id=r.partner_id ${where} ORDER BY r.id DESC LIMIT 100`
    ).all();
    return j({ ok: true, verify_requests: vr.results, upgrade_requests: ur.results });
  }

  if (action === "file") {
    const key = url.searchParams.get("key") || "";
    if (!key.startsWith("verify/")) return j({ ok: false, error: "bad_key" }, 400);
    const obj = await env.FILES.get(key);
    if (!obj) return j({ ok: false, error: "not_found" }, 404);
    return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg" } });
  }

  if (action === "settings") {
    return j({ ok: true, settings: await getSettings(env), email_ready: !!env.RESEND_API_KEY });
  }

  return j({ ok: false, error: "unknown_action" }, 400);
}

/* ----------------------------------------------------------------- POST */
export async function onRequestPost({ request, env }) {
  await ensureTables(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const ctype = request.headers.get("content-type") || "";
  let fd = null;
  let body = {};
  try {
    if (ctype.includes("multipart/form-data")) fd = await request.formData();
    else body = await request.json();
  } catch (e) {
    return j({ ok: false, error: "bad_request" }, 400);
  }
  const field = (k) => (fd ? fd.get(k) : body[k]);

  /* ------------------------- OWNER: email OTP ------------------------- */
  if (action === "email_send_otp") {
    const p = await ownerAuth(env, field("partner_id"), field("mobile"), field("device_token"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    const email = (field("email") || "").toString().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
      return j({ ok: false, error: "bad_email" }, 400);
    }
    const now = Date.now();
    const row = await env.DB.prepare("SELECT * FROM email_otps WHERE partner_id=?").bind(p.id).first();
    let windowStart = now, sends = 1;
    if (row) {
      if (now - row.last_sent_at < OTP_COOLDOWN_MS) {
        return j({ ok: false, error: "wait", retry_in: Math.ceil((OTP_COOLDOWN_MS - (now - row.last_sent_at)) / 1000) }, 429);
      }
      if (now - row.window_start < 3600000) {
        if (row.sends_in_window >= OTP_MAX_SENDS_PER_HOUR) return j({ ok: false, error: "too_many" }, 429);
        windowStart = row.window_start;
        sends = row.sends_in_window + 1;
      }
    }
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    const hash = await sha256Hex(`${p.id}:${email}:${code}`);
    await env.DB
      .prepare("INSERT OR REPLACE INTO email_otps (partner_id, email, code_hash, expires_at, attempts, last_sent_at, window_start, sends_in_window) VALUES (?,?,?,?,0,?,?,?)")
      .bind(p.id, email, hash, now + OTP_TTL_MS, now, windowStart, sends)
      .run();
    const mail = await sendMail(
      env,
      email,
      "Travel Connect verification code " + code,
      `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222"><p>Your <b>Travel Connect</b> email verification code is:</p><p style="font-size:30px;letter-spacing:6px;font-weight:700;margin:12px 0">${code}</p><p>It is valid for 10 minutes. If you did not ask for this, please ignore this email.</p><p style="color:#666">നിങ്ങളുടെ Travel Connect ഇമെയിൽ വെരിഫിക്കേഷൻ കോഡ്: ${code} (10 മിനിറ്റ് മാത്രം).</p></div>`,
      `Your Travel Connect verification code is ${code}. Valid for 10 minutes.`
    );
    if (!mail.ok) {
      await env.DB.prepare("DELETE FROM email_otps WHERE partner_id=?").bind(p.id).run();
      return j({ ok: false, error: mail.error, detail: mail.detail }, mail.error === "email_not_configured" ? 503 : 502);
    }
    return j({ ok: true });
  }

  if (action === "email_verify_otp") {
    const p = await ownerAuth(env, field("partner_id"), field("mobile"), field("device_token"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    const email = (field("email") || "").toString().trim().toLowerCase();
    const code = (field("code") || "").toString().trim();
    const row = await env.DB.prepare("SELECT * FROM email_otps WHERE partner_id=?").bind(p.id).first();
    if (!row || row.email !== email) return j({ ok: false, error: "no_code" }, 400);
    if (Date.now() > row.expires_at) {
      await env.DB.prepare("DELETE FROM email_otps WHERE partner_id=?").bind(p.id).run();
      return j({ ok: false, error: "expired" }, 400);
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await env.DB.prepare("DELETE FROM email_otps WHERE partner_id=?").bind(p.id).run();
      return j({ ok: false, error: "too_many_attempts" }, 429);
    }
    const hash = await sha256Hex(`${p.id}:${email}:${code}`);
    if (hash !== row.code_hash) {
      await env.DB.prepare("UPDATE email_otps SET attempts=attempts+1 WHERE partner_id=?").bind(p.id).run();
      return j({ ok: false, error: "wrong_code", attempts_left: OTP_MAX_ATTEMPTS - row.attempts - 1 }, 400);
    }
    await env.DB.prepare("UPDATE travel_partners SET email=?, email_verified=1 WHERE id=?").bind(email, p.id).run();
    await env.DB.prepare("DELETE FROM email_otps WHERE partner_id=?").bind(p.id).run();
    return j({ ok: true, email });
  }

  /* ------------------ OWNER: verification / upgrade requests ------------------ */
  if (action === "verify_request") {
    if (!fd) return j({ ok: false, error: "bad_request" }, 400);
    const p = await ownerAuth(env, field("partner_id"), field("mobile"), field("device_token"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    if (!p.email_verified) return j({ ok: false, error: "email_not_verified" }, 403);
    if (p.verified) return j({ ok: false, error: "already_verified" }, 409);
    const pend = await env.DB.prepare("SELECT 1 AS x FROM verify_requests WHERE partner_id=? AND status='pending'").bind(p.id).first();
    if (pend) return j({ ok: false, error: "already_pending" }, 409);
    const r = await createVerifyRequest(env, p, fd);
    if (!r.ok) return j(r, 400);
    return j({ ok: true, id: r.id });
  }

  if (action === "upgrade_request") {
    if (!fd) return j({ ok: false, error: "bad_request" }, 400);
    const p = await ownerAuth(env, field("partner_id"), field("mobile"), field("device_token"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    if (!p.email_verified) return j({ ok: false, error: "email_not_verified" }, 403);
    const plan = (field("plan") || "").toString();
    if (plan !== "paid" && plan !== "premium") return j({ ok: false, error: "bad_plan" }, 400);
    if (p.plan === "owner_free" || p.plan === "owner_plus") return j({ ok: false, error: "owner_plan" }, 409);
    const pend = await env.DB.prepare("SELECT 1 AS x FROM upgrade_requests WHERE partner_id=? AND status='pending'").bind(p.id).first();
    if (pend) return j({ ok: false, error: "already_pending" }, 409);
    const utr = (field("utr") || "").toString().trim();
    if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) return j({ ok: false, error: "bad_utr" }, 400);
    const dup = await env.DB.prepare("SELECT 1 AS x FROM upgrade_requests WHERE utr=? AND status!='rejected'").bind(utr).first();
    if (dup) return j({ ok: false, error: "utr_used" }, 409);
    const settings = await getSettings(env);
    if (!settings.upi_id) return j({ ok: false, error: "payment_not_set" }, 503);
    const amount = priceFor(settings, p.business_type, plan);
    if (amount <= 0) return j({ ok: false, error: "price_not_set" }, 503);

    /* Documents: needed once, if this business is not verified yet and has no
       verification request waiting. */
    const vPending = await env.DB.prepare("SELECT 1 AS x FROM verify_requests WHERE partner_id=? AND status='pending'").bind(p.id).first();
    const needDocs = !p.verified && !vPending;
    if (needDocs) {
      if (!isImage(fd.get("doc1"))) return j({ ok: false, error: "docs_required" }, 400);
      const r = await createVerifyRequest(env, p, fd);
      if (!r.ok) return j(r, 400);
    }
    const ins = await env.DB
      .prepare("INSERT INTO upgrade_requests (partner_id, plan, period, amount, utr, status, created_at) VALUES (?,?,?,?,?, 'pending', ?)")
      .bind(p.id, plan, periodFor(p.business_type), amount, utr, new Date().toISOString())
      .run();
    return j({ ok: true, id: ins.meta.last_row_id, amount });
  }

  /* ----------------------------- ADMIN ----------------------------- */
  if (!(await verifyAdminToken(env, field("token")))) {
    return j({ ok: false, error: "unauthorized" }, 401);
  }

  if (action === "admin_verify_decision") {
    const id = parseInt(field("id"), 10);
    const decision = field("decision");
    const adminNote = (field("admin_note") || "").toString().trim().slice(0, 300) || null;
    const r = await env.DB.prepare("SELECT * FROM verify_requests WHERE id=?").bind(id).first();
    if (!r) return j({ ok: false, error: "not_found" }, 404);
    if (decision === "approve") {
      await env.DB.prepare("UPDATE verify_requests SET status='approved', admin_note=?, decided_at=? WHERE id=?").bind(adminNote, new Date().toISOString(), id).run();
      await env.DB.prepare("UPDATE travel_partners SET verified=1 WHERE id=?").bind(r.partner_id).run();
    } else if (decision === "reject") {
      await env.DB.prepare("UPDATE verify_requests SET status='rejected', admin_note=?, decided_at=? WHERE id=?").bind(adminNote, new Date().toISOString(), id).run();
    } else return j({ ok: false, error: "bad_decision" }, 400);
    return j({ ok: true });
  }

  if (action === "admin_upgrade_decision") {
    const id = parseInt(field("id"), 10);
    const decision = field("decision");
    const adminNote = (field("admin_note") || "").toString().trim().slice(0, 300) || null;
    const r = await env.DB.prepare("SELECT * FROM upgrade_requests WHERE id=?").bind(id).first();
    if (!r) return j({ ok: false, error: "not_found" }, 404);
    if (decision === "approve") {
      const p = await env.DB.prepare("SELECT plan, plan_expires_at FROM travel_partners WHERE id=?").bind(r.partner_id).first();
      if (!p) return j({ ok: false, error: "not_found" }, 404);
      if (p.plan === "owner_free" || p.plan === "owner_plus") return j({ ok: false, error: "owner_plan" }, 409);
      const days = parseInt(field("days"), 10) || (r.period === "month" ? 30 : 365);
      const now = Date.now();
      const cur = p.plan_expires_at ? new Date(p.plan_expires_at).getTime() : 0;
      /* Same plan still running: add on top of the remaining time, like set_plan does. */
      const base = p.plan === r.plan && cur > now ? cur : now;
      const expiresAt = new Date(base + days * 86400000).toISOString();
      await env.DB.prepare("UPDATE travel_partners SET plan=?, plan_expires_at=? WHERE id=?").bind(r.plan, expiresAt, r.partner_id).run();
      await env.DB.prepare("UPDATE upgrade_requests SET status='approved', admin_note=?, decided_at=? WHERE id=?").bind(adminNote, new Date().toISOString(), id).run();
      return j({ ok: true, plan_expires_at: expiresAt });
    } else if (decision === "reject") {
      await env.DB.prepare("UPDATE upgrade_requests SET status='rejected', admin_note=?, decided_at=? WHERE id=?").bind(adminNote, new Date().toISOString(), id).run();
      return j({ ok: true });
    }
    return j({ ok: false, error: "bad_decision" }, 400);
  }

  if (action === "admin_update_upgrade") {
    const id = parseInt(field("id"), 10);
    const plan = field("plan");
    const amount = parseInt(field("amount"), 10);
    const utr = (field("utr") || "").toString().trim();
    if (!id || (plan !== "paid" && plan !== "premium") || !(amount >= 0) || !/^[A-Za-z0-9]{6,30}$/.test(utr)) {
      return j({ ok: false, error: "invalid_input" }, 400);
    }
    await env.DB.prepare("UPDATE upgrade_requests SET plan=?, amount=?, utr=? WHERE id=?").bind(plan, amount, utr, id).run();
    return j({ ok: true });
  }

  if (action === "admin_delete") {
    const id = parseInt(field("id"), 10);
    const kind = field("kind");
    if (kind === "verify") {
      const r = await env.DB.prepare("SELECT doc1_key, doc2_key FROM verify_requests WHERE id=?").bind(id).first();
      if (r) {
        for (const k of [r.doc1_key, r.doc2_key]) if (k) { try { await env.FILES.delete(k); } catch (e) {} }
      }
      await env.DB.prepare("DELETE FROM verify_requests WHERE id=?").bind(id).run();
    } else if (kind === "upgrade") {
      await env.DB.prepare("DELETE FROM upgrade_requests WHERE id=?").bind(id).run();
    } else return j({ ok: false, error: "bad_kind" }, 400);
    return j({ ok: true });
  }

  if (action === "admin_set_email") {
    const partnerId = parseInt(field("partner_id"), 10);
    const email = (field("email") || "").toString().trim().toLowerCase();
    const verified = field("verified") ? 1 : 0;
    if (!partnerId) return j({ ok: false, error: "invalid_input" }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return j({ ok: false, error: "bad_email" }, 400);
    await env.DB.prepare("UPDATE travel_partners SET email=?, email_verified=? WHERE id=?").bind(email || null, email ? verified : 0, partnerId).run();
    return j({ ok: true });
  }

  if (action === "save_settings") {
    const incoming = field("settings") || {};
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (!(k in incoming)) continue;
      let v = (incoming[k] ?? "").toString().trim();
      if (k.startsWith("price_")) {
        if (!/^\d{1,6}$/.test(v)) return j({ ok: false, error: "bad_price", key: k }, 400);
      } else if (k === "upi_id") {
        if (v && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(v)) return j({ ok: false, error: "bad_upi" }, 400);
        v = v.slice(0, 100);
      } else {
        v = v.slice(0, 50);
      }
      await env.DB
        .prepare("INSERT INTO upgrade_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
        .bind(k, v)
        .run();
    }
    return j({ ok: true, settings: await getSettings(env) });
  }

  return j({ ok: false, error: "unknown_action" }, 400);
}
