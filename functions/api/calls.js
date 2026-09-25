/* functions/api/calls.js
   Logs a call made through the app (tcCallWithLog() in directory.js) -
   who called whom, when, and the caller's GPS location if they granted
   permission. Lets a partner see "who called me, from where" on their own
   page, and (customer-safety.js) lets a customer see their own call
   history. Requires the D1 table below to be created once. */

const createTableSql = `CREATE TABLE IF NOT EXISTS call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caller_name TEXT,
  caller_mobile TEXT NOT NULL,
  callee_mobile TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  target_label TEXT,
  lat REAL,
  lon REAL,
  created_at TEXT NOT NULL
)`;

export async function onRequestPost({ request, env }) {
  await env.DB.prepare(createTableSql).run();
  const body = await request.json();
  const { caller_name, caller_mobile, callee_mobile, target_type, target_id, target_label, lat, lon } = body;
  if (!caller_mobile || !callee_mobile) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  await env.DB.prepare(
    `INSERT INTO call_logs (caller_name, caller_mobile, callee_mobile, target_type, target_id, target_label, lat, lon, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    caller_name || "", caller_mobile, callee_mobile,
    target_type || null, target_id || null, target_label || "",
    lat ?? null, lon ?? null, new Date().toISOString()
  ).run();
  return Response.json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  await env.DB.prepare(createTableSql).run();
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "received") {
    // Calls received BY a partner - matched on their registered mobile
    // numbers (mobile1/mobile2), not partner_id directly, since the call
    // is logged against the phone number that was actually dialled.
    const partnerId = url.searchParams.get("partner_id");
    if (!partnerId) return Response.json({ ok: false, error: "missing_partner_id" }, { status: 400 });
    const partner = await env.DB.prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id = ?").bind(partnerId).first();
    if (!partner) return Response.json({ ok: true, calls: [] });
    const numbers = [partner.mobile1, partner.mobile2].filter(Boolean);
    if (!numbers.length) return Response.json({ ok: true, calls: [] });
    const placeholders = numbers.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT * FROM call_logs WHERE callee_mobile IN (${placeholders}) ORDER BY created_at DESC LIMIT 50`
    ).bind(...numbers).all();
    return Response.json({ ok: true, calls: results });
  }

  if (action === "made") {
    // Calls a customer/owner has made FROM this app - their own history.
    const mobile = url.searchParams.get("mobile");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    const { results } = await env.DB.prepare(
      `SELECT * FROM call_logs WHERE caller_mobile = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(mobile).all();
    return Response.json({ ok: true, calls: results });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
