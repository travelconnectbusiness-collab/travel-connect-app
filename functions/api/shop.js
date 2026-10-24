/* functions/api/shop.js - shared records of the shop module (aquarium / pet shop accounts, phone screens in tc-shop*.js).
   The shop book is kept as an APPEND-ONLY list of small records (sale, purchase, dead fish, expense, product ...). Every record has an
   id made on the phone, so a record sent twice is stored once, and two phones (the owner's and the shop's) can both add records and
   both read all of them. A correction is a new record that cancels the old one - nothing is ever overwritten here.
     POST /api/shop?action=push  { records:[{id,k,d,x}] }  -> { ok, saved, last }      (up to 120 records per call)
     POST /api/shop?action=pull  { since:<seq> }           -> { ok, rows:[{seq,id,k,d,x}], more }   (400 rows per call)
   WHO: only a logged-in phone (headers X-TC-Mobile + X-TC-Device must be a known, not blocked device of that mobile). This check is
   always ON for shop data (money figures), whatever the soft/enforce switch of the other endpoints says. The book belongs to that
   mobile number: every phone logged in with the same number sees the same book.
   FREE PLAN: a push is at most 8 insert statements of 16 rows (D1 allows 100 bound values per statement) + 2 small queries. */
import { callerOf } from "./_devauth.js";
import { allowed } from "./_ratelimit.js";

const KINDS = new Set(["p", "s", "b", "m", "e", "o", "v", "a", "c"]);   /* product, sale, purchase, dead / loss, expense, owner money, void, stock adjust, setting */
const MAX_PUSH = 120, ROWS = 16, PAGE = 400, MAX_BYTES = 3000, MAX_RECORDS = 150000;
let ready = false;

async function init(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS shop_records (seq INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, d TEXT, data TEXT NOT NULL, UNIQUE(owner, id))").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_shop_owner_seq ON shop_records (owner, seq)").run();
  ready = true;
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
  const data = JSON.stringify({ ts: String(r.ts || "").slice(0, 30), x });
  if (data.length > MAX_BYTES) return null;
  return { id, k, d, data };
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
    return Response.json({ ok: true, rows, more });
  }

  if (action === "push") {
    if (!(await allowed(env, "shop:" + owner, 400, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const src = Array.isArray(body && body.records) ? body.records.slice(0, MAX_PUSH) : [];
    const recs = [], seen = new Set();
    for (const r of src) { const o = clean(r); if (o && !seen.has(o.id)) { seen.add(o.id); recs.push(o); } }
    if (!recs.length) return Response.json({ ok: true, saved: 0, last: 0 });
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
    return Response.json({ ok: true, saved, last: (last && last.m) || 0 });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
