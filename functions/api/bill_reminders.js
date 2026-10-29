/* functions/api/bill_reminders.js - phone notification for the bills in "My Accounts" (owner's request 2026-10-29: the reminder must come from the app itself,
   not from Google Calendar). WHAT LEAVES THE PHONE: only the name of the bill (at most 40 characters), its next due date and the language (ml / en) -
   NEVER the amount, the payments or any other account data - and only for a bill the person switched "Remind me by notification" on for.
   The phone sends its whole list each time something changes (sync); the server keeps one row per bill and removes the rows that are no longer in the list.
     POST /api/bill_reminders?action=sync  { items:[{i:billId, t:name, d:'YYYY-MM-DD'}], l:'ml'|'en' }  -> { ok, saved }   (caller = X-TC-Mobile + X-TC-Device)
   A daily sweep (maybeRunBillReminders, called from worker.js on API requests like the document-expiry sweep) sends ONE push per stage:
     the day before ("due tomorrow"), the due day ("due today"), and once when it is late (1 to 7 days after). The stage already sent is remembered
     (last_sent = 1 / 2 / 3) and forgotten when the phone changes the due date (after "Paid"). Runs from 07:00 IST on the first API request of the day;
     it stops at BUDGET queries (free plan: 50 per request) and continues on the next request. The push is a normal "message" push (sw.js is NOT changed):
     title = the bill name, body = "Due today" ..., url "/#bills" which the app opens in My Accounts (tc-persrem.js).
   TABLE bill_reminders (rid TEXT PRIMARY KEY = mobile + ':' + billId, mobile, t, d, l, last_sent INTEGER, updated_at) is created here when first used.
   Deleting a person's data by hand (deletion requests): also delete their rows here (WHERE mobile=?). */
import { callerOf } from "./_devauth.js";
import { allowed } from "./_ratelimit.js";
import { sendWebPush } from "./_webpush.js";
import { istToday } from "./trip_class.js";

const BUDGET = 32;
const MAX_ITEMS = 30;
let ready = false, lastRun = "", lastTry = 0;
async function init(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS bill_reminders (rid TEXT PRIMARY KEY, mobile TEXT NOT NULL, t TEXT, d TEXT NOT NULL, l TEXT, last_sent INTEGER DEFAULT 0, updated_at TEXT)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_billrem_d ON bill_reminders (d)").run();
  ready = true;
}
const cut = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
const okDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);

export async function onRequestPost({ request, env }) {
  const action = new URL(request.url).searchParams.get("action");
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  if (action !== "sync") return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
  const c = await callerOf(env, request);
  if (!c.valid) return Response.json({ ok: false, error: "device_unverified", why: c.why }, { status: 403 });
  if (!(await allowed(env, "brsync:" + c.mobile, 40, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
  try { await init(env); } catch (e) { return Response.json({ ok: false, error: "server_error" }, { status: 500 }); }

  const lang = body.l === "en" ? "en" : "ml";
  const items = [];
  const seen = new Set();
  for (const it of (Array.isArray(body.items) ? body.items : []).slice(0, MAX_ITEMS)) {
    const i = cut(it && it.i, 40);
    const t = cut(it && it.t, 40);
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(i) || !t || !okDate(it.d) || seen.has(i)) continue;
    seen.add(i);
    items.push({ rid: c.mobile + ":" + i, t, d: it.d });
  }
  const now = new Date().toISOString();
  const st = [];
  for (const it of items) {
    /* a changed due date starts again (nothing sent yet for the new date) */
    st.push(env.DB.prepare(
      "INSERT INTO bill_reminders (rid, mobile, t, d, l, last_sent, updated_at) VALUES (?,?,?,?,?,0,?) " +
      "ON CONFLICT(rid) DO UPDATE SET t=excluded.t, l=excluded.l, updated_at=excluded.updated_at, " +
      "last_sent=CASE WHEN bill_reminders.d=excluded.d THEN bill_reminders.last_sent ELSE 0 END, d=excluded.d"
    ).bind(it.rid, c.mobile, it.t, it.d, lang, now));
  }
  if (items.length) {
    st.push(env.DB.prepare("DELETE FROM bill_reminders WHERE mobile=? AND rid NOT IN (" + items.map(() => "?").join(",") + ")").bind(c.mobile, ...items.map((x) => x.rid)));
  } else {
    st.push(env.DB.prepare("DELETE FROM bill_reminders WHERE mobile=?").bind(c.mobile));
  }
  try { await env.DB.batch(st); } catch (e) { return Response.json({ ok: false, error: "server_error" }, { status: 500 }); }
  return Response.json({ ok: true, saved: items.length });
}

/* ---------- the daily sweep ---------- */
const TXT = {
  ml: { 1: "നാളെ അടയ്ക്കാനുണ്ട്", 2: "ഇന്ന് അടയ്ക്കാനുണ്ട്", 3: "അടയ്ക്കാൻ വൈകി" },
  en: { 1: "Due tomorrow", 2: "Due today", 3: "Overdue" },
};
export async function runBillReminders(env0) {
  const ctr = { n: 0 };
  const env = { ...env0, DB: { prepare: (q) => { ctr.n++; return env0.DB.prepare(q); } } };
  const full = () => ctr.n >= BUDGET;
  await init(env);
  const today = istToday();
  const stats = { sent: 0, more: false };
  const { results } = await env.DB.prepare(
    "SELECT rid, mobile, t, d, l, last_sent FROM bill_reminders WHERE d>=? AND d<=? ORDER BY mobile LIMIT 200"
  ).bind(addDays(today, -7), addDays(today, 1)).all();
  const due = [];
  for (const r of results || []) {
    const diff = dayDiff(today, r.d);                 /* days since the due date: -1 = tomorrow, 0 = today, 1.. = late */
    const stage = diff === -1 ? 1 : diff === 0 ? 2 : diff >= 1 ? 3 : 0;
    if (stage && (r.last_sent || 0) < stage) due.push({ r, stage });
  }
  const subsCache = new Map();
  for (const x of due) {
    if (full()) { stats.more = true; break; }
    const r = x.r;
    let subs = subsCache.get(r.mobile);
    if (!subs) {
      subs = (await env.DB.prepare("SELECT * FROM push_subscriptions WHERE mobile=?").bind(r.mobile).all()).results || [];
      subsCache.set(r.mobile, subs);
    }
    /* mark first: a failed push is not repeated every request */
    await env.DB.prepare("UPDATE bill_reminders SET last_sent=? WHERE rid=?").bind(x.stage, r.rid).run();
    if (!env.VAPID_PRIVATE_JWK || !subs.length) continue;
    const payload = { type: "message", title: "🔔 " + r.t, body: (TXT[r.l] || TXT.ml)[x.stage], tag: "tc-bill-" + r.rid.replace(/[^a-z0-9]/gi, "-"), url: "/#bills" };
    for (const sub of subs) {
      if (full()) break;
      try {
        ctr.n++;
        const res = await sendWebPush(env, sub, payload);
        if (res && res.stale) await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
        else stats.sent++;
      } catch (e) {}
    }
  }
  return stats;
}

/* Called from worker.js on API requests: from 07:00 IST, once a day (marked done only when everything was sent). */
export async function maybeRunBillReminders(env) {
  const today = istToday();
  const hour = new Date(Date.now() + 330 * 60000).getUTCHours();
  if (hour < 7 || lastRun === today || Date.now() - lastTry < 30000) return;
  lastTry = Date.now();
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key='bill_rem_date'").first();
    if (r && r.value === today) { lastRun = today; return; }
    const stats = await runBillReminders(env);
    if (!stats.more) {
      await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES ('bill_rem_date', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(today).run();
      lastRun = today;
    }
  } catch (e) {}
}
