import { verifyAdminToken } from "./_auth_helper.js";

/* GET                           — public: list every emergency contact (name, number, email)
   POST action=add / update / delete / bulk_add  (admin token required)
   A contact needs a name AND (a phone number OR an email). */

let colReady = false;
async function ensureEmail(env) {
  if (colReady) return;
  try { await env.DB.prepare("ALTER TABLE emergency_contacts ADD COLUMN email TEXT DEFAULT ''").run(); } catch (e) { /* already exists */ }
  colReady = true;
}
const digits = (s) => String(s || "").replace(/\D/g, "");
const cleanEmail = (s) => String(s || "").trim().toLowerCase();
const validEmail = (s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const J = (o, status) => Response.json(o, status ? { status } : undefined);

export async function onRequestGet({ env }) {
  await ensureEmail(env);
  const { results } = await env.DB
    .prepare("SELECT id, name, number, COALESCE(email,'') AS email, category FROM emergency_contacts ORDER BY sort_order, id")
    .all();
  return J({ ok: true, contacts: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return J({ ok: false, error: "invalid_json" }, 400); }
  if (!(await verifyAdminToken(env, body.token))) return J({ ok: false, error: "unauthorized" }, 401);
  await ensureEmail(env);
  const now = new Date().toISOString();

  if (body.action === "add" || body.action === "update") {
    const name = String(body.name || "").trim();
    const number = String(body.number || "").trim();
    const email = cleanEmail(body.email);
    if (!name || (!number && !email)) return J({ ok: false, error: "missing_fields" }, 400);
    if (!validEmail(email)) return J({ ok: false, error: "bad_email" }, 400);
    if (body.action === "update") {
      if (!body.id) return J({ ok: false, error: "missing_id" }, 400);
      await env.DB.prepare("UPDATE emergency_contacts SET name=?, number=?, email=? WHERE id=?").bind(name, number, email, body.id).run();
      return J({ ok: true });
    }
    await env.DB.prepare("INSERT INTO emergency_contacts (name, number, email, category, sort_order, created_at) VALUES (?,?,?,?,?,?)")
      .bind(name, number, email, body.category || "", Number(body.sort_order) || 0, now).run();
    return J({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return J({ ok: false, error: "missing_id" }, 400);
    await env.DB.prepare("DELETE FROM emergency_contacts WHERE id=?").bind(body.id).run();
    return J({ ok: true });
  }

  if (body.action === "bulk_add") {
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    const { results } = await env.DB.prepare("SELECT id, name, number, COALESCE(email,'') AS email FROM emergency_contacts").all();
    const list = results.slice();
    let maxSort = 0;
    try { const m = await env.DB.prepare("SELECT MAX(sort_order) AS m FROM emergency_contacts").first(); maxSort = Number(m && m.m) || 0; } catch (e) {}
    let added = 0, updated = 0, skipped = 0, invalid = 0;
    for (const r of rows) {
      const name = String((r && r.name) || "").trim();
      const number = String((r && r.number) || "").trim();
      const email = cleanEmail(r && r.email);
      if (!name || (!number && !email) || !validEmail(email)) { invalid++; continue; }
      const nd = digits(number);
      const hit = list.find((x) => (nd && digits(x.number) === nd) || (email && x.email === email));
      if (hit) {
        let ch = false, newNum = hit.number, newEmail = hit.email;
        if (email && !hit.email) { newEmail = email; ch = true; }
        if (number && !hit.number) { newNum = number; ch = true; }
        if (ch) {
          await env.DB.prepare("UPDATE emergency_contacts SET number=?, email=? WHERE id=?").bind(newNum, newEmail, hit.id).run();
          hit.number = newNum; hit.email = newEmail; updated++;
        } else skipped++;
        continue;
      }
      await env.DB.prepare("INSERT INTO emergency_contacts (name, number, email, category, sort_order, created_at) VALUES (?,?,?,?,?,?)")
        .bind(name, number, email, "", ++maxSort, now).run();
      list.push({ id: 0, name, number, email });
      added++;
    }
    return J({ ok: true, added, updated, skipped, invalid });
  }

  return J({ ok: false, error: "unknown_action" });
}
