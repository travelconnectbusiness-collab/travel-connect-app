import { sendWebPush } from "./_webpush.js";
import { getEnforceDate, dateLabels, istToday, missingDocs, isComplete, seatsOf } from "./trip_class.js";
import { runDigestSweep } from "./owner_digest.js";

/* Daily check of every vehicle's documents (runs by itself once a day, on the first API request of the day).
   1. Permit / Insurance dates: message + phone notification 30, 7 and 1 day before and when expired.
      An expired vehicle loses Verified (the business itself stays). Fitness / PUC / Tax / RC / Driving licence dates (optional fields): the same
      reminders, but only reminders - they never change Verified.
   2. Missing documents (front/RC/insurance/permit photos, insurance/permit dates): reminders about the
      the deadline (first notice, then 30, 7, 1 day before, and on the day).
   3. From the deadline: vehicles with incomplete documents lose Verified; Auto/Goods owners left with no verified
      vehicle lose Verified too. They get alerts again after uploading and being approved by the admin. */

/* The free Workers plan allows only 50 database queries / subrequests per request. The sweep therefore counts what it
   uses and stops at BUDGET; it is marked finished for the day only when everything is done, otherwise the next API
   request continues where it stopped (messages already sent are remembered in doc_notices and cost nothing to skip).
   Verified itself does not depend on this sweep: alerts, boards and lists apply the same rules live (trip_class.js vehicleLive). */
const BUDGET = 32;
let lastRun = "", lastTry = 0;
const dayDiff = (a, b) => Math.round((new Date(a + "T00:00:00Z") - new Date(b + "T00:00:00Z")) / 86400000);

async function unreadTotal(env, mobile) {
  const pu = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM messages m JOIN travel_partners p ON m.partner_id=p.id
     WHERE m.from_customer=1 AND m.read_at IS NULL AND (p.mobile1=? OR p.mobile2=?)`
  ).bind(mobile, mobile).first();
  return pu ? pu.c : 0;
}
async function push(env, mobiles, title, body, tag) {
  if (!env.VAPID_PRIVATE_JWK) return;
  try {
    for (const mobile of [...new Set(mobiles.filter(Boolean))]) {
      const { results: subs } = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE mobile=?").bind(mobile).all();
      if (!subs.length) continue;
      const payload = { type: "message", title, body, tag, url: "/#messages", count: await unreadTotal(env, mobile) };
      await Promise.all(subs.map(async (sub) => {
        try {
          if (env._ctr) env._ctr.n++;
          const r = await sendWebPush(env, sub, payload);
          if (r.stale) await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
        } catch (e) {}
      }));
    }
  } catch (e) {}
}
/* One message in the owner's Messages box (from "Travel Connect") + a notification. Once per key. */
/* ---------- EMAIL COPY of the reminders (Resend free plan: 100 emails/day, 3000/month) ----------
   Only owners whose email is VERIFIED get one, only when the RESEND_API_KEY secret exists, and never more than
   MAIL_DAILY per day (default 80, so the verification codes sent from the same Resend account always have room).
   First notices (30 days before / documents not complete yet) use only 60% of those (48 of 80), so urgent ones
   (7 days, 1 day, expired, admin "remind" button) are never crowded out. Setting the Cloudflare variable
   EMAIL_REMINDERS to "off" stops these emails. The in-app message + push are always sent; the email is an extra
   and a failed or skipped email never affects them. */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function emailFor(env, p) {
  if (!env.RESEND_API_KEY || env.EMAIL_REMINDERS === "off" || env._mailOff) return null;
  let row = null;
  if (env._emails) row = env._emails.get(p.id);
  else { try { row = await env.DB.prepare("SELECT email, email_verified FROM travel_partners WHERE id=?").bind(p.id).first(); } catch (e) { row = null; } }
  const to = row && row.email_verified ? String(row.email || "").trim() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ? to : null;
}
async function mailAllowed(env, urgent) {
  const cap = Math.min(90, Math.max(0, parseInt(env.MAIL_REMINDER_DAILY, 10) || 80));
  const limit = urgent ? cap : Math.floor(cap * 0.6);
  if (!env._mail) {
    const day = istToday();
    let n = 0;
    try {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
      const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key=?").bind("mail_sent:" + day).first();
      n = r ? parseInt(r.value, 10) || 0 : 0;
    } catch (e) { return false; }
    env._mail = { day, n };
  }
  return env._mail.n < limit;
}
async function sendReminderMail(env, to, title, body) {
  const from = env.MAIL_FROM || "Travel Connect <no-reply@travelconnect.dev>";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222"><p>${esc(body).replace(/\n/g, "<br>")}</p><hr style="border:none;border-top:1px solid #ddd"><p style="font-size:12px;color:#777">You get this because your email is verified on Travel Connect. Open the app: <a href="https://travelconnect.dev">travelconnect.dev</a><br>നിങ്ങളുടെ ഇമെയിൽ Travel Connect-ൽ verify ചെയ്തതിനാലാണ് ഈ ഇമെയിൽ ലഭിക്കുന്നത്.</p></div>`;
  if (env._ctr) env._ctr.n++;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: title, html, text: body + "\n\nhttps://travelconnect.dev" }),
    });
    if (!r.ok && (r.status === 429 || r.status === 401 || r.status === 403)) env._mailOff = true; /* limit reached / key problem: stop for this run */
    return r.ok;
  } catch (e) { return false; }
}
async function emailCopy(env, p, title, body, urgent) {
  try {
    const to = await emailFor(env, p);
    if (!to || !(await mailAllowed(env, urgent))) return false;
    if (!(await sendReminderMail(env, to, title, body))) return false;
    env._mail.n++;
    if (env._mailSent != null) env._mailSent++;
    await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind("mail_sent:" + env._mail.day, String(env._mail.n)).run();
    return true;
  } catch (e) { return false; }
}

export async function notify(env, key, p, title, body, urgent, noMail) {
  if (env._seen) { if (env._seen.has(key)) return false; }
  else { const seen = await env.DB.prepare("SELECT 1 AS x FROM doc_notices WHERE k=?").bind(key).first(); if (seen) return false; }
  try {
    await env.DB.prepare("INSERT INTO messages (partner_id, customer_mobile, customer_name, from_customer, body, created_at) VALUES (?,?,?,?,?,?)")
      .bind(p.id, "TC-SYSTEM", "Travel Connect", 1, body, new Date().toISOString()).run();
  } catch (e) { return false; }
  await env.DB.prepare("INSERT OR IGNORE INTO doc_notices (k, sent_at) VALUES (?,?)").bind(key, new Date().toISOString()).run();
  if (env._seen) env._seen.add(key);
  await push(env, [p.mobile1, p.mobile2], title, body.split("\n")[0].slice(0, 160), "tc-doc-" + key.replace(/[^a-z0-9]/gi, "-"));
  if (!noMail) await emailCopy(env, p, title, body, !!urgent);
  return true;
}

export async function runExpirySweep(env0) {
  /* count every database query and push so the run can stop before the free-plan limit */
  const ctr = { n: 0 };
  const env = { ...env0, _ctr: ctr, DB: { prepare: (q) => { ctr.n++; return env0.DB.prepare(q); } } };
  const full = () => ctr.n >= BUDGET;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS doc_notices (k TEXT PRIMARY KEY, sent_at TEXT)").run();
  env._seen = new Set((((await env.DB.prepare("SELECT k FROM doc_notices").all()).results) || []).map((r) => r.k));
  env._mailSent = 0;
  if (env.RESEND_API_KEY && env.EMAIL_REMINDERS !== "off") {
    /* every verified email in ONE query */
    try {
      env._emails = new Map((((await env.DB.prepare("SELECT id, email, email_verified FROM travel_partners WHERE email_verified=1 AND email IS NOT NULL AND email<>''").all()).results) || []).map((r) => [r.id, r]));
    } catch (e) { env._emails = new Map(); }
  }
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN tax_expiry TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN rate_cat TEXT").run(); } catch (e) {}
  const today = istToday();
  const ENFORCE_DATE = await getEnforceDate(env);
  const enforced = today >= ENFORCE_DATE;
  const { results: vehicles } = await env.DB.prepare(
    "SELECT v.*, p.business_name, p.mobile1, p.mobile2, p.business_type, p.verified AS pverified FROM vehicles v JOIN travel_partners p ON p.id=v.partner_id"
  ).all();
  const { results: partners } = await env.DB.prepare(
    "SELECT id, business_name, mobile1, mobile2, business_type, verified FROM travel_partners WHERE business_type IN ('taxi_travel','auto_rickshaw','pickup_goods')"
  ).all();
  const stats = { vehicles: vehicles.length, sent: 0, emails: 0, vehicles_unverified: 0, partners_unverified: 0, more: false };
  const byPartner = new Map();
  for (const v of vehicles) { if (!byPartner.has(v.partner_id)) byPartner.set(v.partner_id, []); byPartner.get(v.partner_id).push(v); }

  /* 1. permit / insurance dates (+ optional fitness / PUC reminders) */
  for (const v of vehicles) {
    if (full()) { stats.more = true; break; }
    const p = { id: v.partner_id, mobile1: v.mobile1, mobile2: v.mobile2 };
    /* Fitness, PUC, Tax, RC and Driving licence are optional: reminder messages only - they never change Verified. */
    for (const [doc, en, ml, date, optional] of [["permit", "Permit", "പെർമിറ്റ്", v.permit_expiry], ["ins", "Insurance", "ഇൻഷുറൻസ്", v.insurance_expiry],
      ["fit", "Fitness certificate", "ഫിറ്റ്നസ് സർട്ടിഫിക്കറ്റ്", v.fitness_expiry, true], ["puc", "PUC (pollution certificate)", "PUC (പുക പരിശോധന സർട്ടിഫിക്കറ്റ്)", v.puc_expiry, true],
      ["tax", "Vehicle tax", "വാഹന നികുതി (ടാക്സ്)", v.tax_expiry, true],
      ["rc", "RC (registration certificate)", "RC (രജിസ്ട്രേഷൻ സർട്ടിഫിക്കറ്റ്)", v.rc_expiry, true],
      ["lic", "Driving licence" + (v.driver_name ? " (" + v.driver_name + ")" : ""), "ഡ്രൈവിംഗ് ലൈസൻസ്" + (v.driver_name ? " (" + v.driver_name + ")" : ""), v.driver_license_expiry, true]]) {
      if (!date) continue;
      const dl = dayDiff(date, today);
      if (!Number.isFinite(dl)) continue;
      if (full()) { stats.more = true; break; } /* a vehicle can have many reminders: stop between them, not only between vehicles */
      if (optional) {
        const st = dl < 0 ? 0 : dl <= 1 ? 1 : dl <= 7 ? 7 : dl <= 30 ? 30 : null;
        if (st === null) continue;
        const no = v.vehicle_number || "vehicle", nice = date.split("-").reverse().join("-");
        const body = st === 0
          ? `${en} of ${no} expired on ${nice}. Please renew it and update the date (Business page > Vehicles > Edit). This does not affect Verified.\n${no} ${ml} ${nice}-ന് കാലാവധി കഴിഞ്ഞു. പുതുക്കി തീയതി മാറ്റുക (Business പേജ് > Vehicles > Edit). ഇത് Verified സ്റ്റാറ്റസിനെ ബാധിക്കില്ല.`
          : `${en} of ${no} expires on ${nice} (${dl <= 0 ? "today" : dl + " day" + (dl === 1 ? "" : "s") + " left"}). Please renew it and update the date (Business page > Vehicles > Edit). This does not affect Verified.\n${no} ${ml} ${nice}-ന് കാലാവധി തീരും (${dl <= 0 ? "ഇന്ന്" : dl + " ദിവസം ബാക്കി"}). പുതുക്കി തീയതി മാറ്റുക (Business പേജ് > Vehicles > Edit). ഇത് Verified സ്റ്റാറ്റസിനെ ബാധിക്കില്ല.`;
        if (await notify(env, `v${v.id}:${doc}:${date}:${st}`, p, st === 0 ? `${en} expired - ${no}` : `${en} expires soon - ${no}`, body, st !== 30)) stats.sent++;
        continue;
      }
      const stage = dl < 0 ? 0 : dl <= 1 ? 1 : dl <= 7 ? 7 : dl <= 30 ? 30 : null;
      if (stage === 0 && v.verified) {
        await env.DB.prepare("UPDATE vehicles SET verified=0 WHERE id=?").bind(v.id).run();
        v.verified = 0; stats.vehicles_unverified++;
      }
      if (stage === null) continue;
      const no = v.vehicle_number || "vehicle";
      const body = stage === 0
        ? `${en} of ${no} expired on ${date}. This vehicle is no longer Verified and will not get trip alerts. Upload the renewed document (Business page > Vehicles > Edit) and the admin will approve it again.\n${no} ${ml} കാലാവധി ${date}-ന് കഴിഞ്ഞു. ഈ വാഹനം Verified അല്ല, ട്രിപ്പ് അലേർട്ടുകൾ കിട്ടില്ല. പുതുക്കിയ രേഖ Business പേജിലെ Vehicles > Edit-ൽ അപ്‌ലോഡ് ചെയ്യുക, അഡ്മിൻ വീണ്ടും അംഗീകരിക്കും.`
        : `${en} of ${no} expires on ${date} (${dl <= 0 ? "today" : dl + " day" + (dl === 1 ? "" : "s") + " left"}). Upload the renewed document (Business page > Vehicles > Edit) or this vehicle will lose Verified.\n${no} ${ml} ${date}-ന് കാലാവധി തീരും (${dl <= 0 ? "ഇന്ന്" : dl + " ദിവസം ബാക്കി"}). പുതുക്കിയ രേഖ Business പേജിലെ Vehicles > Edit-ൽ നൽകുക, ഇല്ലെങ്കിൽ ഈ വാഹനത്തിന്റെ Verified ഒഴിവാക്കും.`;
      if (await notify(env, `v${v.id}:${doc}:${date}:${stage}`, p, stage === 0 ? `${en} expired - ${no}` : `${en} expires soon - ${no}`, body, stage !== 30)) stats.sent++;
    }
  }

  /* 1b. Rate Master category: ONE reminder per Taxi / Travel vehicle that has no category yet (never repeated; vehicles
     without a category still get alerts by their seat count) */
  for (const v of vehicles) {
    if (v.business_type !== "taxi_travel" || (v.rate_cat !== undefined && v.rate_cat !== null && v.rate_cat !== "") || !(seatsOf(v) >= 2)) continue;
    const key = `v${v.id}:ratecat`;
    if (env._seen.has(key)) continue;
    if (full()) { stats.more = true; break; }
    const no = v.vehicle_number || "vehicle";
    const body = `Please choose the Rate Master category for ${no} (Business page > Vehicles > Edit Vehicle). Customers can now choose a vehicle category (for example Innova, Tempo Traveller) when they search, and vehicles with a category get those requests directly.\n${no}-ന് Rate Master കാറ്റഗറി തിരഞ്ഞെടുക്കുക (Business പേജ് > Vehicles > Edit Vehicle). ഇപ്പോൾ കസ്റ്റമർമാർക്ക് ഇന്നോവ, ടെമ്പോ ട്രാവലർ പോലുള്ള വാഹന കാറ്റഗറി തിരഞ്ഞെടുത്ത് തിരയാം; കാറ്റഗറി തിരഞ്ഞെടുത്ത വാഹനങ്ങൾക്ക് ആ റിക്വസ്റ്റുകൾ നേരിട്ട് ലഭിക്കും.`;
    if (await notify(env, key, { id: v.partner_id, mobile1: v.mobile1, mobile2: v.mobile2 }, `Choose the Rate Master category - ${no}`, body, false)) stats.sent++;
  }

  /* 2. missing documents - reminders about the ENFORCE_DATE rule */
  const du = dayDiff(ENFORCE_DATE, today);
  const rstage = du <= 0 ? 0 : du <= 1 ? 1 : du <= 7 ? 7 : du <= 30 ? 30 : 100;
  for (const p of partners) {
    if (stats.more || full()) { stats.more = true; break; }
    const vs = byPartner.get(p.id) || [];
    const lines = [];
    for (const v of vs) {
      const miss = missingDocs(v, today).filter((m) => !/expired/i.test(m));
      if (miss.length) lines.push(`${v.vehicle_number || "vehicle"}: ${miss.join(", ")}`);
    }
    if (!vs.length && p.business_type !== "taxi_travel") lines.push("No vehicle added yet");
    if (!lines.length) continue;
    const list = lines.slice(0, 6).join("\n");
    const dl = dateLabels(ENFORCE_DATE);
    const when = du > 0 ? `From ${dl.en}` : `Since ${dl.en}`;
    const body = `${when}, only vehicles with complete documents stay Verified and get trip alerts: Front photo, RC photo, Insurance photo + expiry date, Permit photo + expiry date. Please complete (Business page > Vehicles):\n${list}\n\n${dl.ml} മുതൽ മുൻവശത്തെ ഫോട്ടോ, RC ഫോട്ടോ, ഇൻഷുറൻസ് ഫോട്ടോയും തീയതിയും, പെർമിറ്റ് ഫോട്ടോയും തീയതിയും പൂർണ്ണമായുള്ള വാഹനങ്ങൾക്ക് മാത്രമേ Verified സ്റ്റാറ്റസും ട്രിപ്പ് അലേർട്ടുകളും ലഭിക്കൂ. Business പേജിലെ Vehicles-ൽ പൂർത്തിയാക്കുക.`;
    if (await notify(env, `p${p.id}:ready:${rstage}`, p, du > 0 ? "Complete your vehicle documents" : "Vehicle documents incomplete", body, rstage <= 7)) stats.sent++;
  }

  /* 3. enforcement */
  if (enforced && !stats.more) {
    for (const v of vehicles) {
      if (full()) { stats.more = true; break; }
      if (v.verified && !isComplete(v, today)) {
        await env.DB.prepare("UPDATE vehicles SET verified=0 WHERE id=?").bind(v.id).run();
        v.verified = 0; stats.vehicles_unverified++;
      }
    }
    for (const p of partners) {
      if (stats.more) break;
      if (full()) { stats.more = true; break; }
      if (p.business_type === "taxi_travel" || !p.verified) continue;
      if (!(byPartner.get(p.id) || []).some((v) => v.verified)) {
        await env.DB.prepare("UPDATE travel_partners SET verified=0 WHERE id=?").bind(p.id).run();
        stats.partners_unverified++;
      }
    }
  }
  /* 4. reminders from the owners' phone summaries (tomorrow's bookings, driving licences): owner_digest.js */
  if (!stats.more) {
    try {
      const nowIst = new Date(Date.now() + 330 * 60000);
      const tomorrow = new Date(Date.parse(today + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
      const dg = await runDigestSweep(env, { notify, full, today, tomorrow, hour: nowIst.getUTCHours(), dayDiff }, "am");
      stats.sent += dg.sent; stats.digest_owners = dg.owners;
      if (dg.more) stats.more = true;
    } catch (e) {}
  }
  stats.emails = env._mailSent || 0;
  return stats;
}

/* Called from worker.js on API requests. Does real work at most once per 30 seconds per server instance and is
   marked done for the day only when the whole sweep finished (it may take several runs). */
export async function maybeRunExpirySweep(env) {
  const today = istToday();
  if (lastRun === today || Date.now() - lastTry < 30000) return;
  lastTry = Date.now();
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key='expiry_sweep_date'").first();
    if (r && r.value === today) { lastRun = today; return; }
    const stats = await runExpirySweep(env);
    if (!stats.more) {
      await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES ('expiry_sweep_date', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(today).run();
      lastRun = today;
    }
  } catch (e) {}
}

/* Evening reminder (from 17:00 IST, once a day, on the first API request after that): tomorrow's bookings of every owner who sent a summary.
   Uses the same push + Messages-box path and the same "sent once" memory as the morning sweep. */
let lastPm = "", lastPmTry = 0;
export async function maybeRunDigestEvening(env0) {
  const today = istToday();
  const hour = new Date(Date.now() + 330 * 60000).getUTCHours();
  if (hour < 17 || lastPm === today || Date.now() - lastPmTry < 30000) return;
  lastPmTry = Date.now();
  try {
    const ctr = { n: 0 };
    const env = { ...env0, _ctr: ctr, DB: { prepare: (q) => { ctr.n++; return env0.DB.prepare(q); } } };
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key='digest_pm_date'").first();
    if (r && r.value === today) { lastPm = today; return; }
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS doc_notices (k TEXT PRIMARY KEY, sent_at TEXT)").run();
    const tomorrow = new Date(Date.parse(today + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
    const dg = await runDigestSweep(env, { notify, full: () => ctr.n >= BUDGET, today, tomorrow, hour, dayDiff }, "pm");
    if (!dg.more) {
      await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES ('digest_pm_date', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(today).run();
      lastPm = today;
    }
  } catch (e) {}
}
