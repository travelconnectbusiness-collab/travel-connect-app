import { verifyAdminToken } from "./_auth_helper.js";

/* GET ?action=list&token=... — admin-only, lists all partners with their plan. */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "list") {
    return Response.json({ ok: false, error: "unknown_action" });
  }
  if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { results } = await env.DB
    .prepare("SELECT id, business_name, owner_name, mobile1, location, verified, plan FROM travel_partners ORDER BY business_name")
    .all();
  return Response.json({ ok: true, partners: results });
}

/* POST action=set_plan — admin-only, sets a partner's plan to 'free', 'paid',
   or 'owner_free' (the owner's own account / staff — permanently free). */
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  if (!(await verifyAdminToken(env, body.token))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!body.partner_id || !["free", "paid", "premium", "owner_free"].includes(body.plan)) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  await env.DB.prepare("UPDATE travel_partners SET plan=? WHERE id=?").bind(body.plan, body.partner_id).run();
  return Response.json({ ok: true });
}
