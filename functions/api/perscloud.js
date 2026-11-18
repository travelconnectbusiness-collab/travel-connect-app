import { verifyAdminToken } from "./_auth_helper.js";
import { deviceKnown } from "./_loginotp.js";

/* ============================================================================
   /api/perscloud  -  "My Accounts" CLOUD BACKUP for anybody (customers too).
   Owner 2026-11-17: customers get an encrypted cloud backup - Rs.99 a year, or Rs.10 for a
   30-day "phone change" copy; paid by UPI, switched on by the admin (no payment gateway yet).

   WHAT IS STORED: only the PASSWORD-LOCKED vault of My Accounts that the phone already makes
   (tc-perslock.js: {id,u,ts,salt,iter,iv,ct,n}, AES-256-GCM, key from the person's password).
   The server never sees the password or the plain accounts and refuses anything that is not
   such a locked vault. Nobody - not even the admin - can read it.

   USER actions (POST JSON, the logged-in phone: mobile + device_token of a known device):
     status    plan, what is stored, prices, UPI, the pending request
     request   {kind:"year"|"move", utr}   -> waits for the admin
     put       {vault, force?}              needs an active plan; keeps the previous copy
     get       {which?:"prev"}              active plan, or a year plan up to 30 days after it ended
     remove    deletes the cloud copy
   ADMIN actions (admin token): admin_list, admin_decide {id, decision, note},
     admin_grant {mobile, kind}, admin_prices {year, move}.
   A "move" copy is deleted when its 30 days end; a year copy 30 days after the year ends.
   ========================================================================== */

const DAY = 86400000;
const YEAR_DAYS = 365, MOVE_DAYS = 30, GRACE_DAYS = 30;
const MAX_VAULT_CHARS = 6 * 1024 * 1024;
const PUT_GAP_MS = 45 * 1000;
const j = (o, s) => Response.json(o, { status: s || 200 });
const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  for (const s of [
    "CREATE TABLE IF NOT EXISTS upgrade_settings (key TEXT PRIMARY KEY, value TEXT)",
    "CREATE TABLE IF NOT EXISTS pc_plans (mobile TEXT PRIMARY KEY, kind TEXT NOT NULL, until TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS pc_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, mobile TEXT NOT NULL, kind TEXT NOT NULL, amount TEXT, utr TEXT, status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, created_at TEXT NOT NULL, decided_at TEXT)",
    "CREATE TABLE IF NOT EXISTS pc_store (mobile TEXT PRIMARY KEY, size INTEGER, n INTEGER, ts INTEGER, vid TEXT, updated_at TEXT NOT NULL)",
  ]) await env.DB.prepare(s).run();
  ready = true;
}
async function settings(env) {
  const o = { price_cloud_year: "99", price_cloud_move: "10", upi_id: "", upi_name: "Travel Connect" };
  try {
    const { results } = await env.DB.prepare("SELECT key, value FROM upgrade_settings").all();
    (results || []).forEach((r) => { if (r.key in o && r.value != null && r.value !== "") o[r.key] = r.value; });
  } catch (e) {}
  return o;
}
async function objKey(mobile, prev) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tc-perscloud:" + mobile));
  const hex = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return "perscloud/" + hex + (prev ? ".prev" : "") + ".json";
}
function activeOf(plan, now) { return !!(plan && Date.parse(plan.until) > now); }
/* can the stored copy still be fetched? (active, or a year plan in its 30 days of grace) */
function readableOf(plan, now) {
  if (!plan) return false;
  const u = Date.parse(plan.until);
  if (u > now) return true;
  return plan.kind === "year" && u + GRACE_DAYS * DAY > now;
}
async function dropCopy(env, mobile) {
  try { await env.FILES.delete([await objKey(mobile, false), await objKey(mobile, true)]); } catch (e) {}
  await env.DB.prepare("DELETE FROM pc_store WHERE mobile=?").bind(mobile).run();
}
/* lazy clean-up: a copy whose time is over is deleted */
async function expireIfDue(env, mobile, plan, now) {
  if (plan && !readableOf(plan, now)) {
    const st = await env.DB.prepare("SELECT mobile FROM pc_store WHERE mobile=?").bind(mobile).first();
    if (st) await dropCopy(env, mobile);
  }
}
const B64 = /^[A-Za-z0-9+/=]+$/;
function validVault(v, mobile) {
  if (!v || typeof v !== "object") return false;
  if (String(v.u || "") !== mobile) return false;
  if (typeof v.salt !== "string" || typeof v.iv !== "string" || typeof v.ct !== "string") return false;
  if (!B64.test(v.salt) || !B64.test(v.iv) || !B64.test(v.ct)) return false;
  if (v.salt.length < 16 || v.salt.length > 64 || v.iv.length < 12 || v.iv.length > 32 || v.ct.length < 24 || v.ct.length > MAX_VAULT_CHARS) return false;
  const it = Math.floor(+v.iter || 0);
  if (it < 100000 || it > 2000000) return false;
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(v.id || ""))) return false;
  return true;
}
function addDays(fromMs, days) { return new Date(fromMs + days * DAY).toISOString(); }
async function grant(env, mobile, kind) {
  const now = Date.now();
  const cur = await env.DB.prepare("SELECT * FROM pc_plans WHERE mobile=?").bind(mobile).first();
  const curUntil = cur ? Date.parse(cur.until) || 0 : 0;
  let until, k = kind;
  if (kind === "year") until = addDays(Math.max(now, curUntil), YEAR_DAYS);
  else {
    const m = now + MOVE_DAYS * DAY;
    if (curUntil > m) { until = cur.until; k = cur.kind; }   /* a longer year plan already runs: keep it */
    else until = new Date(m).toISOString();
  }
  await env.DB.prepare("INSERT INTO pc_plans (mobile, kind, until, updated_at) VALUES (?,?,?,?) ON CONFLICT(mobile) DO UPDATE SET kind=excluded.kind, until=excluded.until, updated_at=excluded.updated_at")
    .bind(mobile, k, until, new Date().toISOString()).run();
  return { kind: k, until };
}

export async function onRequestPost({ request, env }) {
  await ensureTables(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";
  let body = {};
  try { body = await request.json(); } catch (e) { return j({ ok: false, error: "bad_request" }, 400); }
  const now = Date.now();

  /* ------------------------------ ADMIN ------------------------------ */
  if (action.startsWith("admin_")) {
    if (!(await verifyAdminToken(env, body.token))) return j({ ok: false, error: "unauthorized" }, 401);
    if (action === "admin_list") {
      const st = await settings(env);
      const pend = await env.DB.prepare("SELECT r.*, u.name FROM pc_requests r LEFT JOIN app_users u ON u.mobile=r.mobile WHERE r.status='pending' ORDER BY r.id DESC LIMIT 100").all();
      const recent = await env.DB.prepare("SELECT r.*, u.name FROM pc_requests r LEFT JOIN app_users u ON u.mobile=r.mobile WHERE r.status<>'pending' ORDER BY r.id DESC LIMIT 30").all();
      const plans = await env.DB.prepare("SELECT p.*, u.name, s.size, s.n, s.ts FROM pc_plans p LEFT JOIN app_users u ON u.mobile=p.mobile LEFT JOIN pc_store s ON s.mobile=p.mobile ORDER BY p.until DESC LIMIT 200").all();
      /* clean-up of copies whose time is over */
      for (const p of plans.results || []) { if (!readableOf(p, now) && p.size != null) await dropCopy(env, p.mobile); }
      return j({ ok: true, pending: pend.results || [], recent: recent.results || [], plans: plans.results || [], prices: { year: st.price_cloud_year, move: st.price_cloud_move } });
    }
    if (action === "admin_decide") {
      const id = Math.floor(+body.id || 0);
      const r = await env.DB.prepare("SELECT * FROM pc_requests WHERE id=?").bind(id).first();
      if (!r || r.status !== "pending") return j({ ok: false, error: "not_found" }, 404);
      const ok = body.decision === "approve";
      let plan = null;
      if (ok) plan = await grant(env, r.mobile, r.kind === "year" ? "year" : "move");
      await env.DB.prepare("UPDATE pc_requests SET status=?, admin_note=?, decided_at=? WHERE id=?")
        .bind(ok ? "approved" : "rejected", clean(body.note, 300), new Date().toISOString(), id).run();
      return j({ ok: true, plan });
    }
    if (action === "admin_grant") {
      const m = clean(body.mobile, 20), k = body.kind === "year" ? "year" : "move";
      const u = await env.DB.prepare("SELECT mobile FROM app_users WHERE mobile=?").bind(m).first();
      if (!u) return j({ ok: false, error: "no_user" }, 404);
      return j({ ok: true, plan: await grant(env, m, k) });
    }
    if (action === "admin_stop") {
      const m = clean(body.mobile, 20);
      await env.DB.prepare("UPDATE pc_plans SET until=?, updated_at=? WHERE mobile=?").bind(new Date(now - 1000).toISOString(), new Date().toISOString(), m).run();
      return j({ ok: true });
    }
    if (action === "admin_prices") {
      const y = clean(body.year, 8).replace(/[^0-9]/g, ""), m = clean(body.move, 8).replace(/[^0-9]/g, "");
      if (!y || !m) return j({ ok: false, error: "bad_price" }, 400);
      for (const [k, v] of [["price_cloud_year", y], ["price_cloud_move", m]])
        await env.DB.prepare("INSERT INTO upgrade_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k, v).run();
      return j({ ok: true });
    }
    return j({ ok: false, error: "unknown_action" }, 400);
  }

  /* ------------------------------ USER ------------------------------ */
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return j({ ok: false, error: "unauthorized" }, 403);
  const plan = await env.DB.prepare("SELECT kind, until FROM pc_plans WHERE mobile=?").bind(mobile).first();
  await expireIfDue(env, mobile, plan, now);

  if (action === "status") {
    const st = await settings(env);
    const s = await env.DB.prepare("SELECT size, n, ts, updated_at FROM pc_store WHERE mobile=?").bind(mobile).first();
    const r = await env.DB.prepare("SELECT id, kind, amount, utr, status, admin_note, created_at FROM pc_requests WHERE mobile=? ORDER BY id DESC LIMIT 1").bind(mobile).first();
    return j({
      ok: true,
      plan: plan ? { kind: plan.kind, until: plan.until, active: activeOf(plan, now), readable: readableOf(plan, now) } : null,
      stored: s || null,
      prices: { year: st.price_cloud_year, move: st.price_cloud_move },
      upi: { id: st.upi_id, name: st.upi_name },
      request: r || null,
    });
  }

  if (action === "request") {
    const kind = body.kind === "year" ? "year" : body.kind === "move" ? "move" : "";
    const utr = clean(body.utr, 40).replace(/\s+/g, "");
    if (!kind) return j({ ok: false, error: "bad_kind" }, 400);
    if (!/^[A-Za-z0-9]{6,30}$/.test(utr)) return j({ ok: false, error: "bad_utr" }, 400);
    const pend = await env.DB.prepare("SELECT id FROM pc_requests WHERE mobile=? AND status='pending'").bind(mobile).first();
    if (pend) return j({ ok: false, error: "already_pending" }, 409);
    const day = await env.DB.prepare("SELECT COUNT(*) AS c FROM pc_requests WHERE mobile=? AND created_at>?").bind(mobile, new Date(now - DAY).toISOString()).first();
    if (day && day.c >= 5) return j({ ok: false, error: "too_many" }, 429);
    const st = await settings(env);
    await env.DB.prepare("INSERT INTO pc_requests (mobile, kind, amount, utr, status, created_at) VALUES (?,?,?,?, 'pending', ?)")
      .bind(mobile, kind, kind === "year" ? st.price_cloud_year : st.price_cloud_move, utr, new Date().toISOString()).run();
    return j({ ok: true });
  }

  if (action === "put") {
    if (!activeOf(plan, now)) return j({ ok: false, error: "no_plan" }, 402);
    const v = body.vault;
    if (!validVault(v, mobile)) return j({ ok: false, error: "not_locked" }, 400);   /* only a password-locked vault is ever accepted */
    const s = await env.DB.prepare("SELECT n, ts, vid, updated_at FROM pc_store WHERE mobile=?").bind(mobile).first();
    if (s && s.vid === v.id) return j({ ok: true, same: true });
    if (s && now - Date.parse(s.updated_at) < PUT_GAP_MS && !body.force) return j({ ok: false, error: "wait" }, 429);
    const n = Math.max(0, Math.floor(+v.n || 0));
    if (s && s.n >= 20 && n < s.n * 0.5 && !body.force) return j({ ok: false, error: "would_shrink", stored_n: s.n, n }, 409);
    const text = JSON.stringify({ id: v.id, u: v.u, ts: Math.floor(+v.ts || now), salt: v.salt, iter: Math.floor(+v.iter), iv: v.iv, ct: v.ct, n });
    const k = await objKey(mobile, false);
    try {
      const old = await env.FILES.get(k);
      if (old) await env.FILES.put(await objKey(mobile, true), await old.text(), { httpMetadata: { contentType: "application/json" } });
    } catch (e) {}
    await env.FILES.put(k, text, { httpMetadata: { contentType: "application/json" } });
    await env.DB.prepare("INSERT INTO pc_store (mobile, size, n, ts, vid, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(mobile) DO UPDATE SET size=excluded.size, n=excluded.n, ts=excluded.ts, vid=excluded.vid, updated_at=excluded.updated_at")
      .bind(mobile, text.length, n, Math.floor(+v.ts || now), v.id, new Date().toISOString()).run();
    return j({ ok: true, size: text.length, n });
  }

  if (action === "get") {
    if (!readableOf(plan, now)) return j({ ok: false, error: "no_plan" }, 402);
    const o = await env.FILES.get(await objKey(mobile, body.which === "prev"));
    if (!o) return j({ ok: false, error: "nothing_stored" }, 404);
    let v = null;
    try { v = JSON.parse(await o.text()); } catch (e) {}
    if (!v) return j({ ok: false, error: "broken" }, 500);
    return j({ ok: true, vault: v });
  }

  if (action === "remove") {
    await dropCopy(env, mobile);
    return j({ ok: true });
  }

  return j({ ok: false, error: "unknown_action" }, 400);
}
