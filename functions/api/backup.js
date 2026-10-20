/* ---------- CLOUD BACKUP (Premium) ----------
   Stores one backup of a Premium owner's bills, quotations, trips, customers,
   etc. in R2 (env.FILES) under backups/<mobile>/. The data otherwise lives
   only in the phone's browser storage, which is separate for every web
   address and is lost if the app is uninstalled or site data is cleared.

   POST ?action=put   { mobile, device, data, force }  -> save a backup
   POST ?action=get   { mobile, device }               -> download it
   POST ?action=info  { mobile, device }               -> date + counts only

   Every call checks the DEVICE TOKEN recorded at login (same rule as the
   blood-donor actions), and the mobile must belong to a Premium (or
   owner_free) partner. A new backup that holds FEWER records than the one
   already stored is refused unless force=true - so a freshly installed,
   empty app can never wipe a good backup by accident. The previous backup
   is always kept as prev.json. */

/* The phone adds more lists to the backup (tc-livetrip.js: liveTrips; tc-accbook.js: accVehicles, accEntries; tc-enq.js: bookings).
   They are saved as sent; listing them here also counts them, so a smaller backup can never wipe a bigger one. */
const LIST_KEYS = ["vehicles", "drivers", "customers", "enquiries", "quotes", "trips", "bills", "expenses", "liveTrips", "accVehicles", "accEntries", "bookings"];
const MAX_BYTES = 8 * 1024 * 1024;

async function authUser(env, mobile, device) {
  mobile = (mobile || "").trim();
  device = (device || "").trim();
  if (!mobile || !device) return false;
  const row = await env.DB
    .prepare("SELECT mobile, blocked, device_token FROM app_users WHERE mobile=?")
    .bind(mobile)
    .first();
  if (!row || row.blocked) return false;
  if (row.device_token === device) return true;
  try {
    const known = await env.DB
      .prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?")
      .bind(mobile, device)
      .first();
    if (known) return true;
  } catch (e) {}
  return false;
}

async function isPremium(env, mobile) {
  const rows = await env.DB
    .prepare("SELECT plan, plan_expires_at FROM travel_partners WHERE mobile1=? OR mobile2=?")
    .bind(mobile, mobile)
    .all();
  const now = Date.now();
  return (rows.results || []).some((r) => {
    if (r.plan === "owner_free") return true;
    if (r.plan !== "premium") return false;
    if (!r.plan_expires_at) return true;
    return new Date(r.plan_expires_at).getTime() > now;
  });
}

function countOf(data) {
  const counts = {};
  let total = 0;
  for (const k of LIST_KEYS) {
    const n = Array.isArray(data && data[k]) ? data[k].length : 0;
    counts[k] = n;
    total += n;
  }
  return { counts, total };
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  let body;
  try { body = await request.json(); } catch (e) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const mobile = (body.mobile || "").toString().trim();
  if (!(await authUser(env, mobile, body.device))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }
  if (!(await isPremium(env, mobile))) {
    return Response.json({ ok: false, error: "not_premium" }, { status: 403 });
  }
  const base = `backups/${mobile}/`;

  if (action === "info" || action === "get") {
    const obj = await env.FILES.get(base + "latest.json");
    if (!obj) return Response.json({ ok: true, exists: false });
    const saved = JSON.parse(await obj.text());
    const c = countOf(saved.data);
    if (action === "info") return Response.json({ ok: true, exists: true, savedAt: saved.savedAt, counts: c.counts, total: c.total });
    return Response.json({ ok: true, exists: true, savedAt: saved.savedAt, counts: c.counts, total: c.total, data: saved.data });
  }

  if (action === "put") {
    if (!body.data || typeof body.data !== "object") {
      return Response.json({ ok: false, error: "no_data" }, { status: 400 });
    }
    const text = JSON.stringify({ savedAt: new Date().toISOString(), data: body.data });
    if (text.length > MAX_BYTES) {
      return Response.json({ ok: false, error: "too_big" }, { status: 413 });
    }
    const incoming = countOf(body.data);
    const old = await env.FILES.get(base + "latest.json");
    if (old) {
      const oldText = await old.text();
      let oldTotal = 0;
      try { oldTotal = countOf(JSON.parse(oldText).data).total; } catch (e) {}
      if (!body.force && incoming.total < oldTotal) {
        return Response.json({ ok: false, error: "would_shrink", server_total: oldTotal, local_total: incoming.total }, { status: 409 });
      }
      await env.FILES.put(base + "prev.json", oldText, { httpMetadata: { contentType: "application/json" } });
    }
    await env.FILES.put(base + "latest.json", text, { httpMetadata: { contentType: "application/json" } });
    return Response.json({ ok: true, savedAt: JSON.parse(text).savedAt, total: incoming.total, counts: incoming.counts });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
