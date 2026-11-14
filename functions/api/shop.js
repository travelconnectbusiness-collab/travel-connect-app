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
  const owner = c.mobile;
  /* a book whose account has no verified e-mail works on ONE phone only; a second phone must verify the e-mail first (see _loginotp.js shopProtect) */
  { const sp = await shopProtect(env, owner); if (!sp.ok) return Response.json({ ok: false, error: sp.error, why: "second_phone_no_email" }, { status: 403 }); }
  try { await init(env); } catch (e) { return Response.json({ ok: false, error: "server_error" }, { status: 500 }); }

  if (action === "pull") {
    const since = Math.max(0, parseInt(body && body.since, 10) || 0);
    const { results } = await env.DB.prepare("SELECT seq, id, kind, d, data FROM shop_records WHERE owner=? AND seq>? ORDER BY seq LIMIT ?").bind(owner, since, PAGE + 1).all();
    const list = results || [];
    const more = list.length > PAGE;
    const rows = list.slice(0, PAGE).map((r) => {
      let o = {}; try { o = JSON.parse(r.data); } catch (e) {}
      return { seq: r.seq, id: r.id, k: r.kind, d: r.d || "", ts: o.ts || "", x: o.x || {} };
    });
    return Response.json({ ok: true, rows, more, lock: await lockOf(env, owner), plan: await planOf(env, owner) });
  }

  if (action === "push") {
    if (!(await allowed(env, "shop:" + owner, 400, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const src = Array.isArray(body && body.records) ? body.records.slice(0, MAX_PUSH) : [];
    const recs = [], seen = new Set();
    for (const r of src) { const o = clean(r); if (o && !seen.has(o.id)) { seen.add(o.id); recs.push(o); } }
    const lk = await lockOf(env, owner);
    if (!recs.length) return Response.json({ ok: true, saved: 0, last: 0, lock: lk });
    if (lk.locked && recs.some((o) => !o.enc)) return Response.json({ ok: false, error: "locked_book", lock: lk }, { status: 409 });
    /* after the free year without Premium only settings are kept (view only); the phone is told, nothing already stored is touched */
    const plan = await planOf(env, owner);
    const asked = recs.length;
    if (plan.mode === "locked") {
      for (let i = recs.length - 1; i >= 0; i--) if (recs[i].k !== "c") recs.splice(i, 1);
      if (!recs.length) return Response.json({ ok: true, saved: 0, last: 0, lock: lk, plan, dropped: asked });
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
    return Response.json({ ok: true, saved, last: (last && last.m) || 0, lock: lk, plan, dropped: asked - recs.length });
  }

  if (action === "lock") {
    if (!(await allowed(env, "shoplock:" + owner, 60, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    if (body && body.locked) {
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
