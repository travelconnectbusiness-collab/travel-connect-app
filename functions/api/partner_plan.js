import { verifyAdminToken } from "./_auth_helper.js";

let ready = false;
async function ensureColumn(env) {
  if (ready) return;
  try {
    await env.DB.prepare("ALTER TABLE travel_partners ADD COLUMN plan_expires_at TEXT").run();
  } catch (e) {
    /* column already exists */
  }
  ready = true;
}

/* GET ?action=list&token=... — admin-only, lists all partners with their plan.
   plan_expires_at is returned as stored (no auto-reset here) - the actual
   "has it expired" decision is made the same way everywhere a partner's
   plan is READ for a real purpose (billing, branding, directory sort order:
   see tcEffectivePlan() in directory.js and the matching SQL CASE in
   partners.js/vehicles.js) so the admin list and the live app always agree,
   without needing a separate scheduled job to physically downgrade rows. */
export async function onRequestGet({ request, env }) {
  await ensureColumn(env);
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "list") {
    return Response.json({ ok: false, error: "unknown_action" });
  }
  if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { results } = await env.DB
    .prepare("SELECT id, business_name, owner_name, mobile1, location, verified, plan, plan_expires_at FROM travel_partners ORDER BY business_name")
    .all();
  return Response.json({ ok: true, partners: results });
}

/* POST action=set_plan — admin-only, sets a partner's plan to 'free', 'paid',
   'premium', or 'owner_free' (the owner's own account / staff — permanently
   free, never expires).

   For 'paid'/'premium', months is how many months they just paid for (a
   plain number, e.g. 3 for three months at 30 days each - set by the admin
   after receiving payment outside the app, e.g. UPI). If the partner's
   current plan hasn't expired yet, the new months are added ON TOP of
   their remaining time (so renewing a little early never loses paid time
   already on the account) - otherwise (expired, or switching plan for the
   first time) the new period starts fresh from right now.

   For 'free'/'owner_free', any expiry is cleared - those plans don't
   expire by definition. */
export async function onRequestPost({ request, env }) {
  await ensureColumn(env);
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  if (!(await verifyAdminToken(env, body.token))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!body.partner_id || !["free", "paid", "premium", "owner_free"].includes(body.plan)) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  let expiresAt = null;
  if (body.plan === "paid" || body.plan === "premium") {
    const months = Number(body.months);
    if (!months || months <= 0) {
      return Response.json({ ok: false, error: "missing_months" }, { status: 400 });
    }
    const current = await env.DB.prepare("SELECT plan_expires_at FROM travel_partners WHERE id=?").bind(body.partner_id).first();
    const now = Date.now();
    const currentExpiry = current && current.plan_expires_at ? new Date(current.plan_expires_at).getTime() : 0;
    const base = currentExpiry > now ? currentExpiry : now;
    expiresAt = new Date(base + months * 30 * 86400000).toISOString();
  }

  await env.DB.prepare("UPDATE travel_partners SET plan=?, plan_expires_at=? WHERE id=?").bind(body.plan, expiresAt, body.partner_id).run();
  return Response.json({ ok: true, plan_expires_at: expiresAt });
}
