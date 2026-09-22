import { verifyAdminToken } from "./_auth_helper.js";

/* GET (no params)                — public: list every useful place
   POST action=add, token=...     — admin: add a place
   POST action=delete, token=...  — admin: remove a place
   "Useful Places" is a small, admin-curated directory (petrol pumps,
   resorts, restaurants, tourist spots, hospitals etc.) - separate from the
   self-registered "Local Directory" (travel_partners), since the owner of
   a petrol pump or resort will never install/register on this app
   themselves. */

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare("SELECT id, name, category, location, phone, lat, lon FROM useful_places ORDER BY category, name")
    .all();
  return Response.json({ ok: true, places: results });
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
    if (!name) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    await env.DB
      .prepare(
        "INSERT INTO useful_places (name, category, location, phone, lat, lon, created_at) VALUES (?,?,?,?,?,?,?)"
      )
      .bind(
        name,
        body.category || "",
        body.location || "",
        body.phone || "",
        body.lat != null && body.lat !== "" ? Number(body.lat) : null,
        body.lon != null && body.lon !== "" ? Number(body.lon) : null,
        new Date().toISOString()
      )
      .run();
    return Response.json({ ok: true });
  }

  if (body.action === "update") {
    if (!body.id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
    const name = (body.name || "").trim();
    if (!name) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    await env.DB
      .prepare(
        "UPDATE useful_places SET name=?, category=?, location=?, phone=?, lat=COALESCE(?,lat), lon=COALESCE(?,lon) WHERE id=?"
      )
      .bind(
        name,
        body.category || "",
        body.location || "",
        body.phone || "",
        body.lat != null && body.lat !== "" ? Number(body.lat) : null,
        body.lon != null && body.lon !== "" ? Number(body.lon) : null,
        body.id
      )
      .run();
    return Response.json({ ok: true });
  }

  if (body.action === "delete") {
    if (!body.id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });
    await env.DB.prepare("DELETE FROM useful_places WHERE id=?").bind(body.id).run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
