import { deviceKnown } from "./_loginotp.js";
import { planLevel } from "./partner_media.js";
import { verifyAdminToken } from "./_auth_helper.js";

/* ============================================================================
   /api/assoc  -  ASSOCIATION BOOK IN THE CLOUD (phase 2, owner 2026-11-20).
   Unions, Kudumbashree, self-help groups, clubs: the book belongs to the ORGANISATION, not to one phone.
   - Plus / Premium / Platinum (planLevel >= 1; Plus Rs 100 = 100 members, owner 2026-11-20) of the association business keeps its book here; the phone keeps a copy and syncs.
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
   - Phase 4 (owner 2026-11-20, "state › district › zone › unit, national, taluk, panchayat ..."): COMMITTEES, records of kind "com"
     {name, lvl, parent ("" = the organisation itself, the top committee), share % to the upper committee, openCash, openBank}.
     A post (role) may belong to a committee (role.com): that office bearer sees and writes ONLY that committee and the committees
     below it (members, receipts, ledger, minutes, actions, posts) - checked here on every pull / push / log, not only on the phone.
     A post without a committee is for the whole organisation. Settings and the handover stay with the whole-organisation admin.
     A share sent up (ledger "remit", com = sender, to = upper committee) is an expense below and an income above - one record.
   POST JSON { mobile, device_token, pid, ... } with ?action=status | init | pull | push | log | mine ;
   admin: ?action=admin_list | admin_set_max { token, ... }.
   ========================================================================== */

const j = (o, s) => Response.json(o, { status: s || 200 });
const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const KINDS = ["member", "pay", "led", "min", "act", "role", "com"];
const MAX_COMS = 3000;
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
  const s = { assoc_limit_plus: 100, assoc_limit_premium: 10000, assoc_limit_platinum: 100000 };
  try {
    const r = (await env.DB.prepare("SELECT key, value FROM upgrade_settings WHERE key IN ('assoc_limit_plus','assoc_limit_premium','assoc_limit_platinum')").all()).results || [];
    r.forEach((x) => { s[x.key] = envInt(x.value, s[x.key]); });
  } catch (e) {}
  return s;
}
async function limits(env, lvl, org) {
  const s = await settings(env);
  let members = lvl >= 3 ? s.assoc_limit_platinum : (lvl >= 2 ? s.assoc_limit_premium : (lvl >= 1 ? s.assoc_limit_plus : 0));   /* owner 2026-11-20: Plus Rs 100 = 100 members with the cloud */
  if (org && org.max_members > members) members = org.max_members;
  return { members, roles: lvl >= 1 ? 100000 : 0 };   /* owner 2026-11-20: office bearers + executives - as many as the organisation has */
}
const active = (r) => r && !r.to || (r && r.to >= today());
/* the committee tree: id -> parent id ("" = the top) */
async function tree(env, pid) {
  const rows = (await env.DB.prepare("SELECT id, data FROM assoc_rec WHERE pid=? AND kind='com' AND del=0").bind(pid).all()).results || [];
  const par = {};
  rows.forEach((r) => { let d = {}; try { d = JSON.parse(r.data); } catch (e) {} par[r.id] = String(d.parent || ""); });
  return par;
}
function subtreeOf(par, roots) {
  const kids = {};
  Object.keys(par).forEach((id) => { (kids[par[id]] = kids[par[id]] || []).push(id); });
  const s = new Set(), st = roots.filter((x) => par[x] !== undefined);
  while (st.length) { const x = st.pop(); if (s.has(x)) continue; s.add(x); (kids[x] || []).forEach((k) => st.push(k)); }
  return s;
}
const inSub = (A, com) => !A.sub || A.sub.has(String(com || ""));

/* who is this person for this organisation? */
async function accessOf(env, pid, mobile) {
  const p = await env.DB.prepare("SELECT id, business_name, business_type, plan, plan_expires_at, platinum, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(pid).first();
  if (!p || p.business_type !== "association") return { acc: null };
  const lvl = planLevel(p), me = phone10(mobile);
  const roles = ((await env.DB.prepare("SELECT data, ph FROM assoc_rec WHERE pid=? AND kind='role' AND del=0").bind(pid).all()).results || [])
    .map((r) => { try { return Object.assign(JSON.parse(r.data), { ph: r.ph }); } catch (e) { return null; } }).filter((r) => r && active(r));
  const rank = { view: 1, edit: 2, admin: 3 };
  let acc = null, title = "", com = "";
  const mine = roles.filter((r) => r.ph && r.ph === me);
  const top = mine.filter((r) => !r.com), part = top.length ? top : mine;   /* a whole-organisation post decides; otherwise the committee posts */
  part.forEach((r) => { if ((rank[r.access] || 0) > (rank[acc] || 0)) { acc = r.access; title = r.title || ""; com = r.com || ""; } });
  let scope = top.length || !mine.length ? null : mine.map((r) => String(r.com));
  const owner = me && (phone10(p.mobile1) === me || phone10(p.mobile2) === me);
  if (owner) { acc = "admin"; title = (top.length && title) || "owner"; com = ""; scope = null; }
  let sub = null, par = null;
  if (scope) {
    par = await tree(env, pid); sub = subtreeOf(par, scope);
    scope = scope.filter((x) => par[x] !== undefined).filter((x, i, a) => a.indexOf(x) === i);
    if (!sub.size) { acc = null; scope = null; sub = null; }   /* the committee of the post is gone */
  }
  if (!acc && lvl >= 3 && me) {
    const m = await env.DB.prepare("SELECT id FROM assoc_rec WHERE pid=? AND kind='member' AND del=0 AND ph=? LIMIT 1").bind(pid, me).first();
    if (m) acc = "self";
  }
  return { acc, title, com, lvl, p, roles, scope, sub, par };
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
  if (kind === "com") return (d.name || "") + (d.lvl ? " (" + d.lvl + ")" : "") + (+d.share > 0 ? " share " + d.share + "%" : "");
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
async function memberCom(env, pid, mid) {
  const m = await env.DB.prepare("SELECT data FROM assoc_rec WHERE pid=? AND kind='member' AND id=?").bind(pid, String(mid || "")).first();
  if (!m) return null;
  try { return String(JSON.parse(m.data).com || ""); } catch (e) { return ""; }
}
async function writeRec(env, pid, by, kind, id, data, del, org, A) {
  if (!KINDS.includes(kind) || !ID_RE.test(String(id || ""))) return { ok: false, error: "bad_record" };
  const txt = JSON.stringify(data || {});
  if (txt.length > (kind === "min" ? 60000 : 4000)) return { ok: false, error: "too_large" };   /* minutes of a big meeting: about 25 pages */
  const old = await env.DB.prepare("SELECT data, del FROM assoc_rec WHERE pid=? AND kind=? AND id=?").bind(pid, kind, id).first();
  if (old && old.del) return { ok: true, ignored: "cancelled" };                 /* cancelled stays cancelled */
  let d = data || {}, action = old ? (del ? "cancel" : "edit") : "add";
  let od = {}; if (old) { try { od = JSON.parse(old.data); } catch (e) {} }
  if (del && old && (!data || !Object.keys(data).length)) d = Object.assign({}, od);   /* a bare "cancel" keeps the record as it was */
  A = A || {};
  /* ---- committees (phase 4): where does this record belong, and may this person touch it? ---- */
  if (kind === "com") {
    const par = A.par || await tree(env, pid);
    const parent = String(d.parent || "");
    if (parent && par[parent] === undefined) return { ok: false, error: "bad_parent" };
    for (let x = parent, n = 0; x && n < 100; x = par[x], n++) if (x === id) return { ok: false, error: "bad_parent" };   /* no loops */
    if (A.sub) {   /* a committee office bearer: only committees BELOW his own */
      if (!A.sub.has(parent) || (A.scope || []).includes(id) || (old && !A.sub.has(String(od.parent || "")))) return { ok: false, error: "out_of_scope" };
    }
    if (!old && Object.keys(par).length >= MAX_COMS) return { ok: false, error: "com_limit" };
    d = { name: clean(d.name, 60), lvl: clean(d.lvl, 30), parent, share: Math.min(100, Math.max(0, +d.share || 0)), openCash: +d.openCash || 0, openBank: +d.openBank || 0 };
    if (!d.name) return { ok: false, error: "bad_record" };
  } else if (kind === "pay") {
    const mc = await memberCom(env, pid, (old ? od : d).mid);
    if (!old) d.com = mc == null ? String(d.com || "") : mc;                     /* a receipt belongs to the member's committee */
    if (!inSub(A, old ? od.com : d.com) && !inSub(A, mc)) return { ok: false, error: "out_of_scope" };
  } else if (kind === "act") {
    const mc = await memberCom(env, pid, d.mid);
    if (mc != null) d.com = mc;
    if (!inSub(A, d.com) || (old && !inSub(A, od.com))) return { ok: false, error: "out_of_scope" };
  } else {
    if (kind === "role" || kind === "min" || kind === "led" || kind === "member") {
      d.com = String(d.com || "");
      if (!inSub(A, d.com) || (old && !inSub(A, od.com))) return { ok: false, error: "out_of_scope" };
      if (kind === "led" && d.cat === "remit" && !del) {   /* a share always goes to the committee directly above the sender */
        const par = A.par || await tree(env, pid);
        if (!d.com || par[d.com] === undefined) return { ok: false, error: "bad_parent" };
        d.to = par[d.com]; d.t = "out";
      }
    }
  }
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
  if (kind === "member" && old && String(od.com || "") !== String(d.com || "")) {   /* moved to another committee: his receipts / actions go to the new office bearers' phones too */
    const rr = (await env.DB.prepare("SELECT kind, id FROM assoc_rec WHERE pid=? AND kind IN ('pay','act') AND json_extract(data,'$.mid')=? LIMIT 2000").bind(pid, id).all()).results || [];
    for (const x of rr) { const r2 = await bump(env, pid, "rev"); await env.DB.prepare("UPDATE assoc_rec SET rev=? WHERE pid=? AND kind=? AND id=?").bind(r2, pid, x.kind, x.id).run(); }
  }
  return { ok: true, rc: d.rc, rev };
}
/* may this (scoped) person see this record? memCom: member id -> committee */
function visible(A, kind, d, memCom) {
  if (!A.sub) return true;
  if (kind === "com") return true;                                                /* the names of the committees: everybody (for the path) */
  if (kind === "pay" || kind === "act") return inSub(A, d.com) || (memCom[d.mid] != null && inSub(A, memCom[d.mid]));
  return inSub(A, d.com);
}
async function memComs(env, pid) {
  const o = {};
  const rr = (await env.DB.prepare("SELECT id, json_extract(data,'$.com') AS c FROM assoc_rec WHERE pid=? AND kind='member'").bind(pid).all()).results || [];
  rr.forEach((r) => { o[r.id] = String(r.c || ""); });
  return o;
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
      let cn = "";
      if (d.com) { const c = await env.DB.prepare("SELECT data FROM assoc_rec WHERE pid=? AND kind='com' AND id=? AND del=0").bind(r.pid, String(d.com)).first(); try { cn = c ? JSON.parse(c.data).name || "" : ""; } catch (e) {} }
      seen[r.pid] = 1; orgs.push({ pid: r.pid, name: p.business_name, title: (d.title || "") + (cn ? " · " + cn : ""), access: d.access, own: phone10(p.mobile1) === me || phone10(p.mobile2) === me });
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
  const base = { ok: true, access: A.acc, title: A.title, com: A.com, scope: A.scope, scopeKey: A.scope ? A.scope.slice().sort().join(",") : "*", level: A.lvl, cloud: !!org, limits: lim, name: A.p.business_name };
  const canWrite = (A.acc === "admin" || A.acc === "edit") && A.lvl >= 1;   /* the cloud book from Plus (Rs 100) */

  if (action === "status") return j(Object.assign(base, { rev: org ? org.rev : 0 }));

  if (action === "init") {   /* the phone book moves to the cloud (first time) */
    if (A.acc !== "admin" || A.lvl < 1) return j({ ok: false, error: A.lvl < 1 ? "plan" : "no_access" }, 403);
    if (org && org.rev > 0) return j({ ok: false, error: "already_in_cloud" }, 409);
    const bk = b.book || {}, cfg = bk.cfg || {};
    const cfgTxt = cleanCfg(cfg, {});
    const members = (bk.members || []).filter((m) => !m.del);
    if (members.length > lim.members) return j({ ok: false, error: "member_limit", limit: lim.members }, 400);
    if (!org) await env.DB.prepare("INSERT INTO assoc_org (pid, cfg, rev, rc_next, created_at, updated_at) VALUES (?,?,0,?,?,?)").bind(pid, cfgTxt, Math.max(1, parseInt(cfg.nextRc, 10) || 1), nowIso(), nowIso()).run();
    else await env.DB.prepare("UPDATE assoc_org SET cfg=?, rc_next=? WHERE pid=?").bind(cfgTxt, Math.max(1, parseInt(cfg.nextRc, 10) || 1), pid).run();
    org = await env.DB.prepare("SELECT * FROM assoc_org WHERE pid=?").bind(pid).first(); org.limit = lim.members;
    let n = 0;
    const KEY = { com: "coms", member: "members", pay: "pays", led: "led", min: "mins", act: "acts" };
    for (const kind of ["com", "member", "pay", "led", "min", "act"]) {
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
    const rows = (await env.DB.prepare("SELECT kind, id, data, del, rev, by_mobile, at FROM assoc_rec WHERE pid=? AND rev>? ORDER BY rev LIMIT 3000").bind(pid, since).all()).results || [];
    const memCom = A.sub && rows.some((r) => r.kind === "pay" || r.kind === "act") ? await memComs(env, pid) : {};
    const recs = rows.map((r) => ({ kind: r.kind, id: r.id, data: JSON.parse(r.data), del: r.del, rev: r.rev, by: r.by_mobile, at: r.at }))
      .filter((r) => visible(A, r.kind, r.data, memCom))
      .map((r) => (A.sub && r.kind === "com" && !A.sub.has(r.id) ? Object.assign(r, { data: { name: r.data.name, lvl: r.data.lvl, parent: r.data.parent } }) : r));   /* other committees: only the name (for the path), not their money */
    let cfg = {}; try { cfg = JSON.parse(org.cfg || "{}"); } catch (e) {}
    cfg.nextRc = org.rc_next;
    const more = rows.length === 3000;
    return j(Object.assign(base, { rev: more ? rows[rows.length - 1].rev : org.rev, cfg, recs, more }));
  }

  if (action === "push") {
    if (!canWrite) return j({ ok: false, error: A.lvl < 1 ? "plan" : "read_only" }, 403);
    org.limit = lim.members;
    const ops = Array.isArray(b.ops) ? b.ops.slice(0, 200) : [], results = [];
    for (const op of ops) {
      const kind = String(op.kind || ""), id = String(op.id || "");
      if (kind === "cfg") {
        if ((A.acc !== "admin" && A.acc !== "edit") || A.sub) { results.push({ kind, ok: false, error: A.sub ? "out_of_scope" : "no_access" }); continue; }
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
        const r = await writeRec(env, pid, me, kind, id, d, !!op.del, org, A);
        if (r.ok) { A.roles = A.roles.filter((x) => x.id !== id); if (!op.del && !(d.to && d.to < today())) A.roles.push(Object.assign({}, d, { ph: phone10(d.ph) })); }
        results.push(Object.assign({ kind, id }, r)); continue;
      }
      if (kind === "com" && A.acc !== "admin") { results.push({ kind, id, ok: false, error: "no_access" }); continue; }
      const r = await writeRec(env, pid, me, kind, id, op.data, !!op.del, org, A);
      if (kind === "com" && r.ok && A.par) { if (op.del) delete A.par[id]; else A.par[id] = String((op.data || {}).parent || ""); if (A.sub && !op.del) A.sub.add(id); }
      results.push(Object.assign({ kind, id }, r));
    }
    const o2 = await env.DB.prepare("SELECT rev FROM assoc_org WHERE pid=?").bind(pid).first();
    return j(Object.assign(base, { rev: o2.rev, results }));
  }

  if (action === "handover") {   /* the organisation (its registration) goes to another admin's number */
    if (A.acc !== "admin" || A.sub) return j({ ok: false, error: "no_access" }, 403);
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
    let r = (await env.DB.prepare("SELECT id, at, by_mobile, kind, rid, action, summary FROM assoc_log WHERE pid=? AND id<? ORDER BY id DESC LIMIT 200").bind(pid, before).all()).results || [];
    if (A.sub) {   /* a committee office bearer: only the changes of his own part of the tree */
      const ids = [...new Set(r.filter((x) => KINDS.includes(x.kind)).map((x) => x.rid))], recs = {};
      for (let i = 0; i < ids.length; i += 90) {
        const part = ids.slice(i, i + 90);
        const rr = (await env.DB.prepare("SELECT kind, id, data FROM assoc_rec WHERE pid=? AND id IN (" + part.map(() => "?").join(",") + ")").bind(pid, ...part).all()).results || [];
        rr.forEach((x) => { try { recs[x.kind + ":" + x.id] = JSON.parse(x.data); } catch (e) {} });
      }
      const memCom = await memComs(env, pid), last = r.length ? r[r.length - 1].id : 0;
      r = r.filter((x) => { const d = recs[x.kind + ":" + x.rid]; return d && x.kind !== "com" && visible(A, x.kind, d, memCom); });
      return j(Object.assign(base, { log: r, last }));
    }
    return j(Object.assign(base, { log: r }));
  }

  return j({ ok: false, error: "unknown_action" }, 400);
}
