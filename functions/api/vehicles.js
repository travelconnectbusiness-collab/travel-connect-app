import { verifyAdminToken } from "./_auth_helper.js";

const DOC_FIELDS = [
  "front_photo",
  "rc_photo",
  "insurance_photo",
  "permit_photo",
  "fitness_photo",
  "puc_photo",
  "driver_license_photo",
];

async function uploadFile(env, file, vehicleId, field) {
  if (!file || typeof file.arrayBuffer !== "function") return null;
  const buf = await file.arrayBuffer();
  const nameParts = (file.name || "").split(".");
  const ext = nameParts.length > 1 ? nameParts.pop() : "jpg";
  const key = `vehicles/${vehicleId}/${field}-${Date.now()}.${ext}`;
  await env.FILES.put(key, buf, {
    httpMetadata: { contentType: file.type || "image/jpeg" },
  });
  return key;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "list") {
    const partnerId = url.searchParams.get("partner_id");
    if (!partnerId) return Response.json({ ok: false, error: "missing_partner_id" });
    const { results } = await env.DB
      .prepare("SELECT * FROM vehicles WHERE partner_id=? ORDER BY created_at DESC")
      .bind(partnerId)
      .all();
    return Response.json({ ok: true, vehicles: results });
  }

  if (action === "active") {
    const { results } = await env.DB
      .prepare(
        `SELECT v.id, v.vehicle_number, v.category, p.business_name, p.mobile1, p.mobile2,
                p.location, p.pincode
         FROM vehicles v JOIN travel_partners p ON v.partner_id = p.id
         WHERE v.active=1 AND v.verified=1 AND p.verified=1
         ORDER BY v.id DESC`
      )
      .all();
    return Response.json({ ok: true, vehicles: results });
  }

  if (action === "pending" || action === "all") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const sql =
      action === "pending"
        ? `SELECT v.*, p.business_name, p.owner_name FROM vehicles v
           JOIN travel_partners p ON v.partner_id = p.id
           WHERE v.verified=0 ORDER BY v.created_at DESC`
        : `SELECT v.*, p.business_name, p.owner_name FROM vehicles v
           JOIN travel_partners p ON v.partner_id = p.id
           ORDER BY v.created_at DESC`;
    const { results } = await env.DB.prepare(sql).all();
    return Response.json({ ok: true, vehicles: results });
  }

  if (action === "file") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const key = url.searchParams.get("key");
    if (!key) return Response.json({ ok: false, error: "missing_key" }, { status: 400 });
    const obj = await env.FILES.get(key);
    if (!obj) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    return new Response(obj.body, {
      headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream" },
    });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "register") {
    const form = await request.formData();
    const partner_id = form.get("partner_id");
    const vehicle_number = (form.get("vehicle_number") || "").toString().trim();
    if (!partner_id || !vehicle_number) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const field = (name) => {
      const v = form.get(name);
      return v ? v.toString() : null;
    };

    const insertResult = await env.DB
      .prepare(
        `INSERT INTO vehicles
          (partner_id, vehicle_number, category, driver_name, driver_mobile1, driver_mobile2,
           driver_license_number, driver_license_expiry, rc_expiry, insurance_expiry, permit_expiry,
           fitness_expiry, puc_expiry, verified, active, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?)`
      )
      .bind(
        partner_id,
        vehicle_number,
        field("category"),
        field("driver_name"),
        field("driver_mobile1"),
        field("driver_mobile2"),
        field("driver_license_number"),
        field("driver_license_expiry"),
        field("rc_expiry"),
        field("insurance_expiry"),
        field("permit_expiry"),
        field("fitness_expiry"),
        field("puc_expiry"),
        now
      )
      .run();

    const vehicleId = insertResult.meta.last_row_id;

    const photoKeys = {};
    for (const docFi
