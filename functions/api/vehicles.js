import { verifyAdminToken } from "./_auth_helper.js";
import { istToday, getEnforceDate, vehicleLive } from "./trip_class.js";
import { deviceCheck } from "./_devauth.js";

const DOC_FIELDS = [
  "front_photo",
  "rc_photo",
  "insurance_photo",
  "permit_photo",
  "fitness_photo",
  "puc_photo",
  "driver_license_photo",
];

/* Deletes stored files in ONE storage call (a free-plan request may only make 50). Only keys under the given
   folder are ever touched, and a failure never blocks the real action. */
async function deleteFiles(env, keys, folder) {
  const list = (keys || []).filter((k) => k && String(k).startsWith(folder));
  if (!list.length) return;
  try { await env.FILES.delete(list); } catch (e) { /* harmless */ }
}

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
/* Rate Master category of a vehicle (Taxi / Travel only): rate_cat = the category's number in the Rate Master, rate_cat_name = its
   name when it was chosen (shown in lists). Empty = not chosen yet. */
const catNum = (x) => { const s = String(x == null ? "" : x).trim(); return /^\d{1,3}$/.test(s) ? s : null; };
const catName = (x) => String(x == null ? "" : x).trim().slice(0, 80) || null;

let colsDone = false; /* the column set-up below runs once per server instance, not at every request */
async function ensureNewColumns(env) {
  if (colsDone) return;
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN rate_cat TEXT").run(); } catch (e) { /* already exists */ }
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN rate_cat_name TEXT").run(); } catch (e) { /* already exists */ }
  try {
    await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN business_hours TEXT").run();
  } catch (e) { /* already exists */ }
  try {
    await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run();
  } catch (e) { /* already exists */ }
  try {
    await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN tax_expiry TEXT").run();
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
  try {
    await env.DB.prepare("ALTER TABLE travel_partners ADD COLUMN email_verified INTEGER DEFAULT 0").run();
  } catch (e) { /* already exists */ }
  try {
    await env.DB.prepare("ALTER TABLE travel_partners ADD COLUMN tagline TEXT").run();
  } catch (e) { /* already exists */ }
  colsDone = true;
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
      .prepare("SELECT v.*, p.business_type AS business_type FROM vehicles v LEFT JOIN travel_partners p ON p.id=v.partner_id WHERE v.partner_id=? ORDER BY v.created_at DESC")
      .bind(partnerId)
      .all();
    /* owner sees the live state: an expired / incomplete vehicle is not shown as Verified */
    const today = istToday(), ed = await getEnforceDate(env);
    results.forEach((v) => { v.verified = vehicleLive(v, today, ed) ? 1 : 0; });
    return Response.json({ ok: true, vehicles: results });
  }

  if (action === "active") {
    const { results: rows } = await env.DB
      .prepare(
        `SELECT v.insurance_expiry, v.permit_expiry, v.rc_photo_key, v.insurance_photo_key, v.permit_photo_key, v.verified AS vverified,
                CASE
                  WHEN p.plan='owner_free' THEN 1
                  WHEN p.plan='premium' AND (p.plan_expires_at IS NULL OR julianday(p.plan_expires_at)>=julianday('now')) THEN 1
                  WHEN p.plan='paid' AND (p.plan_expires_at IS NULL OR julianday(p.plan_expires_at)>=julianday('now')) THEN 2
                  WHEN p.plan='owner_plus' THEN 2
                  ELSE 3
                END AS tier,
                v.id, v.vehicle_number, v.category, v.rate_cat_name, v.seats, v.temp_location, v.business_hours, v.front_photo_key, p.business_name, p.mobile1, p.mobile2,
                p.location, p.pincode, p.business_type, p.id AS partner_id, p.plan, p.plan_expires_at, p.brand_color, p.brand_font_family, p.logo_key, p.tagline,
                (CASE WHEN v.verified=1 AND p.verified=1 THEN 1 ELSE 0 END) AS verified,
                p.email_verified AS email_verified
         FROM vehicles v JOIN travel_partners p ON v.partner_id = p.id
         WHERE v.active=1`
      )
      .all();
    /* Verified is decided live (expired / incomplete documents never show as Verified), then the board is
       ordered: plan tier first, verified before unverified, newest first - same order as before. */
    const today = istToday(), ed = await getEnforceDate(env);
    const results = rows.map((r) => {
      const live = !!r.verified && vehicleLive({ ...r, verified: r.vverified }, today, ed);
      const { insurance_expiry, permit_expiry, rc_photo_key, insurance_photo_key, permit_photo_key, vverified, tier, ...pub } = r;
      return { ...pub, verified: live ? 1 : 0, _tier: tier };
    });
    results.sort((a, b) => (a._tier - b._tier) || (b.verified - a.verified) || (b.id - a.id));
    results.forEach((r) => { delete r._tier; });
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
         WHERE v.id=? AND v.active=1`
      )
      .bind(vehicleId)
      .first();
    if (!row || !row.front_photo_key) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const obj = await env.FILES.get(row.front_photo_key);
    if (!obj) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    return new Response(obj.body, {
      headers: { "content-type": obj.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=900" },
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
    const ownerRow = await env.DB.prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?").bind(partner_id).first();
    const devDeny = await deviceCheck(env, request, "vehicles.register", ownerRow ? [ownerRow.mobile1, ownerRow.mobile2] : []);
    if (devDeny) return devDeny;
    /* Every new vehicle needs the 4 photos and the Insurance + Permit expiry dates. */
    for (const f of ["front_photo", "rc_photo", "insurance_photo", "permit_photo"]) {
      const file = form.get(f);
      if (!file || typeof file.arrayBuffer !== "function" || !(file.size > 0)) {
        return Response.json({ ok: false, error: "docs_required", field: f }, { status: 400 });
      }
    }
    for (const f of ["insurance_expiry", "permit_expiry"]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test((form.get(f) || "").toString())) {
        return Response.json({ ok: false, error: "date_required", field: f }, { status: 400 });
      }
    }
    /* Seats: owner enters PASSENGER seats (excluding the driver); we store the total
       (passengers + driver). Mandatory for taxi/travel vehicles. Older clients that
       send "seats" (already the total) are still accepted. */
    const pRow = await env.DB.prepare("SELECT business_type FROM travel_partners WHERE id=?").bind(partner_id).first();
    let seatsTotal = null;
    const ps = parseInt((form.get("passenger_seats") || "").toString(), 10);
    if (ps >= 1 && ps <= 59) seatsTotal = ps + 1;
    else {
      const st = parseInt((form.get("seats") || "").toString(), 10);
      if (st >= 2 && st <= 60) seatsTotal = st;
    }
    if (pRow && pRow.business_type === "taxi_travel" && !seatsTotal) {
      return Response.json({ ok: false, error: "seats_required" }, { status: 400 });
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
           fitness_expiry, puc_expiry, tax_expiry, seats, verified, active, created_at, rate_cat, rate_cat_name)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?,?)`
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
        field("tax_expiry"),
        seatsTotal,
        now,
        pRow && pRow.business_type === "taxi_travel" ? catNum(form.get("rate_cat")) : null,
        pRow && pRow.business_type === "taxi_travel" && catNum(form.get("rate_cat")) ? catName(form.get("rate_cat_name")) : null
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
    const devDeny = await deviceCheck(env, request, "vehicles.update", [mobile]);
    if (devDeny) return devDeny;
    const row = await env.DB
      .prepare(
        `SELECT p.mobile1, p.mobile2, v.* FROM vehicles v JOIN travel_partners p ON v.partner_id = p.id WHERE v.id=?`
      )
      .bind(vehicle_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const dateFields = ["category", "driver_name", "driver_mobile1", "driver_mobile2", "driver_license_number",
      "driver_license_expiry", "rc_expiry", "insurance_expiry", "permit_expiry", "fitness_expiry", "puc_expiry", "tax_expiry"];
    const setParts = [];
    const bindVals = [];
    {
      const ps = parseInt((form.get("passenger_seats") || "").toString(), 10);
      const st = parseInt((form.get("seats") || "").toString(), 10);
      let tot = null;
      if (ps >= 1 && ps <= 59) tot = ps + 1;
      else if (st >= 2 && st <= 60) tot = st;
      if (tot) { setParts.push("seats=?"); bindVals.push(tot); }
    }
    if (form.has("rate_cat")) {
      const rc = catNum(form.get("rate_cat"));
      setParts.push("rate_cat=?", "rate_cat_name=?");
      bindVals.push(rc, rc ? catName(form.get("rate_cat_name")) : null);
    }
    for (const f of dateFields) {
      if (form.has(f)) {
        setParts.push(`${f}=?`);
        bindVals.push(form.get(f).toString());
      }
    }
    const replacedKeys = [];
    for (const docField of DOC_FIELDS) {
      const file = form.get(docField);
      const key = await uploadFile(env, file, vehicle_id, docField);
      if (key) {
        setParts.push(`${docField}_key=?`);
        bindVals.push(key);
        if (row[`${docField}_key`]) replacedKeys.push(row[`${docField}_key`]);
      }
    }
    if (setParts.length) {
      bindVals.push(vehicle_id);
      await env.DB.prepare(`UPDATE vehicles SET ${setParts.join(",")} WHERE id=?`).bind(...bindVals).run();
    }
    /* the replaced photos are no longer used: delete them so old copies do not pile up in the storage */
    await deleteFiles(env, replacedKeys, "vehicles/");
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
    const devDeny = await deviceCheck(env, request, "vehicles.toggle_active", [mobile]);
    if (devDeny) return devDeny;
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
    const devDeny = await deviceCheck(env, request, "vehicles.set_hours", [mobile]);
    if (devDeny) return devDeny;
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

  /* admin: set or change the Rate Master category of any vehicle (empty rate_cat clears it) */
  if (action === "set_rate_cat") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const rc = catNum(body.rate_cat);
    await env.DB.prepare("UPDATE vehicles SET rate_cat=?, rate_cat_name=? WHERE id=?").bind(rc, rc ? catName(body.rate_cat_name) : null, body.vehicle_id).run();
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
    const old = await env.DB.prepare("SELECT * FROM vehicles WHERE id=?").bind(body.vehicle_id).first();
    await env.DB.prepare("DELETE FROM vehicles WHERE id=?").bind(body.vehicle_id).run();
    /* the vehicle is gone: its document photos are removed from the storage too */
    if (old) await deleteFiles(env, DOC_FIELDS.map((f) => old[`${f}_key`]), "vehicles/");
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
