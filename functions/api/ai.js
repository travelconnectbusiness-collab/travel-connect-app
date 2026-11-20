import { deviceKnown } from "./_loginotp.js";
import { planLevel } from "./partner_media.js";
import { verifyAdminToken } from "./_auth_helper.js";

/* ============================================================================
   /api/ai  -  THE IN-APP AI (Cloudflare Workers AI, binding "AI" in wrangler.toml).
   Owner 2026-11-19: "an AI inside the app that fully understands Malayalam and English and knows every feature - no outside AI needed".
   The phone first answers from its own help (tc-vohelp.js, works offline, free). Only a question the help cannot answer well comes here.
   WHAT IS SENT: the question, the language, the kind of business on screen and the app-help notes closest to the question
   (the app's own help text). NEVER the user's accounts, bills, customers or figures. The question is not stored (only a count).
   COST: Workers AI is free up to 10,000 "neurons" a day. One answer is about 30-60 neurons, so:
     - a daily total for the whole app (AI_DAY_LIMIT, default 200) and per phone (AI_USER_DAY, default 15; Premium / Platinum 30),
     - the same question on the same kind of page within 7 days comes from ai_cache (no AI call, no count).
   Over a limit the phone keeps its own help (nothing breaks).
   POST JSON { mobile, device_token, q, lang:"ml"|"en", biz, notes:[{en,ml}] }  -> { ok, text, cached } | { ok:false, error }
   Admin: POST ?action=admin_usage { token } -> today's count, the limits, the top phones today.
   ========================================================================== */

const j = (o, s) => Response.json(o, { status: s || 200 });
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, n);
function envInt(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; }
const dayKey = () => new Date().toISOString().slice(0, 10);
const CACHE_DAYS = 7;
/* tried in this order; AI_MODEL (Cloudflare variable) can put another model first without a code change */
const MODELS = ["@cf/google/gemma-3-12b-it", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"];

const APP = "Travel Connect (travelconnect.dev) is one phone app for any local business and its customers in Kerala: taxi / travels, auto, goods vehicle, " +
  "shops of every kind (stock, sales bills, purchase, expenses, dues, staff wages, GST and CA reports, dead / loss items, insights), restaurants, " +
  "skilled workers (electrician, plumber ...). Customers find nearby vehicles and shops, get fare estimates, blood donors and emergency numbers. " +
  "Every user has \"My Accounts\" (personal money, loans, chitty / kuri, gifts, backup). Taxi owners: quotations, quick bills, live trips with KM, " +
  "Trip & Accounts, Day Book, drivers, rate master, packages. Voice: the mic button at the bottom right. Menu = the ☰ button. " +
  "To get customers: the \"Share Travel Connect\" card on the dashboard shares the business link on WhatsApp, the \"Shop window\" card shows photos / a video, and customers find businesses in the Local directory. " +
  "Plans: Free, Plus, Premium, Platinum (Menu › Verification & Plan). Data stays on the phone; backup in My Accounts › Backup. " +
  "WHAT EACH KIND OF BUSINESS USES: vehicles (taxi_travel, auto_rickshaw, pickup_goods): Live Trip Log, Quick Bill, Quotations (taxi), Enquiries, Billing, Trip & Accounts, Day Book, drivers. " +
  "Every other business (shops of any kind, restaurant / tea shop, hotel, skilled workers such as electrician or plumber, services ...): the shop book - Sale (bill), Purchase, Stock, Expense, Dues, Staff wages, Reports, CA pack, Insights - plus Quotation / Invoice / Bill documents for jobs. " +
  "Associations / unions / Kudumbashree / self-help groups / clubs (business type association): the \"Association book\" card on the dashboard - Members (add, area, status), Collect subscription (receipt on WhatsApp / print), Dues list (WhatsApp reminders), Ledger (income / expense, cash and bank), Minutes & actions (warning, fine, suspension), Reports (Excel, Print / PDF), Settings (amount, month / year, areas, receipt number); free up to 25 members (book on one phone, no cloud). Association plans: Plus Rs 100/year up to 100 members, Premium Rs 1000/year up to 10,000, Platinum Rs 3000/year up to 1,00,000 (+ each member sees his own membership), bigger: talk to the admin; office bearers without limit. Plus and above: \"Move to the cloud\", Office bearers (post, mobile number, access admin / edit / view, End term, Hand over the organisation), Activity log; their app shows \"My organisations\". Platinum: each member sees \"My membership\" (own payments only). Settings › kind of organisation: taxi / auto union (vehicle numbers, N vehicles included, extra per vehicle), Kudumbashree / self-help group (weekly or monthly thrift, total saved), club (life / honorary members pay nothing), residents' association (houses, house no., maintenance fee), other; a special rate (concession) per member under Edit › More; minutes up to about 25 pages. " +
  "Committees (Association book › Committees): any levels - national / state › district › taluk / zone › panchayat › unit, or CDS › ADS › neighbourhood group; each member belongs to a unit; an office bearer's post can belong to a committee and then they see only that committee and those below it; each committee has its own ledger and reports (choose the committee); a share % of a committee's income goes to the upper committee (\"Record the share sent\" = expense below, income above); each committee shows members, collection and dues including those below it, tap to go down; old areas can be made units in one tap. " +
  "Everybody: My Accounts, voice, Share Travel Connect card, Shop window.";

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  for (const s of [
    "CREATE TABLE IF NOT EXISTS ai_usage (day TEXT NOT NULL, who TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, who))",
    "CREATE TABLE IF NOT EXISTS ai_cache (k TEXT PRIMARY KEY, text TEXT NOT NULL, at TEXT NOT NULL)",
  ]) await env.DB.prepare(s).run();
  ready = true;
}
async function sha(t) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function take(env, who, limit) {
  const d = dayKey();
  await env.DB.prepare("INSERT OR IGNORE INTO ai_usage (day, who, calls) VALUES (?, ?, 0)").bind(d, who).run();
  const r = await env.DB.prepare("UPDATE ai_usage SET calls = calls + 1 WHERE day = ? AND who = ? AND calls < ?").bind(d, who, limit).run();
  return !!(r.meta && r.meta.changes > 0);
}
async function giveBack(env, who) {
  try { await env.DB.prepare("UPDATE ai_usage SET calls = calls - 1 WHERE day = ? AND who = ? AND calls > 0").bind(dayKey(), who).run(); } catch (e) {}
}
async function levelOf(env, mobile) {
  try {
    const rows = (await env.DB.prepare("SELECT plan, plan_expires_at, platinum FROM travel_partners WHERE mobile1=? OR mobile2=?").bind(mobile, mobile).all()).results || [];
    return rows.reduce((m, p) => Math.max(m, planLevel(p)), 0);
  } catch (e) { return 0; }
}

function prompt(lang, biz, notes) {
  const L = lang === "en" ? "English" : "Malayalam (simple, everyday Kerala Malayalam in Malayalam letters; keep app button names in English as they appear in the app)";
  const n = notes.length
    ? notes.map((x, i) => "[" + (i + 1) + "] " + x).join("\n")
    : "(no matching help note)";
  return "You are the help assistant inside the Travel Connect app. You help shop owners, taxi owners, drivers and customers use the app.\n" +
    "ABOUT THE APP: " + APP + "\n" +
    "The user's business type: " + (biz || "unknown") + ". Answer for THIS kind of business, in its own words (a restaurant has dishes and orders, a skilled worker has jobs and service charges, a taxi has trips); never give taxi steps to a shop or shop steps to a taxi.\n" +
    "If the answer depends on the situation (e.g. a trip leaving now vs a booking for later, a drop trip vs a round trip), give the simplest common case first and mention the other in one line.\n" +
    "APP HELP NOTES (the only reliable source for buttons and steps):\n" + n + "\n\n" +
    "FIRST decide what kind of question it is:\n" +
    "A) How to use Travel Connect (its screens, buttons, bills, accounts, plans): answer from the help notes. Name only buttons and screens that appear in the notes or the app description - never invent a button, menu or feature. If the notes do not cover it, say clearly that you could not find this in Travel Connect and give the closest thing the notes do mention.\n" +
    "B) Anything else (the phone itself, WhatsApp, Google, photos, wallpaper, business tips, GST basics, saving fuel, general knowledge): give a real, helpful answer from general knowledge in short steps (for phones assume Android unless the user says iPhone), and, only when NONE of the steps is in Travel Connect, add one short line that this is not part of Travel Connect.\n" +
    "RULES:\n" +
    "- Reply in " + L + ".\n" +
    "- Never answer only \"open the menu\" - always say what to tap or look for.\n" +
    "- Write app button and card names exactly as in the notes, in English letters inside quotes (e.g. \"Share Travel Connect\"), even in a Malayalam answer.\n" +
    "- For advertising / getting more customers: give practical steps (e.g. WhatsApp Business: catalogue, status, broadcast list, business profile) and mention the app's own Share card / Shop window when it fits.\n" +
    "- Keep it short: at most 6 short lines, numbered steps when there are steps. Plain text, no markdown, no tables. Always finish the last sentence.\n" +
    "- Never ask for or repeat OTPs, passwords, codes or card numbers. Never claim to have done anything in the app; you only explain.\n" +
    "- You do not see the user's accounts or figures. For figures, tell them to ask the voice button, e.g. \"profit this month\".";
}

async function runAi(env, sys, q, history) {
  const msgs = [{ role: "system", content: sys }];
  (history || []).forEach((h) => { msgs.push({ role: "user", content: h.q }); msgs.push({ role: "assistant", content: h.a }); });
  msgs.push({ role: "user", content: q });
  const list = (env.AI_MODEL ? [String(env.AI_MODEL)] : []).concat(MODELS.filter((m) => m !== env.AI_MODEL));
  let lastErr = "";
  for (const model of list) {
    try {
      const out = await Promise.race([
        env.AI.run(model, { messages: msgs, max_tokens: 1500, temperature: 0.2 }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 25000)),
      ]);
      let t = out && (out.response != null ? out.response : (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
      if (t && typeof t === "object") t = JSON.stringify(t);
      t = String(t || "").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
      if (t) return { text: t.slice(0, 2500), model };
      lastErr = "empty";
    } catch (e) { lastErr = String((e && e.message) || e).slice(0, 80); }
  }
  return { error: "ai_failed", detail: lastErr };
}

export async function onRequestPost({ request, env }) {
  await ensureTables(env);
  const action = new URL(request.url).searchParams.get("action") || "";
  let body = {};
  try { body = await request.json(); } catch (e) { return j({ ok: false, error: "bad_request" }, 400); }

  if (action === "admin_usage") {
    if (!(await verifyAdminToken(env, body.token))) return j({ ok: false, error: "unauthorized" }, 401);
    const all = await env.DB.prepare("SELECT calls FROM ai_usage WHERE day=? AND who='*'").bind(dayKey()).first();
    const top = await env.DB.prepare("SELECT who, calls FROM ai_usage WHERE day=? AND who<>'*' ORDER BY calls DESC LIMIT 20").bind(dayKey()).all();
    return j({ ok: true, day: dayKey(), calls: (all && all.calls) || 0, day_limit: envInt(env.AI_DAY_LIMIT, 200), user_limit: envInt(env.AI_USER_DAY, 15), today: top.results || [], ai: !!env.AI });
  }
  if (action) return j({ ok: false, error: "unknown_action" }, 400);

  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return j({ ok: false, error: "unauthorized" }, 403);
  const q = clean(body.q, 500);
  if (q.length < 3) return j({ ok: false, error: "too_short" }, 400);
  const lang = body.lang === "en" ? "en" : "ml";
  const biz = clean(body.biz, 40).replace(/[^a-z_ ]/gi, "");
  const notes = (Array.isArray(body.notes) ? body.notes : []).slice(0, 4).map((x, i) => {
    const en = clean(x && x.en, 900), ml = i === 0 ? clean(x && x.ml, 900) : "";
    return (en + (ml ? "\n(Malayalam: " + ml + ")" : "")).trim();
  }).filter(Boolean);
  if (!env.AI) return j({ ok: false, error: "no_ai" }, 503);
  /* the last 2 questions + answers of this conversation (a follow-up question); not stored, and such answers are not cached */
  const history = (Array.isArray(body.history) ? body.history : []).slice(-2).map((h) => ({ q: clean(h && h.q, 400), a: clean(h && h.a, 1200) })).filter((h) => h.q && h.a);

  const k = await sha("ai10|" + lang + "|" + biz + "|" + q.toLowerCase().replace(/\s+/g, " ") + "|" + (await sha(notes.join("\n"))));
  try {
    const hit = history.length ? null : await env.DB.prepare("SELECT text, at FROM ai_cache WHERE k=?").bind(k).first();
    if (hit && Date.now() - Date.parse(hit.at) < CACHE_DAYS * 86400000) return j({ ok: true, text: hit.text, cached: 1 });
  } catch (e) {}

  const lvl = await levelOf(env, mobile);
  const userLimit = envInt(env.AI_USER_DAY, 15) * (lvl >= 2 ? 2 : 1);
  if (!(await take(env, mobile, userLimit))) return j({ ok: false, error: "user_limit", limit: userLimit }, 429);
  if (!(await take(env, "*", envInt(env.AI_DAY_LIMIT, 200)))) { await giveBack(env, mobile); return j({ ok: false, error: "day_limit" }, 429); }

  const r = await runAi(env, prompt(lang, biz, notes), q, history);
  if (r.error) { await giveBack(env, mobile); await giveBack(env, "*"); return j({ ok: false, error: r.error }, 502); }
  try {
    if (!history.length) await env.DB.prepare("INSERT INTO ai_cache (k, text, at) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET text=excluded.text, at=excluded.at").bind(k, r.text, new Date().toISOString()).run();
    if (Math.random() < 0.02) {
      await env.DB.prepare("DELETE FROM ai_cache WHERE at < ?").bind(new Date(Date.now() - CACHE_DAYS * 86400000).toISOString()).run();
      await env.DB.prepare("DELETE FROM ai_usage WHERE day < ?").bind(new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10)).run();
    }
  } catch (e) {}
  return j({ ok: true, text: r.text, cached: 0 });
}
