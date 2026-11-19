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
  "Plans: Free, Plus, Premium, Platinum (Menu › Verification & Plan). Data stays on the phone; backup in My Accounts › Backup.";

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
    "The user is on a page for this kind of business: " + (biz || "unknown") + ".\n" +
    "APP HELP NOTES (the only reliable source for buttons and steps):\n" + n + "\n\n" +
    "RULES:\n" +
    "- Reply in " + L + ".\n" +
    "- Use the help notes. Name only buttons and screens that appear in the notes or the app description. Never invent a button, menu or feature.\n" +
    "- If the notes do not answer the question, say so in one sentence and suggest asking in other words or opening the Menu (☰). Do not guess.\n" +
    "- General business questions (how to keep stock, GST basics, saving fuel ...) may be answered briefly from general knowledge, and say it is general advice.\n" +
    "- Keep it short: at most 6 short lines, numbered steps when there are steps. Plain text, no markdown, no tables.\n" +
    "- Never ask for or repeat OTPs, passwords, codes or card numbers. Never claim to have done anything in the app; you only explain.\n" +
    "- You do not see the user's accounts or figures. For figures, tell them to ask the voice button, e.g. \"profit this month\".";
}

async function runAi(env, sys, q) {
  const list = (env.AI_MODEL ? [String(env.AI_MODEL)] : []).concat(MODELS.filter((m) => m !== env.AI_MODEL));
  let lastErr = "";
  for (const model of list) {
    try {
      const out = await Promise.race([
        env.AI.run(model, { messages: [{ role: "system", content: sys }, { role: "user", content: q }], max_tokens: 450, temperature: 0.2 }),
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

  const k = await sha("ai1|" + lang + "|" + biz + "|" + q.toLowerCase().replace(/\s+/g, " ") + "|" + (await sha(notes.join("\n"))));
  try {
    const hit = await env.DB.prepare("SELECT text, at FROM ai_cache WHERE k=?").bind(k).first();
    if (hit && Date.now() - Date.parse(hit.at) < CACHE_DAYS * 86400000) return j({ ok: true, text: hit.text, cached: 1 });
  } catch (e) {}

  const lvl = await levelOf(env, mobile);
  const userLimit = envInt(env.AI_USER_DAY, 15) * (lvl >= 2 ? 2 : 1);
  if (!(await take(env, mobile, userLimit))) return j({ ok: false, error: "user_limit", limit: userLimit }, 429);
  if (!(await take(env, "*", envInt(env.AI_DAY_LIMIT, 200)))) { await giveBack(env, mobile); return j({ ok: false, error: "day_limit" }, 429); }

  const r = await runAi(env, prompt(lang, biz, notes), q);
  if (r.error) { await giveBack(env, mobile); await giveBack(env, "*"); return j({ ok: false, error: r.error }, 502); }
  try {
    await env.DB.prepare("INSERT INTO ai_cache (k, text, at) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET text=excluded.text, at=excluded.at").bind(k, r.text, new Date().toISOString()).run();
    if (Math.random() < 0.02) {
      await env.DB.prepare("DELETE FROM ai_cache WHERE at < ?").bind(new Date(Date.now() - CACHE_DAYS * 86400000).toISOString()).run();
      await env.DB.prepare("DELETE FROM ai_usage WHERE day < ?").bind(new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10)).run();
    }
  } catch (e) {}
  return j({ ok: true, text: r.text, cached: 0 });
}
