import { deviceKnown } from "./_loginotp.js";
import { planLevel } from "./partner_media.js";
import { verifyAdminToken } from "./_auth_helper.js";

/* ============================================================================
   /api/assoc  -  ASSOCIATION BOOK IN THE CLOUD (phase 2, owner 2026-11-20).
   Unions, Kudumbashree, self-help groups, clubs: the book belongs to the ORGANISATION, not to one phone.
   - Premium (planLevel >= 2) of the association business keeps its book here; the phone keeps a copy and syncs.
   - Office bearers are records of kind "role" ({title, mid, ph, access admin|edit|view, from, to}); the server finds
     a person by the mobile number they log in with. Access ends the moment a term is ended (to = date) or the role
     is cancelled - checked on EVERY request. The registered owner number of the association business is always admin;
     when the committee changes, any admin hands the organisation over (action handover) to a new admin's number, and the
     old owner's access goes with it (the business registration itself moves: renewals go to the new person).
   - Platinum: every member can see his OWN membership ("എന്റെ അംഗത്വം": own payments / receipts), nothing else.
   - Nothing is ever deleted: a cancelled receipt / entry keeps its row with del=1; every change is in assoc_log
     (who, when, what) for the audit. A payment cannot be edited, only cancelled. Receipt numbers are given here,
     one counter per organisation, so two office bearers never make the same number.
   - When the plan lapses the office bearers can still READ (and export) the book; writing needs the plan again.
   - Member limits (admin settings in upgrade_settings): Premium 1000, Platinum 10000, office bearers with access on
     Premium 5; a bigger organisation gets its own limit from the admin (admin_set_max).
   POST JSON { mobile, device_token, pid, ... } with ?action=status | init | pull | push | log | mine ;
   admin: ?action=admin_list | admin_set_max { token, ... }.
   ========================================================================== */

const j = (o, s) => Response.json(o, { status: s || 200 });
const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const KINDS = ["member", "pay", "led", "min", "act", "role"];
const ID_RE = /^[a-z0-9]{4,24}$/i;
function phone10(p) { let d = String(p || "").replace(/\D/g, ""); if (d.length === 12 && d.startsWith("91")) d = d.slice(2); return d.length === 10 ? d : ""; }
function envInt(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; }

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  for (const s of [
    "CREATE TABLE IF NOT EXISTS assoc_org (pid INTEGER PRIMARY KEY, cfg TEXT NOT NULL DEFAULT '{}', rev INTEGER NOT NULL DEFAULT 0, rc_next INTEGER NOT NULL DEFAULT 1, max_members INTEGER, created_at TEXT, updated_at TEXT)",
    "CREATE TABLE IF NOT EXISTS assoc_rec (pid INTEGER NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, ph TEXT, rev INTEGER NOT NULL, del INTEGER NOT NULL DEFAULT 0, by_mobile TEXT, at TEXT, PRIMARY KEY (pid, kind, id))",
    "CREATE INDEX IF NOT EXISTS assoc_rec_rev ON assoc_rec (pid, rev)",
    "CREATE INDEX IF NOT EXISTS assoc_rec_ph ON assoc_rec (ph)",
    "CREATE TABLE IF NOT EXISTS assoc_log (id INTEGER PRIMARY KEY AUTOINCREMENT, pid INTEGER NOT NULL, at TEXT, by_mobile TEXT, kind TEXT, rid TEXT, action TEXT, summary TEXT)",
    "CREATE INDEX IF NOT EXISTS assoc_log_pid ON assoc_log (pid, id)",
  ]) await env.DB.prepare(s).run();
  ready = true;
}
async function settings(env) {
  const s = { assoc_limit_premium: 1000, assoc_limit_platinum: 10000, assoc_roles_premium: 5 };
  try {
    const r = (await env.DB.prepare("SELECT key, value FROM upgrade_settings WHERE key IN ('assoc_limit_premium','assoc_limit_platinum','assoc_roles_premium')").all()).results || [];
    r.forEach((x) => { s[x.key] = envInt(x.value, s[x.key]); });
  } catch (e) {}
  return s;
}
async function limits(env, lvl, org) {
  const s = await settings(env);
  let members = lvl >= 3 ? s.assoc_limit_platinum : (lvl >= 2 ? s.assoc_limit_premium : 0);
  if (org && org.max_members > members) members = org.max_members;
  return { members, roles: lvl >= 3 ? 100000 : (lvl >= 2 ? s.assoc_roles_premium : 0) };
}
const active = (r) => r && !r.to || (r && r.to >= today());

/* who is this person for this organisation? */
async function accessOf(env, pid, mobile) {
  const p = await env.DB.prepare("SELECT id, business_name, business_type, plan, plan_expires_at, platinum, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(pid).first();
  if (!p || p.business_type !== "association") return { acc: null };
  const lvl = planLevel(p), me = phone10(mobile);
  const roles = ((await env.DB.prepare("SELECT data, ph FROM assoc_rec WHERE pid=? AND kind='role' AND del=0").bind(pid).all()).results || [])
    .map((r) => { try { return Object.assign(JSON.parse(r.data), { ph: r.ph }); } catch (e) { return null; } }).filter((r) => r && active(r));
  const rank = { view: 1, edit: 2, admin: 3 };
  let acc = null, title = "";
  roles.forEach((r) => { if (r.ph && r.ph === me && (rank[r.access] || 0) > (rank[acc] || 0)) { acc = r.access; title = r.title || ""; } });
  const owner = me && (phone10(p.mobile1) === me || phone10(p.mobile2) === me);
  if (owner) { acc = "admin"; title = title || "owner"; }
  if (!acc && lvl >= 3 && me) {
    const m = await env.DB.prepare("SELECT id FROM assoc_rec WHERE pid=? AND kind='member' AND del=0 AND ph=? LIMIT 1").bind(pid, me).first();
    if (m) acc = "self";
  }
  return { acc, title, lvl, p, roles };
}
async function bump(env, pid, field) {
  const r = await env.DB.prepare("UPDATE assoc_org SET " + field + "=" + field + "+1, updated_at=? WHERE pid=? RETURNING " + field + " AS n").bind(nowIso(), pid).first();
  return r ? r.n : 0;
}
async function log(env, pid, by, kind, rid, action, summary) {
  try { await env.DB.prepare("INSERT INTO assoc_log (pid, at, by_mobile, kind, rid, action, summary) VALUES (?,?,?,?,?,?,?)").bind(pid, nowIso(), by, kind, rid, action, String(summary || "").slice(0, 200)).run(); } catch (e) {}
}
function summaryOf(kind, d) {
  if (kind === "member") return (d.no ? d.no + ". " : "") + (d.hno ? d.hno + " " : "") + (d.name || "") + (Array.isArray(d.vehs) && d.vehs.length ? " (" + d.vehs.length + " veh)" : "") + (+d.amt > 0 ? " rate " + d.amt : "");
  if (kind === "pay") return (d.rc || "") + " ₹" + (d.amt || 0) + " " + (d.periods || []).join(",");
  if (kind === "led") return (d.t === "out" ? "- " : "+ ") + "₹" + (d.amt || 0) + " " + (d.cat || "");
  if (kind === "min") return (d.date || "") + " " + String(d.dec || "").slice(0, 60);
  if (kind === "act") return (d.type || "") + " " + (d.note || "");
  if (kind === "role") return (d.title || "") + " " + (d.ph || "") + " " + (d.access || "") + (d.to ? " until " + d.to : "");
  return "";
}
const TYPES = ["taxi", "shg", "club", "res", "other"];
function cleanCfg(c, old) {   /* the settings of a book (phase 3: kind of organisation, weekly thrift, vehicle rule) */
  c = c || {}; old = old || {};
  return JSON.stringify({ org: clean(c.org, 80), type: TYPES.includes(c.type) ? c.type : "other", amt: +c.amt || 0, per: c.per === "y" ? "y" : (c.per === "w" ? "w" : "m"), start: clean(c.start, 7),
    areas: (Array.isArray(c.areas) ? c.areas : []).slice(0, 60).map((x) => clean(x, 40)), prefix: clean(c.prefix || old.prefix || "R", 8), openCash: +c.openCash || 0, openBank: +c.openBank || 0,
    nextNo: +c.nextNo || old.nextNo || 1, inclVeh: Math.max(0, parseInt(c.inclVeh, 10) || 0), extraVeh: Math.max(0, +c.extraVeh || 0) });
}
async function liveMembers(env, pid) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM assoc_rec WHERE pid=? AND kind='member' AND del=0").bind(pid).first();
  return (r && r.n) || 0;
}
/* writes one record (insert / replace) with a new revision; returns {ok, rc?, error?} */
async function writeRec(env, pid, by, kind, id, data, del, org) {
  if (!KINDS.includes(kind) || !ID_RE.test(String(id || ""))) return { ok: false, error: "bad_record" };
  const txt = JSON.stringify(data || {});
  if (txt.length > (kind === "min" ? 60000 : 4000)) return { ok: false, error: "too_large" };   /* minutes of a big meeting: about 25 pages */
  const old = await env.DB.prepare("SELECT data, del FROM assoc_rec WHERE pid=? AND kind=? AND id=?").bind(pid, kind, id).first();
  if (old && old.del) return { ok: true, ignored: "cancelled" };                 /* cancelled stays cancelled */
  let d = data || {}, action = old ? (del ? "cancel" : "edit") : "add";
  if (kind === "pay" && old) {                                                     /* a payment is never edited, only cancelled */
    if (!del) return { ok: true, ignored: "paid" };
    d = JSON.parse(old.data);
  }
  if (kind === "pay" && !old) {
    if (!(+d.amt > 0) || !Array.isArray(d.periods) || !d.periods.length) return { ok: false, error: "bad_pay" };
    const cfg = JSON.parse(org.cfg || "{}"), n = await bump(env, pid, "rc_next");
    d.rc = String(cfg.prefix || "R").slice(0, 8) + "-" + (n - 1);
  }
  if (kind === "member" && !old && !del) {
    if ((await liveMembers(env, pid)) >= org.limit) return { ok: false, error: "member_limit", limit: org.limit };
  }
  const ph = kind === "member" || kind === "role" ? phone10(d.ph) || null : null;
  const rev = await bump(env, pid, "rev");
  await env.DB.prepare("INSERT INTO assoc_rec (pid, kind, id, data, ph, rev, del, by_mobile, at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(pid, kind, id) DO UPDATE SET data=excluded.data, ph=excluded.ph, rev=excluded.rev, del=excluded.del, by_mobile=excluded.by_mobile, at=excluded.at")
    .bind(pid, kind, id, JSON.stringify(d), ph, rev, del ? 1 : 0, by, nowIso()).run();
  await log(env, pid, by, kind, id, action, summaryOf(kind, d));
  return { ok: true, rc: d.rc, rev };
}

export async function onRequestPost({ request, env }) {
  await ensureTables(env);
  const action = new URL(request.url).searchParams.get("action") || "";
  let b = {};
  try { b = await request.json(); } catch (e) { return j({ ok: false, error: "bad_request" }, 400); }

  if (action === "admin_list" || action === "admin_set_max") {
    if (!(await verifyAdminToken(env, b.token))) return j({ ok: false, error: "unauthorized" }, 401);
    if (action === "admin_set_max") {
      const pid = parseInt(b.pid, 10), max = parseInt(b.max, 10);
      if (!(pid > 0) || !(max >= 0) || max > 10000000) return j({ ok: false, error: "bad_request" }, 400);
      await env.DB.prepare("UPDATE assoc_org SET max_members=? WHERE pid=?").bind(max || null, pid).run();
      return j({ ok: true });
    }
    const r = (await env.DB.prepare("SELECT o.pid, o.max_members, o.updated_at, p.business_name, p.plan, (SELECT COUNT(*) FROM assoc_rec r WHERE r.pid=o.pid AND r.kind='member' AND r.del=0) AS members FROM assoc_org o LEFT JOIN travel_partners p ON p.id=o.pid ORDER BY members DESC LIMIT 500").all()).results || [];
    return j({ ok: true, orgs: r });
  }

  const mobile = clean(b.mobile, 20), device = clean(b.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return j({ ok: false, error: "unauthorized" }, 403);
  const me = phone10(mobile);

  if (action === "mine") {   /* organisations where I hold a post + my own memberships (Platinum) */
    const orgs = [], seen = {};
    const rr = (await env.DB.prepare("SELECT pid, data FROM assoc_rec WHERE kind='role' AND del=0 AND ph=? LIMIT 50").bind(me || "-").all()).results || [];
    for (const r of rr) {
      let d = {}; try { d = JSON.parse(r.data); } catch (e) {}
      if (!active(d) || seen[r.pid]) continue;
      const p = await env.DB.prepare("SELECT business_name, mobile1, mobile2 FROM travel_partners WHERE id=? AND business_type='association'").bind(r.pid).first();
      if (!p) continue;
      seen[r.pid] = 1; orgs.push({ pid: r.pid, name: p.business_name, title: d.title || "", access: d.access, own: phone10(p.mobile1) === me || phone10(p.mobile2) === me });
    }
    const mem = [];
    const mm = (await env.DB.prepare("SELECT pid, id, data FROM assoc_rec WHERE kind='member' AND del=0 AND ph=? LIMIT 20").bind(me || "-").all()).results || [];
    for (const m of mm) {
      const p = await env.DB.prepare("SELECT business_name, plan, plan_expires_at, platinum, business_type FROM travel_partners WHERE id=?").bind(m.pid).first();
      if (!p || p.business_type !== "association" || planLevel(p) < 3) continue;
      const o = await env.DB.prepare("SELECT cfg FROM assoc_org WHERE pid=?").bind(m.pid).first();
      const pays = ((await env.DB.prepare("SELECT data FROM assoc_rec WHERE pid=? AND kind='pay' AND del=0 AND json_extract(data,'$.mid')=? ORDER BY rev DESC LIMIT 60").bind(m.pid, m.id).all()).results || []).map((x) => JSON.parse(x.data));
      let cfg = {}; try { cfg = JSON.parse((o && o.cfg) || "{}"); } catch (e) {}
      mem.push({ pid: m.pid, org: cfg.org || p.business_name, cfg: { type: cfg.type, amt: cfg.amt, per: cfg.per, start: cfg.start, inclVeh: cfg.inclVeh, extraVeh: cfg.extraVeh }, member: JSON.parse(m.data), pays });
    }
    return j({ ok: true, orgs, member: mem });
  }

  const pid = parseInt(b.pid, 10);
  if (!(pid > 0)) return j({ ok: false, error: "bad_request" }, 400);
  const A = await accessOf(env, pid, mobile);
  if (!A.acc) return j({ ok: false, error: "no_access" }, 403);
  let org = await env.DB.prepare("SELECT * FROM assoc_org WHERE pid=?").bind(pid).first();
  const lim = await limits(env, A.lvl, org);
  const base = { ok: true, access: A.acc, title: A.title, level: A.lvl, cloud: !!org, limits: lim, name: A.p.business_name };
  const canWrite = (A.acc === "admin" || A.acc === "edit") && A.lvl >= 2;

  if (action === "status") return j(Object.assign(base, { rev: org ? org.rev : 0 }));

  if (action === "init") {   /* the phone book moves to the cloud (first time) */
    if (A.acc !== "admin" || A.lvl < 2) return j({ ok: false, error: A.lvl < 2 ? "plan" : "no_access" }, 403);
    if (org && org.rev > 0) return j({ ok: false, error: "already_in_cloud" }, 409);
    const bk = b.book || {}, cfg = bk.cfg || {};
    const cfgTxt = cleanCfg(cfg, {});
    const members = (bk.members || []).filter((m) => !m.del);
    if (members.length > lim.members) return j({ ok: false, error: "member_limit", limit: lim.members }, 400);
    if (!org) await env.DB.prepare("INSERT INTO assoc_org (pid, cfg, rev, rc_next, created_at, updated_at) VALUES (?,?,0,?,?,?)").bind(pid, cfgTxt, Math.max(1, parseInt(cfg.nextRc, 10) || 1), nowIso(), nowIso()).run();
    else await env.DB.prepare("UPDATE assoc_org SET cfg=?, rc_next=? WHERE pid=?").bind(cfgTxt, Math.max(1, parseInt(cfg.nextRc, 10) || 1), pid).run();
    org = await env.DB.prepare("SELECT * FROM assoc_org WHERE pid=?").bind(pid).first(); org.limit = lim.members;
    let n = 0;
    const KEY = { member: "members", pay: "pays", led: "led", min: "mins", act: "acts" };
    for (const kind of ["member", "pay", "led", "min", "act"]) {
      const list = Array.isArray(bk[KEY[kind]]) ? bk[KEY[kind]] : [];
      for (const r of list.slice(0, 50000)) {
        if (!ID_RE.test(String(r.id || ""))) continue;
        const txt = JSON.stringify(r); if (txt.length > (kind === "min" ? 60000 : 4000)) continue;
        const rev = await bump(env, pid, "rev");
        await env.DB.prepare("INSERT OR IGNORE INTO assoc_rec (pid, kind, id, data, ph, rev, del, by_mobile, at) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(pid, kind, r.id, txt, kind === "member" ? phone10(r.ph) || null : null, rev, r.del ? 1 : 0, me, nowIso()).run();
        n++;
      }
    }
    await log(env, pid, me, "book", "-", "init", n + " records moved to the cloud");
    return j(Object.assign(base, { cloud: true, rev: (await env.DB.prepare("SELECT rev FROM assoc_org WHERE pid=?").bind(pid).first()).rev, moved: n }));
  }

  if (!org) return j(Object.assign(base, { cloud: false }));

  if (action === "pull") {
    if (A.acc === "self") return j({ ok: false, error: "no_access" }, 403);
    const since = parseInt(b.since, 10) || 0;
    const recs = ((await env.DB.prepare("SELECT kind, id, data, del, rev, by_mobile, at FROM assoc_rec WHERE pid=? AND rev>? ORDER BY rev LIMIT 3000").bind(pid, since).all()).results || [])
      .map((r) => ({ kind: r.kind, id: r.id, data: JSON.parse(r.data), del: r.del, rev: r.rev, by: r.by_mobile, at: r.at }));
    let cfg = {}; try { cfg = JSON.parse(org.cfg || "{}"); } catch (e) {}
    cfg.nextRc = org.rc_next;
    return j(Object.assign(base, { rev: org.rev, cfg, recs, more: recs.length === 3000 }));
  }

  if (action === "push") {
    if (!canWrite) return j({ ok: false, error: A.lvl < 2 ? "plan" : "read_only" }, 403);
    org.limit = lim.members;
    const ops = Array.isArray(b.ops) ? b.ops.slice(0, 200) : [], results = [];
    for (const op of ops) {
      const kind = String(op.kind || ""), id = String(op.id || "");
      if (kind === "cfg") {
        if (A.acc !== "admin" && A.acc !== "edit") { results.push({ kind, ok: false, error: "no_access" }); continue; }
        const c = op.data || {}, old = JSON.parse(org.cfg || "{}");
        const cfgTxt = cleanCfg(c, old);
        const rev = await bump(env, pid, "rev");
        await env.DB.prepare("UPDATE assoc_org SET cfg=? WHERE pid=?").bind(cfgTxt, pid).run();
        org.cfg = cfgTxt;
        await log(env, pid, me, "cfg", "-", "edit", "₹" + (+c.amt || 0) + " / " + (c.per === "y" ? "year" : "month"));
        results.push({ kind, ok: true, rev }); continue;
      }
      if (kind === "role") {
        if (A.acc !== "admin") { results.push({ kind, id, ok: false, error: "no_access" }); continue; }
        const d = op.data || {};
        if (!["admin", "edit", "view"].includes(d.access)) { results.push({ kind, id, ok: false, error: "bad_access" }); continue; }
        if (!phone10(d.ph)) { results.push({ kind, id, ok: false, error: "bad_phone" }); continue; }
        if (!op.del && !(d.to && d.to < today()) && (d.access === "admin" || d.access === "edit" || d.access === "view")) {
          const activeN = A.roles.filter((r) => r.id !== id).length;
          if (activeN >= lim.roles) { results.push({ kind, id, ok: false, error: "role_limit", limit: lim.roles }); continue; }
        }
        d.id = id;
        const r = await writeRec(env, pid, me, kind, id, d, !!op.del, org);
        if (r.ok) { A.roles = A.roles.filter((x) => x.id !== id); if (!op.del && !(d.to && d.to < today())) A.roles.push(Object.assign({}, d, { ph: phone10(d.ph) })); }
        results.push(Object.assign({ kind, id }, r)); continue;
      }
      const r = await writeRec(env, pid, me, kind, id, op.data, !!op.del, org);
      results.push(Object.assign({ kind, id }, r));
    }
    const o2 = await env.DB.prepare("SELECT rev FROM assoc_org WHERE pid=?").bind(pid).first();
    return j(Object.assign(base, { rev: o2.rev, results }));
  }

  if (action === "handover") {   /* the organisation (its registration) goes to another admin's number */
    if (A.acc !== "admin") return j({ ok: false, error: "no_access" }, 403);
    const to = phone10(b.to);
    const r = A.roles.find((x) => x.ph === to && x.access === "admin");
    if (!to || !r) return j({ ok: false, error: "not_admin_role" }, 400);
    const u = await env.DB.prepare("SELECT mobile FROM app_users WHERE mobile=? OR mobile=?").bind(to, "91" + to).first();
    if (!u) return j({ ok: false, error: "not_registered" }, 400);
    await env.DB.prepare("UPDATE travel_partners SET mobile1=?, mobile2=NULL WHERE id=?").bind(u.mobile, pid).run();
    await log(env, pid, me, "book", "-", "handover", "to " + to + " (" + (r.title || "") + ")");
    return j({ ok: true });
  }

  if (action === "log") {
    if (A.acc === "self") return j({ ok: false, error: "no_access" }, 403);
    const before = parseInt(b.before, 10) || 2147483647;
    const r = (await env.DB.prepare("SELECT id, at, by_mobile, kind, rid, action, summary FROM assoc_log WHERE pid=? AND id<? ORDER BY id DESC LIMIT 200").bind(pid, before).all()).results || [];
    return j(Object.assign(base, { log: r }));
  }

  return j({ ok: false, error: "unknown_action" }, 400);
}
