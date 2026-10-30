/* functions/api/shop.js - shared records of the shop module (aquarium / pet shop accounts, phone screens in tc-shop*.js).
   The shop book is kept as an APPEND-ONLY list of small records (sale, purchase, dead fish, expense, product ...). Every record has an
   id made on the phone, so a record sent twice is stored once, and two phones (the owner's and the shop's) can both add records and
   both read all of them. A correction is a new record that cancels the old one - nothing is ever overwritten here.
     POST /api/shop?action=push  { records:[{id,k,d,x}] }  -> { ok, saved, last }      (up to 120 records per call)
     POST /api/shop?action=pull  { since:<seq> }           -> { ok, rows:[{seq,id,k,d,x}], more }   (400 rows per call)
   WHO: only a logged-in phone (headers X-TC-Mobile + X-TC-Device must be a known, not blocked device of that mobile). This check is
   always ON for shop data (money figures), whatever the soft/enforce switch of the other endpoints says. The book belongs to that
   mobile number: every phone logged in with the same number sees the same book.
   FREE PLAN: a push is at most 8 insert statements of 16 rows (D1 allows 100 bound values per statement) + 3 small queries.
   PASSWORD LOCK (2026-10-30, owner: 'encrypt the shop book too'): the phone can encrypt the payload x of every record (AES-256-GCM, key from the person's password,
   see tc-shoplock.js): x = { __e:1, iv, ct } (base64). The server never sees the key. Table shop_lock holds, per mobile, whether the book is LOCKED plus the (public) salt /
   rounds of the key derivation, so another phone knows how to derive the key from the password (kept after switching off, so rows that are still encrypted can be opened). While the book is locked a PLAIN record is refused (locked_book) - a phone
   that does not hold the key can not mix plain records into a locked book. Every push / pull answer carries lock:{locked,salt,iter}.
     POST /api/shop?action=lock    { locked:true, salt, iter } | { locked:false }     -> { ok, lock }
     POST /api/shop?action=reseal  { records:[{id,ts,x}] }  (up to 30)               -> { ok, updated }   replaces the payload of EXISTING records of this mobile
   (this is how the old plain records are locked once, and how they are unlocked / re-locked after turning off / changing the password). */
import { callerOf } from "./_devauth.js";
import { allowed } from "./_ratelimit.js";

const KINDS = new Set(["p", "s", "b", "m", "e", "o", "v", "a", "c"]);   /* product, sale, purchase, dead / loss, expense, owner money, void, stock adjust, setting */
const MAX_PUSH = 120, ROWS = 16, PAGE = 400, MAX_BYTES = 3000, MAX_BYTES_ENC = 5200, MAX_RECORDS = 150000, MAX_RESEAL = 30;
let ready = false;

async function init(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_records (seq INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, d TEXT, data TEXT NOT NULL, UNIQUE(owner, id))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_shop_owner_seq ON shop_records (owner, seq)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_lock (owner TEXT PRIMARY KEY, locked INTEGER NOT NULL DEFAULT 0, salt TEXT, iter INTEGER, ts TEXT)").run();
  ready = true;
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
    return Response.json({ ok: true, rows, more, lock: await lockOf(env, owner) });
  }

  if (action === "push") {
    if (!(await allowed(env, "shop:" + owner, 400, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const src = Array.isArray(body && body.records) ? body.records.slice(0, MAX_PUSH) : [];
    const recs = [], seen = new Set();
    for (const r of src) { const o = clean(r); if (o && !seen.has(o.id)) { seen.add(o.id); recs.push(o); } }
    const lk = await lockOf(env, owner);
    if (!recs.length) return Response.json({ ok: true, saved: 0, last: 0, lock: lk });
    if (lk.locked && recs.some((o) => !o.enc)) return Response.json({ ok: false, error: "locked_book", lock: lk }, { status: 409 });
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
    return Response.json({ ok: true, saved, last: (last && last.m) || 0, lock: lk });
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
