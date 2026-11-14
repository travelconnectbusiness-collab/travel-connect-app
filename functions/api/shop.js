/* functions/api/shop.js - shared records of the shop module (aquarium / pet shop accounts, phone screens in tc-shop*.js).
   The shop book is kept as an APPEND-ONLY list of small records (sale, purchase, dead fish, expense, product ...). Every record has an
   id made on the phone, so a record sent twice is stored once, and two phones (the owner's and the shop's) can both add records and
   both read all of them. A correction is a new record that cancels the old one - nothing is ever overwritten here.
     POST /api/shop?action=push  { records:[{id,k,d,x}] }  -> { ok, saved, last }      (up to 120 records per call)
     POST /api/shop?action=pull  { since:<seq> }           -> { ok, rows:[{seq,id,k,d,x}], more }   (400 rows per call)
   WHO: only a logged-in phone (headers X-TC-Mobile + X-TC-Device must be a known, not blocked device of that mobile). This check is
   always ON for shop data (money figures), whatever the soft/enforce switch of the other endpoints says. The book belongs to that
   mobile number: every phone logged in with the same number sees the same book.
   2026-11-14: an account WITHOUT a verified e-mail may use the book on ONE phone only (answer 403 email_required when a second phone is logged in);
   login itself refuses / code-gates a new phone on an account that keeps a book (see _loginotp.js loginGate).
   STAFF (2026-11-14, owner: "staff record sales / purchases on the spot, the owner sees everything, staff must NOT see profit or purchase cost or delete"):
   the OWNER (logged in with the shop's mobile) makes staff entries (name + role) and gets a one-time 6-digit join code per staff (valid 24 h). The staff member logs in
   to the app with HIS OWN number as usual, opens "Shop staff login", types the shop's mobile + the code: this phone (device token) is bound to that staff entry
   (one phone per staff; a new code unbinds the old phone). Afterwards the phone sends the header X-TC-Shop = the shop's mobile and the SERVER treats every call as that staff:
     role "sale"  : may push sales only                        role "stock": may push sales, purchases, dead/loss and stock corrections
     never        : cancel / edit (kind v), products, settings, expenses, money records, lock, reseal, staff management
   pull for staff drops expenses and money records, drops settings except name / kind / gst / gstin, removes cost fields (product opening value / estimated cost / own profit %,
   purchase rate / transport / unpaid part / supplier / bill no.) and shows other people's sales as quantities only (no price, payment or customer); the staff's own sales are complete.
   Every record pushed by staff is stamped by the server with sid (staff id) and sn (staff name) - a phone cannot name another seller.
   A shop with staff can not switch the password lock ON (the server could not strip or stamp encrypted records), and staff are refused while the book is locked.
     POST ?action=staff_list | staff_save {sid?,name,role,active?,regen?} | staff_remove {sid}   (owner only; staff_save answers a new join code when one is made)
     POST ?action=staff_login {owner, code}   (any logged-in phone; rate limited)         POST ?action=me   -> { ok, role, name, owner }
   Pull answers carry next = the last seq of the page (staff pages can be empty after filtering, the phone must still move on).
   FREE PLAN: a push is at most 8 insert statements of 16 rows (D1 allows 100 bound values per statement) + 3 small queries.
   PASSWORD LOCK (2026-10-30, owner: 'encrypt the shop book too'): the phone can encrypt the payload x of every record (AES-256-GCM, key from the person's password,
   see tc-shoplock.js): x = { __e:1, iv, ct } (base64). The server never sees the key. Table shop_lock holds, per mobile, whether the book is LOCKED plus the (public) salt /
   rounds of the key derivation, so another phone knows how to derive the key from the password (kept after switching off, so rows that are still encrypted can be opened). While the book is locked a PLAIN record is refused (locked_book) - a phone
   that does not hold the key can not mix plain records into a locked book. Every push / pull answer carries lock:{locked,salt,iter}.
     POST /api/shop?action=lock    { locked:true, salt, iter } | { locked:false }     -> { ok, lock }
     POST /api/shop?action=reseal  { records:[{id,ts,x}] }  (up to 30)               -> { ok, updated }   replaces the payload of EXISTING records of this mobile
   (this is how the old plain records are locked once, and how they are unlocked / re-locked after turning off / changing the password).
   FREE YEAR, THEN FREE VERSION (2026-11-12, owner: shops, workshops and every other NON-taxi business get all Premium tools free for ONE year, then new entries need Premium):
   the SERVER decides, so a second phone, cleared app data or a changed app cannot restart or skip it. planOf(owner) looks at the businesses of this mobile number:
     - no business, or only Taxi / Auto / Pickup businesses (their own 2 free months are handled elsewhere) -> "prem" (nothing is limited)
     - any business of this mobile with a running Premium plan (or an owner plan) -> "prem"
     - otherwise the free year starts on the EARLIEST of: registration day of any business with this mobile number OR the same e-mail address (never before LAUNCH, so
       businesses that already existed get a full year from LAUNCH), and the first day this server saw the shop book of any of those mobile numbers (table shop_plan).
       Registering again with the same mobile or the same e-mail therefore does not give a new year.
   After the year without Premium the book is VIEW ONLY: pull works as always, a push keeps only settings ('c'); every other record is dropped (answer: ok + plan + dropped), so old data stays,
   keeps syncing to other phones and comes back to life when Premium is taken. Every pull / push answer carries plan:{mode:"prem"|"trial"|"locked", end, left} (the phone shows it).
   The answer is cached for 5 minutes per mobile (D1 reads are limited on the free plan). */
import { callerOf } from "./_devauth.js";
import { allowed } from "./_ratelimit.js";
import { shopProtect } from "./_loginotp.js";
import { planLevel } from "./partner_media.js";

const KINDS = new Set(["p", "s", "b", "m", "e", "o", "v", "a", "c"]);   /* product, sale, purchase, dead / loss, expense, owner money, void, stock adjust, setting */
const MAX_PUSH = 120, ROWS = 16, PAGE = 400, MAX_BYTES = 3000, MAX_BYTES_ENC = 5200, MAX_RECORDS = 150000, MAX_RESEAL = 30;
const LAUNCH = "2026-11-12", YEAR_DAYS = 365, PLAN_TTL = 300000;
const STAFF_KINDS = { sale: new Set(["s"]), stock: new Set(["s", "b", "m", "a"]) };
const STAFF_CFG = new Set(["name", "kind", "gst", "gstin"]);
const CODE_HOURS = 24;
const TAXI_TYPES = new Set(["taxi_travel", "taxi", "auto", "pickup", "vehicle"]);
const CREATED_COLS = ["created_at", "created", "registered_at", "createdAt", "created_on", "joined_at", "inserted_at"];
const PLAN_CACHE = new Map();
let ready = false, createdCol;

async function init(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_records (seq INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, d TEXT, data TEXT NOT NULL, UNIQUE(owner, id))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_shop_owner_seq ON shop_records (owner, seq)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_lock (owner TEXT PRIMARY KEY, locked INTEGER NOT NULL DEFAULT 0, salt TEXT, iter INTEGER, ts TEXT)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_plan (owner TEXT PRIMARY KEY, start TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_staff (owner TEXT NOT NULL, sid TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, code_hash TEXT, code_exp INTEGER, device TEXT, smobile TEXT, created TEXT, PRIMARY KEY(owner, sid))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_shop_staff_dev ON shop_staff (device)").run();
  ready = true;
}

/* which column of travel_partners holds the registration time (the name is looked up once) */
async function createdColumn(env) {
  if (createdCol !== undefined) return createdCol;
  createdCol = "";
  try {
    const { results } = await env.DB.prepare("PRAGMA table_info(travel_partners)").all();
    const names = (results || []).map((r) => r.name);
    createdCol = CREATED_COLS.find((n) => names.includes(n)) || "";
  } catch (e) { /* no registration date known: the first-seen day below is used */ }
  return createdCol;
}
function dayOf(v) {
  if (v == null || v === "") return "";
  let t;
  if (typeof v === "number") t = v < 1e11 ? v * 1000 : v;
  else { const s = String(v).trim().replace(" ", "T"); t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) || s.length <= 10 ? s : s + "Z"); }
  return isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}
const addDays = (day, n) => new Date(Date.parse(day + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

async function planOf(env, owner) {
  const hit = PLAN_CACHE.get(owner);
  if (hit && Date.now() - hit.at < PLAN_TTL) return hit.v;
  let v = { mode: "prem" };
  try {
    const mine = ((await env.DB.prepare("SELECT * FROM travel_partners WHERE mobile1=? OR mobile2=?").bind(owner, owner).all()).results) || [];
    if (mine.length && mine.some((p) => !TAXI_TYPES.has(String(p.business_type || ""))) && !mine.some((p) => planLevel(p) >= 2)) {
      const col = await createdColumn(env);
      const today = new Date().toISOString().slice(0, 10);
      const emails = [...new Set(mine.map((p) => String(p.email || "").trim().toLowerCase()).filter(Boolean))].slice(0, 5);
      let group = mine;
      if (emails.length) {
        const rel = ((await env.DB.prepare("SELECT * FROM travel_partners WHERE lower(email) IN (" + emails.map(() => "?").join(",") + ")").bind(...emails).all()).results) || [];
        group = mine.concat(rel);
      }
      const mobiles = new Set([owner]);
      group.forEach((p) => { if (p.mobile1) mobiles.add(String(p.mobile1)); if (p.mobile2) mobiles.add(String(p.mobile2)); });
      let start = "9999-12-31";
      if (col) group.forEach((p) => { const d = dayOf(p[col]); const s = d && d > LAUNCH ? d : LAUNCH; if (s < start) start = s; });
      await env.DB.prepare("INSERT OR IGNORE INTO shop_plan (owner, start) VALUES (?,?)").bind(owner, today > LAUNCH ? today : LAUNCH).run();
      const list = [...mobiles].slice(0, 12);
      const row = await env.DB.prepare("SELECT MIN(start) AS s FROM shop_plan WHERE owner IN (" + list.map(() => "?").join(",") + ")").bind(...list).first();
      if (row && row.s && row.s < start) start = row.s;
      const end = addDays(start, YEAR_DAYS), left = daysBetween(today, end);
      v = left > 0 ? { mode: "trial", end, left } : { mode: "locked", end, left: 0 };
    }
  } catch (e) { v = { mode: "prem" }; }   /* if the check itself fails, nobody is locked out */
  PLAN_CACHE.set(owner, { at: Date.now(), v });
  return v;
}

const isEnc = (x) => !!(x && x.__e === 1 && typeof x.iv === "string" && typeof x.ct === "string" && x.iv.length <= 40 && x.ct.length <= 6000 && /^[A-Za-z0-9+/=]*$/.test(x.iv) && /^[A-Za-z0-9+/=]*$/.test(x.ct));
async function lockOf(env, owner) {
  const r = await env.DB.prepare("SELECT locked, salt, iter FROM shop_lock WHERE owner=?").bind(owner).first();
  return r ? { locked: r.locked ? 1 : 0, salt: r.salt || "", iter: r.iter || 0 } : { locked: 0, salt: "", iter: 0 };
}

/* ---------------- staff ---------------- */
const sha256Hex = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const cleanName = (s) => String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
function newCode() { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(100000 + (a[0] % 900000)); }
function newSid() { const a = new Uint8Array(5); crypto.getRandomValues(a); return "s" + [...a].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function staffLimit(env, owner) {
  try {
    const mine = ((await env.DB.prepare("SELECT * FROM travel_partners WHERE mobile1=? OR mobile2=?").bind(owner, owner).all()).results) || [];
    return mine.some((p) => planLevel(p) >= 3) ? 10 : 2;
  } catch (e) { return 2; }
}
/* who is calling: the owner of the book (logged in with its mobile) or a bound staff phone (header X-TC-Shop) */
async function whoIs(env, c, request) {
  const shopHdr = String(request.headers.get("X-TC-Shop") || "").trim().slice(0, 20);
  if (!shopHdr || shopHdr === c.mobile) return { role: "owner", owner: c.mobile };
  const st = await env.DB.prepare("SELECT sid, name, role FROM shop_staff WHERE owner=? AND device=? AND smobile=? AND active=1").bind(shopHdr, c.device, c.mobile).first();
  if (!st || !STAFF_KINDS[st.role]) return null;
  return { role: "staff", owner: shopHdr, sid: st.sid, name: st.name, srole: st.role };
}
/* one pulled row as a staff phone may see it (null = not at all) */
function forStaff(row, w) {
  const x = row.x || {};
  if (x.__e === 1) return null;
  switch (row.k) {
    case "p": { const o = Object.assign({}, x); delete o.ov; delete o.ec; delete o.mp; return Object.assign({}, row, { x: o }); }
    case "s": {
      if (x.sid === w.sid) return row;
      return Object.assign({}, row, { x: { p: x.p, q: x.q, g: x.g, sid: x.sid, sn: x.sn } });
    }
    case "b": { const o = Object.assign({}, x); ["rt", "tr", "cr", "su", "bn", "ln", "pr", "no"].forEach((k) => { delete o[k]; }); return Object.assign({}, row, { x: o }); }
    case "m": case "a": case "v": return row;
    case "c": return STAFF_CFG.has(x.k) ? row : null;
    default: return null;   /* e expenses, o money records */
  }
}
function stamp(r, w) {
  if (!r || typeof r !== "object" || !r.x || typeof r.x !== "object" || Array.isArray(r.x)) return r;
  return Object.assign({}, r, { x: Object.assign({}, r.x, { sid: w.sid, sn: w.name }) });
}

function clean(r) {
  if (!r || typeof r !== "object") return null;
  const id = String(r.id == null ? "" : r.id);
  if (!/^[A-Za-z0-9_.-]{4,64}$/.test(id)) return null;
  const k = String(r.k || "");
  if (!KINDS.has(k)) return null;
  const d = r.d == null || r.d === "" ? "" : String(r.d);
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const x = r.x && typeof r.x === "object" ? r.x : {};
  const enc = isEnc(x);
  if (x.__e !== undefined && !enc) return null;      /* a half-made encrypted payload is never stored */
  const data = JSON.stringify({ ts: String(r.ts || "").slice(0, 30), x });
  if (data.length > (enc ? MAX_BYTES_ENC : MAX_BYTES)) return null;
  return { id, k, d, data, enc };
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  const c = await callerOf(env, request);
  if (!c.valid) return Response.json({ ok: false, error: "device_unverified", why: c.why }, { status: 403 });
  try { await init(env); } catch (e) { return Response.json({ ok: false, error: "server_error" }, { status: 500 }); }

  /* a staff member joining: any logged-in phone, the code is the proof */
  if (action === "staff_login") {
    const ip = (request.headers.get("CF-Connecting-IP") || "x").slice(0, 45);
    const own = String(body && body.owner || "").trim().slice(0, 20), code = String(body && body.code || "").trim();
    if (!(await allowed(env, "stl:" + own, 10, 900)) || !(await allowed(env, "stlip:" + ip, 30, 900)) || !(await allowed(env, "stlm:" + c.mobile, 10, 900))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    if (!/^\d{6,13}$/.test(own) || !/^\d{6}$/.test(code) || own === c.mobile) return Response.json({ ok: false, error: "bad_code" }, { status: 400 });
    const hash = await sha256Hex(own + ":" + code);
    const st = await env.DB.prepare("SELECT sid, name, role FROM shop_staff WHERE owner=? AND code_hash=? AND code_exp>? AND active=1").bind(own, hash, Date.now()).first();
    if (!st) return Response.json({ ok: false, error: "bad_code" }, { status: 400 });
    await env.DB.prepare("UPDATE shop_staff SET device=NULL, smobile=NULL WHERE owner=? AND device=?").bind(own, c.device).run();   /* a phone is one staff member only */
    await env.DB.prepare("UPDATE shop_staff SET device=?, smobile=?, code_hash=NULL, code_exp=NULL WHERE owner=? AND sid=?").bind(c.device, c.mobile, own, st.sid).run();
    return Response.json({ ok: true, owner: own, sid: st.sid, name: st.name, role: st.role });
  }

  const w = await whoIs(env, c, request);
  if (!w) return Response.json({ ok: false, error: "staff_unknown" }, { status: 403 });
  const owner = w.owner, isStaff = w.role === "staff";
  /* a book whose account has no verified e-mail works on ONE phone only; a second phone must verify the e-mail first (see _loginotp.js shopProtect) */
  { const sp = await shopProtect(env, c.mobile); if (!sp.ok && !isStaff) return Response.json({ ok: false, error: sp.error, why: "second_phone_no_email" }, { status: 403 }); }
  if (isStaff && !["pull", "push", "me"].includes(action)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  if (action === "me") return Response.json({ ok: true, role: isStaff ? w.srole : "owner", name: isStaff ? w.name : "", owner });

  if (action === "staff_list") {
    const { results } = await env.DB.prepare("SELECT sid, name, role, active, code_hash, code_exp, device, created FROM shop_staff WHERE owner=? ORDER BY created").bind(owner).all();
    const now = Date.now();
    return Response.json({ ok: true, limit: await staffLimit(env, owner), staff: (results || []).map((r) => ({ sid: r.sid, name: r.name, role: r.role, active: r.active ? 1 : 0, bound: !!r.device, pending: !!(r.code_hash && r.code_exp > now) })) });
  }
  if (action === "staff_save") {
    if (!(await allowed(env, "stsave:" + owner, 60, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const name = cleanName(body && body.name), role = String(body && body.role || "");
    if (!name || !STAFF_KINDS[role]) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
    const lk = await lockOf(env, owner);
    if (lk.locked) return Response.json({ ok: false, error: "lock_on" }, { status: 409 });   /* a locked book can not be shown to staff */
    let sid = String(body && body.sid || "");
    const active = body && body.active === 0 ? 0 : 1;
    let existing = null;
    if (sid) { existing = await env.DB.prepare("SELECT sid FROM shop_staff WHERE owner=? AND sid=?").bind(owner, sid).first(); if (!existing) return Response.json({ ok: false, error: "not_found" }, { status: 404 }); }
    if (!existing || active) {
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM shop_staff WHERE owner=? AND active=1 AND sid<>?").bind(owner, sid || "-").first();
      if (n && n.n + 1 > (await staffLimit(env, owner))) return Response.json({ ok: false, error: "staff_limit", limit: await staffLimit(env, owner) }, { status: 409 });
    }
    let code = "";
    const regen = !existing || !!(body && body.regen);
    if (!existing) sid = newSid();
    if (regen && active) code = newCode();
    if (!existing) {
      await env.DB.prepare("INSERT INTO shop_staff (owner, sid, name, role, active, code_hash, code_exp, created) VALUES (?,?,?,?,?,?,?,?)")
        .bind(owner, sid, name, role, active, code ? await sha256Hex(owner + ":" + code) : null, code ? Date.now() + CODE_HOURS * 3600000 : null, new Date().toISOString()).run();
    } else {
      await env.DB.prepare("UPDATE shop_staff SET name=?, role=?, active=? WHERE owner=? AND sid=?").bind(name, role, active, owner, sid).run();
      if (!active) await env.DB.prepare("UPDATE shop_staff SET device=NULL, smobile=NULL, code_hash=NULL, code_exp=NULL WHERE owner=? AND sid=?").bind(owner, sid).run();
      if (code) await env.DB.prepare("UPDATE shop_staff SET code_hash=?, code_exp=?, device=NULL, smobile=NULL WHERE owner=? AND sid=?").bind(await sha256Hex(owner + ":" + code), Date.now() + CODE_HOURS * 3600000, owner, sid).run();
    }
    return Response.json({ ok: true, sid, code, hours: CODE_HOURS });
  }
  if (action === "staff_remove") {
    const sid = String(body && body.sid || "");
    await env.DB.prepare("DELETE FROM shop_staff WHERE owner=? AND sid=?").bind(owner, sid).run();
    return Response.json({ ok: true });
  }

  if (action === "pull") {
    const since = Math.max(0, parseInt(body && body.since, 10) || 0);
    const { results } = await env.DB.prepare("SELECT seq, id, kind, d, data FROM shop_records WHERE owner=? AND seq>? ORDER BY seq LIMIT ?").bind(owner, since, PAGE + 1).all();
    const list = results || [];
    const more = list.length > PAGE;
    const page = list.slice(0, PAGE);
    let rows = page.map((r) => {
      let o = {}; try { o = JSON.parse(r.data); } catch (e) {}
      return { seq: r.seq, id: r.id, k: r.kind, d: r.d || "", ts: o.ts || "", x: o.x || {} };
    });
    const lkP = await lockOf(env, owner);
    if (isStaff) {
      if (lkP.locked) return Response.json({ ok: false, error: "locked_book" }, { status: 409 });
      rows = rows.map((r) => forStaff(r, w)).filter(Boolean);
    }
    return Response.json({ ok: true, rows, more, next: page.length ? page[page.length - 1].seq : since, lock: isStaff ? { locked: 0, salt: "", iter: 0 } : lkP, plan: await planOf(env, owner) });
  }

  if (action === "push") {
    if (!(await allowed(env, "shop:" + owner + (isStaff ? ":" + w.sid : ""), 400, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const src = Array.isArray(body && body.records) ? body.records.slice(0, MAX_PUSH) : [];
    const recs = [], seen = new Set();
    let rejected = 0;
    for (const r of src) {
      if (isStaff && !(r && STAFF_KINDS[w.srole].has(String(r.k)))) { rejected++; continue; }   /* staff: only the kinds of the role, never cancel / edit / money */
      const o = clean(isStaff ? stamp(r, w) : r);
      if (o && !seen.has(o.id)) { seen.add(o.id); recs.push(o); }
    }
    const lk = await lockOf(env, owner);
    if (isStaff && lk.locked) return Response.json({ ok: false, error: "locked_book" }, { status: 409 });
    if (!recs.length) return Response.json({ ok: true, saved: 0, last: 0, lock: lk, rejected });
    if (lk.locked && recs.some((o) => !o.enc)) return Response.json({ ok: false, error: "locked_book", lock: lk }, { status: 409 });
    /* after the free year without Premium only settings are kept (view only); the phone is told, nothing already stored is touched */
    const plan = await planOf(env, owner);
    const asked = recs.length;
    if (plan.mode === "locked") {
      for (let i = recs.length - 1; i >= 0; i--) if (recs[i].k !== "c") recs.splice(i, 1);
      if (!recs.length) return Response.json({ ok: true, saved: 0, last: 0, lock: lk, plan, dropped: asked, rejected });
    }
    const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM shop_records WHERE owner=?").bind(owner).first();
    if (cnt && cnt.n + recs.length > MAX_RECORDS) return Response.json({ ok: false, error: "book_full" }, { status: 413 });
    let saved = 0;
    for (let i = 0; i < recs.length; i += ROWS) {
      const part = recs.slice(i, i + ROWS);
      const sql = "INSERT OR IGNORE INTO shop_records (owner, id, kind, d, data) VALUES " + part.map(() => "(?,?,?,?,?)").join(",");
      const args = []; part.forEach((o) => args.push(owner, o.id, o.k, o.d, o.data));
      const r = await env.DB.prepare(sql).bind(...args).run();
      saved += (r && r.meta && r.meta.changes) || 0;
    }
    const last = await env.DB.prepare("SELECT MAX(seq) AS m FROM shop_records WHERE owner=?").bind(owner).first();
    return Response.json({ ok: true, saved, last: (last && last.m) || 0, lock: lk, plan, dropped: asked - recs.length, rejected });
  }

  if (action === "lock") {
    if (!(await allowed(env, "shoplock:" + owner, 60, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    if (body && body.locked) {
      const sc = await env.DB.prepare("SELECT COUNT(*) AS n FROM shop_staff WHERE owner=? AND active=1").bind(owner).first();
      if (sc && sc.n > 0) return Response.json({ ok: false, error: "staff_exist" }, { status: 409 });   /* staff could not read or be stamped in an encrypted book */
      const salt = String(body.salt || ""), iter = parseInt(body.iter, 10) || 0;
      if (!/^[A-Za-z0-9+/=]{16,64}$/.test(salt) || iter < 100000 || iter > 2000000) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
      await env.DB.prepare("INSERT INTO shop_lock (owner, locked, salt, iter, ts) VALUES (?,1,?,?,?) ON CONFLICT(owner) DO UPDATE SET locked=1, salt=excluded.salt, iter=excluded.iter, ts=excluded.ts").bind(owner, salt, iter, new Date().toISOString()).run();
    } else {
      await env.DB.prepare("INSERT INTO shop_lock (owner, locked, salt, iter, ts) VALUES (?,0,'',0,?) ON CONFLICT(owner) DO UPDATE SET locked=0, ts=excluded.ts").bind(owner, new Date().toISOString()).run();
    }
    return Response.json({ ok: true, lock: await lockOf(env, owner) });
  }

  if (action === "reseal") {
    if (!(await allowed(env, "shopseal:" + owner, 500, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const src = Array.isArray(body && body.records) ? body.records.slice(0, MAX_RESEAL) : [];
    const stmts = [], seen = new Set();
    for (const r of src) {
      const o = clean({ id: r && r.id, k: "p", d: "", ts: r && r.ts, x: r && r.x });   /* same checks as a push; the kind and date stay as they are */
      if (!o || seen.has(o.id)) continue;
      seen.add(o.id);
      stmts.push(env.DB.prepare("UPDATE shop_records SET data=? WHERE owner=? AND id=?").bind(o.data, owner, o.id));
    }
    if (!stmts.length) return Response.json({ ok: true, updated: 0 });
    const res = await env.DB.batch(stmts);
    let updated = 0;
    (res || []).forEach((x) => { updated += (x && x.meta && x.meta.changes) || 0; });
    return Response.json({ ok: true, updated });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
