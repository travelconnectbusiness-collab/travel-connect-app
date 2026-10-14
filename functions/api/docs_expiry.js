import { sendWebPush } from "./_webpush.js";

/* Daily check of vehicle-document dates (permit / insurance).
   - 30 days, 7 days and 1 day before the date: a message in the owner's Messages box + a phone notification.
   - After the date: Verified status is removed (so the business drops out of the verified list and trip alerts)
     and the owner is told how to renew. When they upload new documents, the admin re-approves from Pending Approvals.
   There is no cron job: the check runs automatically once a day, on the first API request of the day. */

let lastRun = "";
const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const daysLeft = (d) => Math.round((new Date(d + "T00:00:00Z") - new Date(istToday() + "T00:00:00Z")) / 86400000);

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

export async function runExpirySweep(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS reg_docs_notices (partner_id INTEGER, doc TEXT, stage INTEGER, sent_at TEXT, PRIMARY KEY (partner_id, doc, stage))").run();
  const { results } = await env.DB.prepare(
    "SELECT d.partner_id, d.permit_expiry, d.ins_expiry, p.business_name, p.mobile1, p.mobile2, p.verified FROM reg_docs d JOIN travel_partners p ON p.id=d.partner_id"
  ).all();
  let sent = 0, unverified = 0;
  for (const r of results) {
    for (const [doc, en, ml, date] of [["permit", "Permit", "പെർമിറ്റ്", r.permit_expiry], ["ins", "Insurance", "ഇൻഷുറൻസ്", r.ins_expiry]]) {
      if (!date) continue;
      const dl = daysLeft(date);
      const stage = dl < 0 ? 0 : dl <= 1 ? 1 : dl <= 7 ? 7 : dl <= 30 ? 30 : null;
      if (stage === 0 && r.verified) {
        await env.DB.prepare("UPDATE travel_partners SET verified=0 WHERE id=?").bind(r.partner_id).run();
        r.verified = 0; unverified++;
      }
      if (stage === null) continue;
      const seen = await env.DB.prepare("SELECT 1 AS x FROM reg_docs_notices WHERE partner_id=? AND doc=? AND stage=?").bind(r.partner_id, doc, stage).first();
      if (seen) continue;
      const name = r.business_name || "your business";
      const body = stage === 0
        ? `${en} of ${name} expired on ${date}. Your Verified status has been removed and you will not get trip alerts until you upload the renewed document (Business page > Vehicle documents).\n${ml} കാലാവധി ${date}-ന് കഴിഞ്ഞു. നിങ്ങളുടെ Verified സ്റ്റാറ്റസ് ഒഴിവാക്കി, ട്രിപ്പ് അലേർട്ടുകൾ കിട്ടില്ല. പുതുക്കിയ രേഖ Business പേജിലെ Vehicle documents-ൽ അപ്‌ലോഡ് ചെയ്യുക.`
        : `${en} of ${name} expires on ${date} (${dl <= 0 ? "today" : dl + " day" + (dl === 1 ? "" : "s") + " left"}). Please upload the renewed document (Business page > Vehicle documents) or your Verified status will be removed.\n${ml} ${date}-ന് കാലാവധി തീരും (${dl <= 0 ? "ഇന്ന്" : dl + " ദിവസം ബാക്കി"}). പുതുക്കിയ രേഖ Business പേജിലെ Vehicle documents-ൽ അപ്‌ലോഡ് ചെയ്യുക, ഇല്ലെങ്കിൽ Verified സ്റ്റാറ്റസ് ഒഴിവാക്കും.`;
      try {
        await env.DB.prepare("INSERT INTO messages (partner_id, customer_mobile, customer_name, from_customer, body, created_at) VALUES (?,?,?,?,?,?)")
          .bind(r.partner_id, "TC-SYSTEM", "Travel Connect", 1, body, new Date().toISOString()).run();
      } catch (e) { continue; }
      await env.DB.prepare("INSERT INTO reg_docs_notices (partner_id, doc, stage, sent_at) VALUES (?,?,?,?)").bind(r.partner_id, doc, stage, new Date().toISOString()).run();
      await push(env, [r.mobile1, r.mobile2], stage === 0 ? `${en} expired - action needed` : `${en} expires soon`, body.split("\n")[0].slice(0, 160), `tc-doc-${r.partner_id}-${doc}-${stage}`);
      sent++;
    }
  }
  return { checked: results.length, sent, unverified };
}

/* Called from worker.js on API requests; does real work at most once per day per server instance. */
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
