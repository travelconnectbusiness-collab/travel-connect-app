import { verifyAdminToken } from "./_auth_helper.js";

/* GET ?action=mine&mobile=...           — a partner looks up their own record
   GET ?action=pending&token=...         — admin: partners awaiting verification
   GET ?action=all&token=...             — admin: every partner */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "mine") {
    const mobile = url.searchParams.get("mobile");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" });
    const row = await env.DB
      .prepare("SELECT * FROM travel_partners WHERE mobile1=? OR mobile2=?")
      .bind(mobile, mobile)
      .first();
    return Response.json({ ok: true, partner: row || null });
  }

  if (action === "pending" || action === "all") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const sql =
      action === "pending"
        ? "SELECT * FROM travel_partners WHERE verified=0 ORDER BY created_at DESC"
        : "SELECT * FROM travel_partners ORDER BY created_at DESC";
    const { results } = await env.DB.prepare(sql).all();
    return Response.json({ ok: true, partners: results });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

/* POST action=register — create a new partner (self-registration, not verified yet)
   POST action=update   — a verified-or-not partner edits their own details (ownership
                           checked by matching mobile, not by admin token)
   POST action=verify   — admin: approve or un-approve a partner */
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const action = body.action;

  if (action === "register") {
    const business_name = (body.business_name || "").trim();
    const owner_name = (body.owner_name || "").trim();
    const mobile1 = (body.mobile1 || "").trim();
    if (!business_name || !owner_name || !mobile1) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const existing = await env.DB
      .prepare("SELECT id FROM travel_partners WHERE mobile1=?")
      .bind(mobile1)
      .first();
    if (existing) {
      return Response.json(
        { ok: false, error: "already_registered", partner_id: existing.id },
        { status: 409 }
      );
    }
    const now = new Date().toISOString();
    const result = await env.DB
      .prepare(
        `INSERT INTO travel_partners
          (business_name, owner_name, mobile1, mobile2, email, location, pincode, verified, created_at)
         VALUES (?,?,?,?,?,?,?,0,?)`
      )
      .bind(
        business_name,
        owner_name,
        mobile1,
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        now
      )
      .run();
    return Response.json({ ok: true, partner_id: result.meta.last_row_id });
  }

  if (action === "update") {
    const mobile = (body.mobile || "").trim();
    if (!mobile || !body.partner_id) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    await env.DB
      .prepare(
        `UPDATE travel_partners SET business_name=?, owner_name=?, mobile2=?, email=?, location=?, pincode=?
         WHERE id=?`
      )
      .bind(
        body.business_name,
        body.owner_name,
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        body.partner_id
      )
      .run();
    return Response.json({ ok: true });
  }

  if (action === "verify") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await env.DB
      .prepare("UPDATE travel_partners SET verified=? WHERE id=?")
      .bind(body.verified ? 1 : 0, body.partner_id)
      .run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
