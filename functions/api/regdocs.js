import { verifyAdminToken } from "./_auth_helper.js";
import { runExpirySweep } from "./docs_expiry.js";
import { getEnforceDate, setEnforceDate, dateLabels, istToday, missingDocs, vclassOf, seatsOf } from "./trip_class.js";
import { notify } from "./docs_expiry.js";
import { sendWebPush } from "./_webpush.js";

/* Vehicle-document status (the documents themselves live on each vehicle record).
   GET ?action=status&partner_id&mobile&device   owner: what is still missing?
   GET ?action=admin_summary&partner_id&token    admin: the partner's vehicles with documents
   GET ?action=sweep&token                       admin: run the daily check now
   GET ?action=enforce_preview&token             admin: who will lose Verified on the deadline, and why
   POST {action:"set_enforce_date",date,token}   admin: change the deadline (must be a future date)
   POST {action:"remind",partner_ids:[..],token} admin: send the "complete your documents" message (max 3 owners per call)
   POST {action:"push_test",partner_id,mobile,device} owner: send ONE test notification to the owner's own phones (max 3 per hour per business, max 3 phones) */
const j = (o, s) => Response.json(o, s ? { status: s } : undefined);

async function ownerAuth(env, partnerId, mobile, device) {
  partnerId = parseInt(partnerId, 10);
  mobile = (mobile || "").toString().trim();
  device = (device || "").toString().trim();
  if (!partnerId || !mobile || !device) return null;
  const p = await env.DB.prepare("SELECT * FROM travel_partners WHERE id=?").bind(partnerId).first();
  if (!p || (p.mobile1 !== mobile && p.mobile2 !== mobile)) return null;
  const u = await env.DB.prepare("SELECT device_token, blocked FROM app_users WHERE mobile=?").bind(mobile).first();
  if (!u || u.blocked) return null;
  if (!u.device_token) { await env.DB.prepare("UPDATE app_users SET device_token=? WHERE mobile=?").bind(device, mobile).run(); return p; }
  if (u.device_token === device) return p;
  try {
    const known = await env.DB.prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?").bind(mobile, device).first();
    if (known) return p;
  } catch (e) {}
  return null;
}
async function vehiclesOf(env, partnerId) {
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
  return ((await env.DB.prepare("SELECT v.*, (SELECT business_type FROM travel_partners WHERE id=v.partner_id) AS business_type FROM vehicles v WHERE v.partner_id=? ORDER BY v.id").bind(partnerId).all()).results) || [];
}

/* ---- owner: "Test Notification" button. Sends one harmless notification to the owner's OWN registered phones.
   Shown by the service worker like a chat message (type "message") so sw.js needs no change. Free-plan cost: about 6 queries + up to 3 pushes. */
const TEST_PER_HOUR = 3, TEST_MAX_PHONES = 3;
let testReady = false;
async function pushTest(env, b) {
  const p = await ownerAuth(env, b.partner_id, b.mobile, b.device);
  if (!p) return j({ ok: false, error: "unauthorized" }, 401);
  if (!testReady) {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS push_tests (id INTEGER PRIMARY KEY AUTOINCREMENT, partner_id INTEGER, created_at TEXT)").run();
    testReady = true;
  }
  const numbers = [...new Set([p.mobile1, p.mobile2].filter(Boolean))];
  if (!numbers.length) return j({ ok: true, devices: 0, sent: 0, failed: 0, removed: 0 });
  const ph = numbers.map(() => "?").join(",");
  const subs = ((await env.DB.prepare(`SELECT * FROM push_subscriptions WHERE mobile IN (${ph}) ORDER BY created_at DESC LIMIT ?`).bind(...numbers, TEST_MAX_PHONES).all()).results) || [];
  /* no registered phone: nothing is sent and it does not count as a test */
  if (!subs.length) return j({ ok: true, devices: 0, sent: 0, failed: 0, removed: 0 });
  const now = Date.now(), since = new Date(now - 3600000).toISOString();
  const c = await env.DB.prepare("SELECT COUNT(*) AS n, MIN(created_at) AS first FROM push_tests WHERE partner_id=? AND created_at>=?").bind(p.id, since).first();
  if (c && c.n >= TEST_PER_HOUR) {
    const wait = c.first ? Math.max(1, Math.ceil((new Date(c.first).getTime() + 3600000 - now) / 60000)) : 60;
    return j({ ok: false, error: "limited", retry_after_min: wait }, 429);
  }
  await env.DB.prepare("INSERT INTO push_tests (partner_id, created_at) VALUES (?,?)").bind(p.id, new Date(now).toISOString()).run();
  if (Math.random() < 0.1) { try { await env.DB.prepare("DELETE FROM push_tests WHERE created_at < ?").bind(new Date(now - 2 * 86400000).toISOString()).run(); } catch (e) {} }
  const payload = { type: "message", title: "\u2705 Travel Connect test", body: "Notifications are working on this phone. Trip alerts will reach you here.", tag: "tc-test", url: "/" };
  const res = await Promise.all(subs.map((s) => sendWebPush(env, s, payload).catch(() => ({ ok: false, stale: false }))));
  const stale = subs.filter((s, i) => res[i] && res[i].stale).map((s) => s.endpoint);
  if (stale.length) { try { await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint IN (${stale.map(() => "?").join(",")})`).bind(...stale).run(); } catch (e) {} }
  const sent = res.filter((r) => r && r.ok).length;
  return j({ ok: true, devices: subs.length, sent, failed: subs.length - sent - stale.length, removed: stale.length });
}

const VEH_TYPES = ["taxi_travel", "auto_rickshaw", "pickup_goods"];
const dayDiff = (a, b) => Math.round((new Date(a + "T00:00:00Z") - new Date(b + "T00:00:00Z")) / 86400000);

/* Readable wording for what is missing, with the real dates (English + Malayalam). */
const ML_DOC = {
  "Front photo": "മുൻവശത്തെ ഫോട്ടോ", "RC photo": "RC ഫോട്ടോ", "Insurance photo": "ഇൻഷുറൻസ് ഫോട്ടോ", "Permit photo": "പെർമിറ്റ് ഫോട്ടോ",
  "Insurance expiry date": "ഇൻഷുറൻസ് തീയതി ചേർത്തിട്ടില്ല", "Permit expiry date": "പെർമിറ്റ് തീയതി ചേർത്തിട്ടില്ല",
  "Seating capacity (passenger seats)": "സീറ്റ് ശേഷി (യാത്രക്കാരുടെ സീറ്റ്)",
};
const dmy = (d) => String(d).split("-").reverse().join("-");
function describe(v, miss, today, deadline) {
  const en = [], ml = [];
  for (const m of miss) {
    const k = /^Insurance expired/.test(m) ? "ins" : /^Permit expired/.test(m) ? "per" : null;
    if (!k) { en.push(m); ml.push(ML_DOC[m] || m); continue; }
    const date = k === "ins" ? v.insurance_expiry : v.permit_expiry;
    const nameEn = k === "ins" ? "Insurance" : "Permit", nameMl = k === "ins" ? "ഇൻഷുറൻസ്" : "പെർമിറ്റ്";
    const left = dayDiff(date, today);
    if (left < 0) { en.push(`${nameEn} expired on ${dmy(date)}`); ml.push(`${nameMl} ${dmy(date)}-ന് കഴിഞ്ഞു`); }
    else {
      en.push(`${nameEn} expires on ${dmy(date)}${left > 0 ? " (" + left + " days left)" : " (today)"}`);
      ml.push(`${nameMl} ${dmy(date)}-ന് തീരും${left > 0 ? " (" + left + " ദിവസം ബാക്കി)" : " (ഇന്ന്)"}`);
    }
  }
  return { en, ml };
}

/* What happens to one owner on the deadline. ref = the date the documents are judged on
   (the deadline itself, or today if the deadline has passed). */
function riskOf(p, vs, ref, future, today) {
  const risky = [];
  for (const v of vs) {
    if (!v.verified) continue;
    const miss = missingDocs(v, ref);
    if (!miss.length) continue;
    const d = describe(v, miss, today, ref);
    risky.push({ id: v.id, vehicle_number: v.vehicle_number, missing: d.en, missing_ml: d.ml });
  }
  const verifiedOk = vs.some((v) => v.verified && !missingDocs(v, ref).length);
  const loses = p.business_type !== "taxi_travel" && !!p.verified && !verifiedOk;
  const noVehicle = !vs.length && p.business_type !== "taxi_travel";
  return { risky, loses, noVehicle };
}
async function loadAll(env) {
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
  const vehicles = ((await env.DB.prepare("SELECT v.*, p.business_type FROM vehicles v JOIN travel_partners p ON p.id=v.partner_id").all()).results) || [];
  const partners = ((await env.DB.prepare("SELECT id, business_name, owner_name, mobile1, mobile2, business_type, verified FROM travel_partners WHERE business_type IN ('taxi_travel','auto_rickshaw','pickup_goods')").all()).results) || [];
  return { vehicles, partners };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const today = istToday();

  if (action === "status") {
    const p = await ownerAuth(env, url.searchParams.get("partner_id"), url.searchParams.get("mobile"), url.searchParams.get("device"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    const vs = await vehiclesOf(env, p.id);
    const list = vs.map((v) => ({ id: v.id, vehicle_number: v.vehicle_number, verified: !!v.verified, missing: missingDocs(v, today) }));
    const hasComplete = list.some((v) => v.missing.length === 0);
    const vehicleType = ["taxi_travel", "auto_rickshaw", "pickup_goods"].includes(p.business_type || "taxi_travel");
    let authorized = false;
    try { authorized = !!(await env.DB.prepare("SELECT 1 AS x FROM authorized_users WHERE mobile=?").bind(p.mobile1).first()); } catch (e) {}
    /* Auto / Goods owners must register a vehicle with complete documents before approval (unless on the Authorized list). */
    const required = ["auto_rickshaw", "pickup_goods"].includes(p.business_type) && !p.verified && !authorized && !hasComplete;
    return j({ ok: true, vehicle_type: vehicleType, required, enforce_date: await getEnforceDate(env), vehicles: list });
  }

  if (action === "enforce_preview") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) return j({ ok: false, error: "unauthorized" }, 401);
    const ed = await getEnforceDate(env);
    const future = ed > today, ref = future ? ed : today;
    const { vehicles, partners } = await loadAll(env);
    const by = new Map();
    for (const v of vehicles) { if (!by.has(v.partner_id)) by.set(v.partner_id, []); by.get(v.partner_id).push(v); }
    const owners = [];
    let nVeh = 0, nLose = 0;
    for (const p of partners) {
      const r = riskOf(p, by.get(p.id) || [], ref, future, today);
      if (!r.risky.length && !r.loses) continue;
      nVeh += r.risky.length; if (r.loses) nLose++;
      owners.push({ partner_id: p.id, business_name: p.business_name, owner_name: p.owner_name, mobile1: p.mobile1, mobile2: p.mobile2,
        business_type: p.business_type, loses_verified: r.loses, no_vehicle: r.noVehicle, vehicles: r.risky });
    }
    owners.sort((a, b) => (b.loses_verified - a.loses_verified) || String(a.business_name).localeCompare(String(b.business_name)));
    return j({ ok: true, enforce_date: ed, today, days_left: dayDiff(ed, today), enforced: !future, owners,
      totals: { owners: owners.length, vehicles: nVeh, owners_losing_verified: nLose } });
  }

  if (action === "admin_summary" || action === "sweep") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) return j({ ok: false, error: "unauthorized" }, 401);
    if (action === "sweep") return j({ ok: true, ...(await runExpirySweep(env)) });
    const vs = await vehiclesOf(env, url.searchParams.get("partner_id"));
    return j({
      ok: true,
      vehicles: vs.map((v) => ({
        id: v.id, vehicle_number: v.vehicle_number, category: v.category, seats: seatsOf(v), vclass: vclassOf(v), verified: !!v.verified,
        rate_cat: v.rate_cat || null, rate_cat_name: v.rate_cat_name || null,
        permit_expiry: v.permit_expiry, insurance_expiry: v.insurance_expiry, rc_expiry: v.rc_expiry,
        keys: { Front: v.front_photo_key, RC: v.rc_photo_key, Insurance: v.insurance_photo_key, Permit: v.permit_photo_key },
        missing: missingDocs(v, today),
      })),
    });
  }
  return j({ ok: false, error: "unknown_action" });
}

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch (e) {}
  if (b.action === "push_test") return pushTest(env, b);
  if (b.action !== "set_enforce_date" && b.action !== "remind") return j({ ok: false, error: "unknown_action" });
  if (!(await verifyAdminToken(env, b.token))) return j({ ok: false, error: "unauthorized" }, 401);
  const today = istToday();

  if (b.action === "set_enforce_date") {
    const d = String(b.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(new Date(d + "T00:00:00Z"))) return j({ ok: false, error: "bad_date" }, 400);
    if (d <= today) return j({ ok: false, error: "must_be_future" }, 400);
    if (dayDiff(d, today) > 730) return j({ ok: false, error: "too_far" }, 400);
    await setEnforceDate(env, d);
    return j({ ok: true, enforce_date: d });
  }

  /* remind: at most 3 owners per call (keeps each request inside the free-plan limits) */
  const ids = (Array.isArray(b.partner_ids) ? b.partner_ids : []).map((x) => parseInt(x, 10)).filter((x) => x > 0).slice(0, 3);
  const ed = await getEnforceDate(env);
  const future = ed > today, ref = future ? ed : today;
  const dl = dateLabels(ed);
  const out = { ok: true, sent: 0, already_today: 0, nothing_to_fix: 0 };
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS doc_notices (k TEXT PRIMARY KEY, sent_at TEXT)").run();
  for (const id of ids) {
    const p = await env.DB.prepare("SELECT id, business_name, mobile1, mobile2, business_type, verified FROM travel_partners WHERE id=?").bind(id).first();
    if (!p || !VEH_TYPES.includes(p.business_type)) { out.nothing_to_fix++; continue; }
    const vs = await vehiclesOf(env, id);
    const r = riskOf(p, vs, ref, future, today);
    if (!r.risky.length && !r.loses) { out.nothing_to_fix++; continue; }
    const linesEn = r.risky.map((v) => `${v.vehicle_number || "vehicle"}: ${v.missing.join("; ")}`);
    const linesMl = r.risky.map((v) => `${v.vehicle_number || "vehicle"}: ${v.missing_ml.join("; ")}`);
    if (r.noVehicle) { linesEn.push("No vehicle added yet"); linesMl.push("വാഹനം ഒന്നും ചേർത്തിട്ടില്ല"); }
    const en = `Reminder from Travel Connect: ${future ? "from " + dl.en : "since " + dl.en}, only vehicles with complete and valid documents stay Verified and get trip alerts.${r.loses ? " Your business will lose its Verified status if this is not completed." : ""}\nWhat needs attention (Business page > Vehicles > Edit):\n${linesEn.slice(0, 6).join("\n")}`;
    const ml = `ഓർമ്മപ്പെടുത്തൽ: ${dl.ml} ${future ? "മുതൽ" : "മുതൽ (ഇപ്പോൾ പ്രാബല്യത്തിൽ)"} രേഖകൾ പൂർണ്ണവും കാലാവധിയുള്ളതുമായ വാഹനങ്ങൾക്ക് മാത്രമേ Verified സ്റ്റാറ്റസും ട്രിപ്പ് അലേർട്ടുകളും ലഭിക്കൂ.${r.loses ? " ഇത് പൂർത്തിയാക്കിയില്ലെങ്കിൽ നിങ്ങളുടെ ബിസിനസ്സിന്റെ Verified ഒഴിവാക്കും." : ""}\nശ്രദ്ധിക്കേണ്ടത് (Business പേജ് > Vehicles > Edit):\n${linesMl.slice(0, 6).join("\n")}`;
    const sent = await notify(env, `p${id}:remind2:${today}`, p, "Complete your vehicle documents", en + "\n\n" + ml, true);
    if (sent) out.sent++; else out.already_today++;
  }
  return j(out);
}
