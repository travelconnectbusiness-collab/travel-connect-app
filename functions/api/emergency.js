import { verifyAdminToken } from "./_auth_helper.js";

/* GET (no params)              — public: list every emergency contact
   POST action=add, token=...   — admin: add a contact
   POST action=delete, token=.. — admin: remove a contact */

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT id, name, number, category FROM emergency_contacts ORDER BY sort_order, name")
    .all();
  return Response.json({ ok: true, contacts: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!(await verifyAdminToken(env, body.token))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (body.action === "add") {
    const name = (body.name || "").trim();
    const number = (body.number || "").trim();
    if (!name || !number) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    await env.DB
      .prepare("INSERT INTO emergency_contacts (name, number, category, sort_order, created_at) VALUES (?,?,?,?,?)")
      .bind(name, number, body.category || "", Number(body.sort_order) || 0, new Date().toISOString())
      .run();
    return Response.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
    await env.DB.prepare("DELETE FROM emergency_contacts WHERE id=?").bind(body.id).run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
} 
