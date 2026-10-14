import { sendWebPush } from "./_webpush.js";
import { ENFORCE_DATE, istToday, missingDocs, isComplete } from "./trip_class.js";

/* Daily check of every vehicle's documents (runs by itself once a day, on the first API request of the day).
   1. Permit / Insurance dates: message + phone notification 30, 7 and 1 day before and when expired.
      An expired vehicle loses Verified (the business itself stays).
   2. Missing documents (front/RC/insurance/permit photos, insurance/permit dates): reminders about the
      ENFORCE_DATE rule (first notice, then 30, 7, 1 day before, and on the day).
   3. From ENFORCE_DATE: vehicles with incomplete documents lose Verified; Auto/Goods owners left with no verified
      vehicle lose Verified too. They get alerts again after uploading and being approved by the admin. */

let lastRun = "";
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
          const r = await sendWebPush(env, sub, payload);
          if (r.stale) await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
        } catch (e) {}
      }));
    }
  } catch (e) {}
}
/* One message in the owner's Messages box (from "Travel Connect") + a notification. Once per key. */
async function notify(env, key, p, title, body) {
  const seen = await env.DB.prepare("SELECT 1 AS x FROM doc_notices WHERE k=?").bind(key).first();
  if (seen) return false;
  try {
    await env.DB.prepare("INSERT INTO messages (partner_id, customer_mobile, customer_name, from_customer, body, created_at) VALUES (?,?,?,?,?,?)")
      .bind(p.id, "TC-SYSTEM", "Travel Connect", 1, body, new Date().toISOString()).run();
  } catch (e) { return false; }
  await env.DB.prepare("INSERT INTO doc_notices (k, sent_at) VALUES (?,?)").bind(key, new Date().toISOString()).run();
  await push(env, [p.mobile1, p.mobile2], title, body.split("\n")[0].slice(0, 160), "tc-doc-" + key.replace(/[^a-z0-9]/gi, "-"));
  return true;
}

export async function runExpirySweep(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS doc_notices (k TEXT PRIMARY KEY, sent_at TEXT)").run();
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
  const today = istToday();
  const enforced = today >= ENFORCE_DATE;
  const { results: vehicles } = await env.DB.prepare(
    "SELECT v.*, p.business_name, p.mobile1, p.mobile2, p.business_type, p.verified AS pverified FROM vehicles v JOIN travel_partners p ON p.id=v.partner_id"
  ).all();
  const { results: partners } = await env.DB.prepare(
    "SELECT id, business_name, mobile1, mobile2, business_type, verified FROM travel_partners WHERE business_type IN ('taxi_travel','auto_rickshaw','pickup_goods')"
  ).all();
  const stats = { vehicles: vehicles.length, sent: 0, vehicles_unverified: 0, partners_unverified: 0 };
  const byPartner = new Map();
  for (const v of vehicles) { if (!byPartner.has(v.partner_id)) byPartner.set(v.partner_id, []); byPartner.get(v.partner_id).push(v); }

  /* 1. permit / insurance dates */
  for (const v of vehicles) {
    const p = { id: v.partner_id, mobile1: v.mobile1, mobile2: v.mobile2 };
    for (const [doc, en, ml, date] of [["permit", "Permit", "പെർമിറ്റ്", v.permit_expiry], ["ins", "Insurance", "ഇൻഷുറൻസ്", v.insurance_expiry]]) {
      if (!date) continue;
      const dl = dayDiff(date, today);
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
      if (await notify(env, `v${v.id}:${doc}:${date}:${stage}`, p, stage === 0 ? `${en} expired - ${no}` : `${en} expires soon - ${no}`, body)) stats.sent++;
    }
  }

  /* 2. missing documents - reminders about the ENFORCE_DATE rule */
  const du = dayDiff(ENFORCE_DATE, today);
  const rstage = du <= 0 ? 0 : du <= 1 ? 1 : du <= 7 ? 7 : du <= 30 ? 30 : 100;
  for (const p of partners) {
    const vs = byPartner.get(p.id) || [];
    const lines = [];
    for (const v of vs) {
      const miss = missingDocs(v, today).filter((m) => !/expired/i.test(m));
      if (miss.length) lines.push(`${v.vehicle_number || "vehicle"}: ${miss.join(", ")}`);
    }
    if (!vs.length && p.business_type !== "taxi_travel") lines.push("No vehicle added yet");
    if (!lines.length) continue;
    const list = lines.slice(0, 6).join("\n");
    const when = du > 0 ? `From 1 January 2027` : `Since 1 January 2027`;
    const body = `${when}, only vehicles with complete documents stay Verified and get trip alerts: Front photo, RC photo, Insurance photo + expiry date, Permit photo + expiry date. Please complete (Business page > Vehicles):\n${list}\n\n2027 ജനുവരി 1 മുതൽ മുൻവശത്തെ ഫോട്ടോ, RC ഫോട്ടോ, ഇൻഷുറൻസ് ഫോട്ടോയും തീയതിയും, പെർമിറ്റ് ഫോട്ടോയും തീയതിയും പൂർണ്ണമായുള്ള വാഹനങ്ങൾക്ക് മാത്രമേ Verified സ്റ്റാറ്റസും ട്രിപ്പ് അലേർട്ടുകളും ലഭിക്കൂ. Business പേജിലെ Vehicles-ൽ പൂർത്തിയാക്കുക.`;
    if (await notify(env, `p${p.id}:ready:${rstage}`, p, du > 0 ? "Complete your vehicle documents" : "Vehicle documents incomplete", body)) stats.sent++;
  }

  /* 3. enforcement */
  if (enforced) {
    for (const v of vehicles) {
      if (v.verified && !isComplete(v, today)) {
        await env.DB.prepare("UPDATE vehicles SET verified=0 WHERE id=?").bind(v.id).run();
        v.verified = 0; stats.vehicles_unverified++;
      }
    }
    for (const p of partners) {
      if (p.business_type === "taxi_travel" || !p.verified) continue;
      if (!(byPartner.get(p.id) || []).some((v) => v.verified)) {
        await env.DB.prepare("UPDATE travel_partners SET verified=0 WHERE id=?").bind(p.id).run();
        stats.partners_unverified++;
      }
    }
  }
  return stats;
}

/* Called from worker.js on API requests; does real work at most once per day. */
export async function maybeRunExpirySweep(env) {
  const today = istToday();
  if (lastRun === today) return;
  lastRun = today;
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key='expiry_sweep_date'").first();
    if (r && r.value === today) return;
    await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES ('expiry_sweep_date', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(today).run();
    await runExpirySweep(env);
  } catch (e) { lastRun = ""; }
}
