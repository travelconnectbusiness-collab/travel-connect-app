import { verifyAdminToken } from "./_auth_helper.js";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
    const hasPassword = !!(row && row.portal_password_hash);
    if (row) delete row.portal_password_hash; /* never send the hash to the client */
    return Response.json({ ok: true, partner: row || null, has_password: hasPassword });
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

  /* Public, no auth needed — the searchable local business directory. Any
     logged-in user (customer, auto driver, another business owner) can look
     up verified businesses of any type by category/location. Deliberately
     returns everyone verified, not just those marked "available now" — a
     restaurant or workshop doesn't toggle availability the way a vehicle
     does, so the frontend just shows an "Available now" badge when the flag
     is set instead of filtering it out entirely. */
  if (action === "directory") {
    const { results } = await env.DB
      .prepare(
        "SELECT id, business_name, business_type, owner_name, mobile1, mobile2, location, pincode, available FROM travel_partners WHERE verified=1 ORDER BY business_name"
      )
      .all();
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
          (business_name, owner_name, mobile1, mobile2, email, location, pincode, business_type, verified, created_at)
         VALUES (?,?,?,?,?,?,?,?,0,?)`
      )
      .bind(
        business_name,
        owner_name,
        mobile1,
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        body.business_type || "taxi_travel",
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
        `UPDATE travel_partners SET business_name=?, owner_name=?, mobile2=?, email=?, location=?, pincode=?, business_type=?
         WHERE id=?`
      )
      .bind(
        body.business_name,
        body.owner_name,
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        body.business_type || "taxi_travel",
        body.partner_id
      )
      .run();
    return Response.json({ ok: true });
  }

  /* A business owner (any type) flips their own "available now" flag —
     ownership checked by matching mobile, same pattern as vehicles' own
     toggle_active. Meaningful for auto drivers/taxis; other business types
     can just leave it on if they don't use the concept of "available now". */
  if (action === "set_available") {
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
      .prepare("UPDATE travel_partners SET available=? WHERE id=?")
      .bind(body.available ? 1 : 0, body.partner_id)
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

  /* A partner sets their OWN password for editing the billing identity shown on
     their bills (business name / phone / UPI) — this is separate from, and does
     NOT require, the owner's admin password. It can only actually be used to
     unlock anything once the owner has verified this partner (see action=verify
     above) — this is enforced in action=verify_password below, not here. */
  if (action === "set_password") {
    const mobile = (body.mobile || "").trim();
    const password = (body.password || "").trim();
    if (!mobile || !password || password.length < 4) {
      return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const hash = await sha256Hex(password);
    await env.DB
      .prepare("UPDATE travel_partners SET portal_password_hash=? WHERE id=?")
      .bind(hash, body.partner_id)
      .run();
    return Response.json({ ok: true });
  }

  /* Checks a partner's own password. Only succeeds if the owner has already
     verified this partner — this is the "admin must approve before the partner's
     own password can be used" gate the owner asked for. */
  if (action === "verify_password") {
    const password = (body.password || "").trim();
    const row = await env.DB
      .prepare("SELECT verified, portal_password_hash FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || !row.verified || !row.portal_password_hash) {
      return Response.json({ ok: false, error: "not_available" }, { status: 403 });
    }
    const hash = await sha256Hex(password);
    if (hash !== row.portal_password_hash) {
      return Response.json({ ok: false, error: "wrong_password" }, { status: 401 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
