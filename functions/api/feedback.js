import { verifyAdminToken } from "./_auth_helper.js";

/* GET ?action=list&token=... — admin-only, lists all feedback (newest first).
   True email delivery would need a separate email-sending service (Resend/
   SendGrid etc. with its own API key) — not set up yet, so this stores
   feedback in D1 instead and the owner reviews it here. */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "list") {
    return Response.json({ ok: false, error: "unknown_action" });
  }
  if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { results } = await env.DB
    .prepare("SELECT id, name, mobile, message, created_at FROM feedback ORDER BY created_at DESC LIMIT 100")
    .all();
  return Response.json({ ok: true, feedback: results });
}

/* Anyone logged in (owner or customer) can submit feedback — no auth needed
   to write, matching how the SOS endpoint works. */
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  if (!body.message || !String(body.message).trim()) {
    return Response.json({ ok: false, error: "empty_message" }, { status: 400 });
  }
  await env.DB
    .prepare("INSERT INTO feedback (name, mobile, message, created_at) VALUES (?,?,?,?)")
    .bind(body.name || "", body.mobile || "", String(body.message).trim(), new Date().toISOString())
    .run();
  return Response.json({ ok: true });
}
