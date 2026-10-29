/* functions/api/deletion.js - "Request deletion of my data" (owner's Part 3 item; privacy / DPDP wish).
   A logged-in person (business owner or customer) asks the app owner to delete their account and data. The request is only STORED here;
   the app owner (admin) reads the list and deletes by hand, then taps Done. Nothing is deleted automatically.
     POST /api/deletion?action=request  { reason, name, role }          -> { ok, already? }     (caller = headers X-TC-Mobile + X-TC-Device)
     POST /api/deletion?action=list     { token }                       -> { ok, rows:[...] }   (admin token; pending first, then the last 50 done)
     POST /api/deletion?action=done     { token, id }                   -> { ok }               (admin token)
   TABLE deletion_requests is created here when first used (CREATE TABLE IF NOT EXISTS) - no manual migration needed.
   One open request per mobile number: asking twice returns { ok:true, already:true }. */
import { callerOf } from "./_devauth.js";
import { verifyAdminToken } from "./_auth_helper.js";
import { allowed } from "./_ratelimit.js";

let ready = false;
async function init(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS deletion_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, mobile TEXT NOT NULL, name TEXT, role TEXT, reason TEXT, requested_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', done_at TEXT)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_delreq_status ON deletion_requests (status, id)").run();
  ready = true;
}
const cut = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  const action = new URL(request.url).searchParams.get("action");
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  try { await init(env); } catch (e) { return Response.json({ ok: false, error: "server_error" }, { status: 500 }); }

  if (action === "request") {
    const c = await callerOf(env, request);
    if (!c.valid) return Response.json({ ok: false, error: "device_unverified", why: c.why }, { status: 403 });
    if (!(await allowed(env, "delreq:" + c.mobile, 5, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
    const open = await env.DB.prepare("SELECT id FROM deletion_requests WHERE mobile=? AND status='pending' LIMIT 1").bind(c.mobile).first();
    if (open) return Response.json({ ok: true, already: true });
    await env.DB.prepare("INSERT INTO deletion_requests (mobile, name, role, reason, requested_at) VALUES (?,?,?,?,?)")
      .bind(c.mobile, cut(body.name, 80), cut(body.role, 20), cut(body.reason, 300), new Date().toISOString()).run();
    return Response.json({ ok: true });
  }

  if (!(await verifyAdminToken(env, body.token))) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (action === "list") {
    const p = await env.DB.prepare("SELECT id, mobile, name, role, reason, requested_at, status, done_at FROM deletion_requests WHERE status='pending' ORDER BY id").all();
    const d = await env.DB.prepare("SELECT id, mobile, name, role, reason, requested_at, status, done_at FROM deletion_requests WHERE status<>'pending' ORDER BY id DESC LIMIT 50").all();
    return Response.json({ ok: true, rows: (p.results || []).concat(d.results || []) });
  }

  if (action === "done") {
    const id = parseInt(body.id, 10);
    if (!id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
    await env.DB.prepare("UPDATE deletion_requests SET status='done', done_at=? WHERE id=? AND status='pending'").bind(new Date().toISOString(), id).run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
