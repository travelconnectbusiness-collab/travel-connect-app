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

/* Adds the business_hours column the first time this runs after the
   update - swallows the "duplicate column" error on later runs. */
async function ensureNewColumns(env) {
  try {
    await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN business_hours TEXT").run();
  } catch (e) { /* already exists */ }
  /* The "active" query below joins travel_partners and sorts by its
     plan_expires_at (so an expired Paid/Premium plan correctly drops to
     the Free tier's position) - that column is normally added by
     partners.js's own migration, but this Worker instance may serve an
     Active Vehicles Board request before partners.js has ever run, so the
     same safe, idempotent ALTER is repeated here too. */
  try {
    await env.DB.prepare("ALTER TABLE travel_partners ADD COLUMN plan_expires_at TEXT").run();
  } catch (e) { /* already exists */ }
}

/* GET ?action=list&partner_id=...     - a partner's own vehicles
   GET ?action=active                  - public "Active Board": vehicles currently
                                          marked ready for a trip, verified vehicle +
                                          verified partner only, no private documents
   GET ?action=pending&token=...       - admin: vehicles awaiting verification
   GET ?action=file&key=...&token=...  - admin: view an uploaded document photo */
export async function onRequestGet({ request, env }) {
  await ensureNewColumns(env);
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
        `SELECT v.id, v.vehicle_number, v.category, v.temp_location, v.business_hours, v.front_photo_key, p.business_name, p.mobile1, p.mobile2,
                p.location, p.pincode, p.business_type, p.id AS partner_id, p.plan
         FROM vehicles v JOIN travel_partners p ON v.partner_id = p.id
         WHERE v.active=1 AND v.verified=1 AND p.verified=1
         ORDER BY CASE
           WHEN p.plan='owner_free' THEN 1
           WHEN p.plan='premium' AND (p.plan_expires_at IS NULL OR julianday(p.plan_expires_at)>=julianday('now')) THEN 1
           WHEN p.plan='paid' AND (p.plan_expires_at IS NULL OR julianday(p.plan_expires_at)>=julianday('now')) THEN 2
           ELSE 3
         END, v.id DESC`
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

  /* Public (no admin token) - only the front photo, and only for a vehicle
     that is currently active+verified (and its partner verified) - the
     same visibility any customer already has on the Active Vehicles
     Board itself. RC/Insurance/Permit/Fitness/PUC stay admin-only via the
     "file" action above; front photo is the one document meant to help a
     customer recognise the vehicle before calling. */
  if (action === "public_front_photo") {
    const vehicleId = url.searchParams.get("vehicle_id");
    if (!vehicleId) return Response.json({ ok: false, error: "missing_vehicle_id" }, { status: 400 });
    const row = await env.DB
      .prepare(
        `SELECT v.front_photo_key FROM vehicles v JOIN travel_partners p ON v.partner_id = p.id
         WHERE v.id=? AND v.active=1 AND v.verified=1 AND p.verified=1`
      )
      .bind(vehicleId)
      .first();
    if (!row || !row.front_photo_key) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const obj = await env.FILES.get(row.front_photo_key);
    if (!obj) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    return new Response(obj.body, {
      headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream" },
    });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

/* POST ?action=register       - multipart/form-data: vehicle fields + document photos
   POST ?action=toggle_active  - JSON: the vehicle's own partner turns "Active Now" on/off
   POST ?action=set_hours      - JSON: the vehicle's own partner sets its active-hours
   POST ?action=verify         - JSON: admin approves or un-approves a vehicle */
export async function onRequestPost({ request, env }) {
  await ensureNewColumns(env);
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

  /* Lets the vehicle's own partner (checked by mobile, same ownership
     pattern as toggle_active below) go back and add or replace any
     document photo, or correct/update an expiry date, after the vehicle
     was first registered - e.g. a vehicle added with just a number and
     dates (common for Auto Rickshaw, where photos are optional) can have
     its actual photos added later, or an expired document's date/photo
     refreshed once renewed. Only the fields actually sent are touched -
     an omitted date field leaves the existing one alone, and a field only
     gets cleared if explicitly sent as an empty string; only fields
     present in the form are included in the UPDATE at all. */
  if (action === "update") {
    const form = await request.formData();
    const vehicle_id = form.get("vehicle_id");
    const mobile = (form.get("mobile") || "").toString().trim();
    if (!vehicle_id || !mobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare(
        `SELECT p.mobile1, p.mobile2 FROM vehicles v JOIN travel_partners p ON v.partner_id = p.id WHERE v.id=?`
      )
      .bind(vehicle_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const dateFields = ["category", "driver_name", "driver_mobile1", "driver_mobile2", "driver_license_number",
      "driver_license_expiry", "rc_expiry", "insurance_expiry", "permit_expiry", "fitness_expiry", "puc_expiry"];
    const setParts = [];
    const bindVals = [];
    for (const f of dateFields) {
      if (form.has(f)) {
        setParts.push(`${f}=?`);
        bindVals.push(form.get(f).toString());
      }
    }
    for (const docField of DOC_FIELDS) {
      const file = form.get(docField);
      const key = await uploadFile(env, file, vehicle_id, docField);
      if (key) {
        setParts.push(`${docField}_key=?`);
        bindVals.push(key);
      }
    }
    if (setParts.length) {
      bindVals.push(vehicle_id);
      await env.DB.prepare(`UPDATE vehicles SET ${setParts.join(",")} WHERE id=?`).bind(...bindVals).run();
    }
    return Response.json({ ok: true });
  }

  if (action === "toggle_active") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const { vehicle_id, mobile, active, location } = body;
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
    const tempLocation = active && location ? String(location).trim() : null;
    await env.DB
      .prepare("UPDATE vehicles SET active=?, temp_location=? WHERE id=?")
      .bind(active ? 1 : 0, tempLocation, vehicle_id)
      .run();
    return Response.json({ ok: true });
  }

  /* NEW - a partner sets their OWN vehicle's active-hours (JSON string, same
     shape core.js/directory.js already use for a partner's own hours) -
     ownership checked by matching mobile, same pattern as toggle_active. */
  if (action === "set_hours") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    const { vehicle_id, mobile, business_hours } = body;
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
    await env.DB.prepare("UPDATE vehicles SET business_hours=? WHERE id=?").bind(business_hours || null, vehicle_id).run();
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

  if (action === "delete") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await env.DB.prepare("DELETE FROM vehicles WHERE id=?").bind(body.vehicle_id).run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
