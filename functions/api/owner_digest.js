/* ---------- OWNER DIGEST (reminders while the app is closed) ----------
   The owner's phone sends a SMALL summary (never the whole book) of what is coming up:
     bookings for today / tomorrow / the day after (date, time, customer name, short route, vehicle) and
     driving licences that end within about a month (driver name + date).
   POST /api/owner_digest  { mobile, device, digest }   (same device-token check as the cloud backup; needs a Taxi / Travel partner)
   The summary replaces the previous one of that mobile. It is only used by the daily sweep in docs_expiry.js:
     morning (before 17:00 IST):  "Bookings today / tomorrow"  +  licence reminders 30 / 7 / 1 day before and when expired
     evening (from 17:00 IST):    "Tomorrow's bookings"
   as a message in the owner's Messages box + a phone notification (docs_expiry.js notify(); each reminder is sent once).
   Summaries older than 4 days are ignored (the phone has not been opened). */

const MAX_TEXT = 8000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const s = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

async function ensure(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS owner_digest (mobile TEXT PRIMARY KEY, data TEXT, updated_at TEXT)").run();
}
async function authUser(env, mobile, device) {
  mobile = (mobile || "").trim();
  device = (device || "").trim();
  if (!mobile || !device) return false;
  const row = await env.DB.prepare("SELECT mobile, blocked, device_token FROM app_users WHERE mobile=?").bind(mobile).first();
  if (!row || row.blocked) return false;
  if (row.device_token === device) return true;
  try {
    const known = await env.DB.prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?").bind(mobile, device).first();
    if (known) return true;
  } catch (e) {}
  return false;
}
function clean(d) {
  const out = { bookings: [], lic: [] };
  if (!d || typeof d !== "object") return out;
  for (const b of Array.isArray(d.bookings) ? d.bookings.slice(0, 40) : []) {
    if (!b || !DATE_RE.test(String(b.d || ""))) continue;
    out.bookings.push({ d: b.d, t: s(b.t, 8), n: s(b.n, 40), r: s(b.r, 60), w: s(b.w, 40) });
  }
  for (const l of Array.isArray(d.lic) ? d.lic.slice(0, 30) : []) {
    if (!l || !DATE_RE.test(String(l.e || ""))) continue;
    out.lic.push({ n: s(l.n, 40), e: l.e });
  }
  return out;
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  const mobile = s(body.mobile, 20);
  if (!(await authUser(env, mobile, body.device))) return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  const p = await env.DB.prepare("SELECT id FROM travel_partners WHERE (mobile1=? OR mobile2=?) AND business_type='taxi_travel'").bind(mobile, mobile).first();
  if (!p) return Response.json({ ok: true, stored: false });
  const data = JSON.stringify(clean(body.digest));
  if (data.length > MAX_TEXT) return Response.json({ ok: false, error: "too_big" }, { status: 413 });
  await ensure(env);
  await env.DB.prepare("INSERT INTO owner_digest (mobile, data, updated_at) VALUES (?,?,?) ON CONFLICT(mobile) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at")
    .bind(mobile, data, new Date().toISOString()).run();
  return Response.json({ ok: true, stored: true });
}

const nice = (d) => d.split("-").reverse().join("-");
const slug = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "x";
function lines(list) {
  return list.slice(0, 8).map((b) => `${b.t ? b.t + " " : ""}${b.n || "-"}${b.r ? " - " + b.r : ""}${b.w ? " (" + b.w + ")" : ""}`).join("\n") + (list.length > 8 ? `\n+${list.length - 8} more` : "");
}

/* slot "am": today's + tomorrow's bookings (only before 17:00 IST) and licence reminders; slot "pm": tomorrow's bookings.
   x = { notify, full, today, tomorrow, hour, dayDiff }. Returns { sent, more, owners }. */
export async function runDigestSweep(env, x, slot) {
  const res = { sent: 0, more: false, owners: 0 };
  await ensure(env);
  const cutoff = new Date(Date.now() - 4 * 86400000).toISOString();
  const { results } = await env.DB.prepare("SELECT mobile, data FROM owner_digest WHERE updated_at>? LIMIT 40").bind(cutoff).all();
  for (const row of results || []) {
    if (x.full()) { res.more = true; break; }
    const p = await env.DB.prepare("SELECT id, mobile1, mobile2 FROM travel_partners WHERE (mobile1=? OR mobile2=?) AND business_type='taxi_travel' LIMIT 1").bind(row.mobile, row.mobile).first();
    if (!p) continue;
    let d; try { d = clean(JSON.parse(row.data)); } catch (e) { continue; }
    res.owners++;
    const td = d.bookings.filter((b) => b.d === x.today).sort((a, b) => a.t.localeCompare(b.t));
    const tm = d.bookings.filter((b) => b.d === x.tomorrow).sort((a, b) => a.t.localeCompare(b.t));
    if (slot === "am" && x.hour < 17 && (td.length || tm.length)) {
      const title = `Bookings - today ${td.length}, tomorrow ${tm.length} / ബുക്കിംഗ് - ഇന്ന് ${td.length}, നാളെ ${tm.length}`;
      const body = title + (td.length ? `\n\nToday / ഇന്ന്:\n${lines(td)}` : "") + (tm.length ? `\n\nTomorrow / നാളെ:\n${lines(tm)}` : "");
      if (await x.notify(env, `dg:${row.mobile}:am:${x.today}`, p, title, body, false, true)) res.sent++;
    }
    if (slot === "pm" && tm.length) {
      const title = `Tomorrow: ${tm.length} booking${tm.length === 1 ? "" : "s"} / നാളെ ${tm.length} ബുക്കിംഗ്`;
      const body = title + `\n\n${lines(tm)}`;
      if (await x.notify(env, `dg:${row.mobile}:pm:${x.tomorrow}`, p, title, body, false, true)) res.sent++;
    }
    if (slot === "am") {
      for (const l of d.lic) {
        if (x.full()) { res.more = true; break; }
        const dl = x.dayDiff(l.e, x.today);
        if (!Number.isFinite(dl)) continue;
        const st = dl < 0 ? 0 : dl <= 1 ? 1 : dl <= 7 ? 7 : dl <= 30 ? 30 : null;
        if (st === null) continue;
        const who = l.n || "driver", dt = nice(l.e);
        const title = st === 0 ? `Driving licence expired - ${who}` : `Driving licence ends soon - ${who}`;
        const body = st === 0
          ? `Driving licence of ${who} expired on ${dt}. Please renew it and update the date (Trip & Accounts > Drivers).\n${who}-ന്റെ ഡ്രൈവിംഗ് ലൈസൻസ് ${dt}-ന് കാലാവധി കഴിഞ്ഞു. പുതുക്കി തീയതി മാറ്റുക (Trip & Accounts > ഡ്രൈവർമാർ).`
          : `Driving licence of ${who} ends on ${dt} (${dl <= 0 ? "today" : dl + " day" + (dl === 1 ? "" : "s") + " left"}). Please renew it and update the date (Trip & Accounts > Drivers).\n${who}-ന്റെ ഡ്രൈവിംഗ് ലൈസൻസ് ${dt}-ന് കഴിയും (${dl <= 0 ? "ഇന്ന്" : dl + " ദിവസം ബാക്കി"}). പുതുക്കി തീയതി മാറ്റുക (Trip & Accounts > ഡ്രൈവർമാർ).`;
        if (await x.notify(env, `dg:${row.mobile}:lic:${slug(who)}:${l.e}:${st}`, p, title, body, st !== 30, false)) res.sent++;
      }
    }
  }
  return res;
}
