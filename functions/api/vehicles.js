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

/* GET ?action=list&partner_id=...     — a partner's own vehicles
   GET ?action=active                  — public "Active Board": vehicles currently
                                          marked ready for a trip, verified vehicle +
                                          verified partner only, no private documents
   GET ?action=pending&token=...       — admin: vehicles awaiting verification
   GET ?action=file&key=...&token=...  — admin: view an uploaded document photo */
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

  if (action === "pending") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB
      .prepare(
        `SELECT v.*, p.business_name, p.owner_name FROM vehicles v
         JOIN travel_partners p ON v.partner_id = p.id
         WHERE v.verified=0 ORDER BY v.created_at DESC`
      )
      .all();
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

/* POST ?action=register       — multipart/form-data: vehicle fields + document photos
   POST ?action=toggle_active  — JSON: the vehicle's own partner turns "Active Now" on/off
   POST ?action=verify         — JSON: admin approves or un-approves a vehicle */
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
    for (const docField of DOC_FIELDS) {
      const file = form.get(docField);
      const key = await uploadFile(env, file, vehicleId, docField);
      if (key) photoKeys[docField + "_key"] = key;
    }
    if (Object.keys(photoKeys).length) {
      const setClauses = Object.keys(photoKeys).map((k) => `${k}=?`).join(",");
      await env.DB
        .prepare(`UPDATE vehicles SET ${setClauses} WHERE id=?`)
        .bind(...Object.values(photoKeys), vehicleId)
        .run();
    }

    return Response.json({ ok: true, vehicle_id: vehicleId });
  }

  if (action === "toggle_active") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const { vehicle_id, mobile, active } = body;
    if (!vehicle_id || !mobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare(
        `SELECT v.id, p.mobile1, p.mobile2 FROM vehicles v
         JOIN travel_partners p ON v.partner_id = p.id WHERE v.id=?`
      )
      .bind(vehicle_id)
      .first();
    if (!row) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (row.mobile1 !== mobile && row.mobile2 !== mobile) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    await env.DB
      .prepare("UPDATE vehicles SET active=? WHERE id=?")
      .bind(active ? 1 : 0, vehicle_id)
      .run();
    return Response.json({ ok: true });
  }

  if (action === "verify") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await env.DB
      .prepare("UPDATE vehicles SET verified=? WHERE id=?")
      .bind(body.verified ? 1 : 0, body.vehicle_id)
      .run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
