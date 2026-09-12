import { verifyAdminToken } from "./_auth_helper.js";

/* GET ?action=list — returns every authorized mobile number (admin panel only).
   GET ?action=check&mobile=... — used by the login flow itself (auth.js) to
   check whether a given mobile is allowed to log in at all. Kept as a public,
   read-only, mobile-scoped check (no name/list data leaked) since the login
   screen needs to call it before a session exists. */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "check") {
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!mobile) return Response.json({ ok: false, allowed: false });
    const row = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
    return Response.json({ ok: true, allowed: !!row });
  }

  if (action === "list") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB.prepare("SELECT mobile, name, added_at FROM authorized_users ORDER BY added_at DESC").all();
    return Response.json({ ok: true, users: results });
  }

  /* The owner's own mobile/name — admin-only to view, since it's shown on the
     same admin-gated page. */
  if (action === "get_owner") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const row = await env.DB.prepare("SELECT mobile, name FROM app_owner WHERE id=1").first();
    return Response.json({ ok: true, owner: row || null });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

/* POST action=add / action=remove — admin-only (token required), adds or
   removes a mobile number from the allowlist. Matching at login time is by
   mobile number only (not name), per the owner's decision — a name typo or
   spelling difference should never lock out someone whose number IS allowed. */
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }

  if (!(await verifyAdminToken(env, body.token))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (body.action === "add") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB
      .prepare("INSERT OR REPLACE INTO authorized_users (mobile, name, added_at) VALUES (?,?,?)")
      .bind(mobile, body.name || "", new Date().toISOString())
      .run();
    return Response.json({ ok: true });
  }

  if (body.action === "remove") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB.prepare("DELETE FROM authorized_users WHERE mobile=?").bind(mobile).run();
    return Response.json({ ok: true });
  }

  /* Sets (or changes) the one permanent owner number — this one number can never
     be blocked and never needs to be in the authorized_users allowlist, so the
     owner can never lock themselves out. Editing it still requires the admin
     password, same as everything else here. */
  if (body.action === "set_owner") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB
      .prepare("INSERT INTO app_owner (id, mobile, name) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET mobile=excluded.mobile, name=excluded.name")
      .bind(mobile, body.name || "")
      .run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
