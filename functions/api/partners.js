import { verifyAdminToken } from "./_auth_helper.js";

/* Must match the keys of TC_BUSINESS_TYPES in core.js exactly - used to
   tell a known, fixed category apart from free-typed "Other" text (see
   the registration authorization check below). */
const FIXED_BUSINESS_TYPES = [
  "taxi_travel",
  "auto_rickshaw",
  "pickup_goods",
  "restaurant",
  "petrol_pump",
  "workshop",
  "hospital",
  "homestay",
  "skilled_work",
];

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Adds the description/business_hours columns the first time this file runs
   after the update - SQLite has no "ADD COLUMN IF NOT EXISTS", so this just
   swallows the "duplicate column" error on every run after the first. */
async function ensureNewColumns(env) {
  for (const stmt of [
    "ALTER TABLE travel_partners ADD COLUMN description TEXT",
    "ALTER TABLE travel_partners ADD COLUMN business_hours TEXT",
    "ALTER TABLE travel_partners ADD COLUMN business_subtype TEXT",
    "ALTER TABLE travel_partners ADD COLUMN plan_expires_at TEXT",
    "ALTER TABLE travel_partners ADD COLUMN current_lat REAL",
    "ALTER TABLE travel_partners ADD COLUMN current_lon REAL",
    "ALTER TABLE travel_partners ADD COLUMN current_location_at TEXT",
  ]) {
    try { await env.DB.prepare(stmt).run(); } catch (e) { /* column already exists */ }
  }
}

/* GET ?action=mine&mobile=...           - a partner looks up their own record
   GET ?action=pending&token=...         - admin: partners awaiting verification
   GET ?action=all&token=...             - admin: every partner
   GET ?action=logo&partner_id=...       - public: serves a partner's uploaded logo image
                                            (Premium branding only - no auth needed, since
                                            this has to load inside a printed bill/PDF the
                                            customer views, not just inside the app) */
export async function onRequestGet({ request, env }) {
  await ensureNewColumns(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "mine") {
    const mobile = url.searchParams.get("mobile");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" });
    const row = await env.DB
      .prepare("SELECT * FROM travel_partners WHERE (mobile1=? OR mobile2=?) ORDER BY created_at ASC LIMIT 1")
      .bind(mobile, mobile)
      .first();
    const hasPassword = !!(row && row.portal_password_hash);
    if (row) delete row.portal_password_hash; /* never send the hash to the client */
    return Response.json({ ok: true, partner: row || null, has_password: hasPassword });
  }

  /* Lists EVERY business this mobile has registered - a person can run more
     than one (e.g. a taxi business and a separate auto-rickshaw, or an
     aquarium shop, all under one phone number), each its own fully separate
     partner record/page. directory.js's partnerView() uses this to decide
     whether to go straight to the one business someone has (unchanged
     behaviour for the common case), or show a picker when there's more than
     one. */
  if (action === "mine_list") {
    const mobile = url.searchParams.get("mobile");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" });
    const { results } = await env.DB
      .prepare("SELECT * FROM travel_partners WHERE (mobile1=? OR mobile2=?) ORDER BY created_at ASC")
      .bind(mobile, mobile)
      .all();
    results.forEach((r) => delete r.portal_password_hash);
    return Response.json({ ok: true, partners: results });
  }

  if (action === "pending" || action === "all") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const sql =
      action === "pending"
        ? "SELECT * FROM travel_partners WHERE verified=0 ORDER BY created_at DESC"
        : "SELECT * FROM travel_partners ORDER BY created_at DESC";
    const { results } = await env.DB.prepare(sql).all();
    return Response.json({ ok: true, partners: results });
  }

  /* Public, no auth needed - the searchable local business directory. Now
     also returns description and business_hours so the Directory listing
     can show what the business offers, and can compute (client-side)
     whether they're within their set hours right now. */
  if (action === "directory") {
    const { results } = await env.DB
      .prepare(
        `SELECT id, business_name, business_type, business_subtype, owner_name, mobile1, mobile2, location, pincode, lat, lon, available, description, business_hours, plan
         FROM travel_partners WHERE verified=1
         ORDER BY CASE
           WHEN plan='owner_free' THEN 1
           WHEN plan='premium' AND (plan_expires_at IS NULL OR julianday(plan_expires_at)>=julianday('now')) THEN 1
           WHEN plan='paid' AND (plan_expires_at IS NULL OR julianday(plan_expires_at)>=julianday('now')) THEN 2
           ELSE 3
         END, business_name`
      )
      .all();
    return Response.json({ ok: true, partners: results });
  }

  if (action === "logo") {
    const partnerId = url.searchParams.get("partner_id");
    if (!partnerId) return Response.json({ ok: false, error: "missing_partner_id" }, { status: 400 });
    const row = await env.DB.prepare("SELECT logo_key FROM travel_partners WHERE id=?").bind(partnerId).first();
    if (!row || !row.logo_key) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    const obj = await env.FILES.get(row.logo_key);
    if (!obj) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    return new Response(obj.body, {
      headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg" },
    });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

/* POST action=register - create a new partner (self-registration, not verified yet)
   POST action=update   - a verified-or-not partner edits their own details (ownership
                           checked by matching mobile, not by admin token)
   POST action=verify   - admin: approve or un-approve a partner */
export async function onRequestPost({ request, env }) {
  await ensureNewColumns(env);
  const url = new URL(request.url);
  const urlAction = url.searchParams.get("action");

  if (urlAction === "upload_logo") {
    const form = await request.formData();
    const partner_id = form.get("partner_id");
    const mobile = (form.get("mobile") || "").toString().trim();
    const file = form.get("logo");
    if (!partner_id || !mobile || !file || typeof file.arrayBuffer !== "function") {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2, plan FROM travel_partners WHERE id=?")
      .bind(partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    if (row.plan !== "premium" && row.plan !== "owner_free") {
      return Response.json({ ok: false, error: "not_premium" }, { status: 403 });
    }
    const buf = await file.arrayBuffer();
    const nameParts = (file.name || "").split(".");
    const ext = nameParts.length > 1 ? nameParts.pop() : "jpg";
    const key = `partners/${partner_id}/logo-${Date.now()}.${ext}`;
    await env.FILES.put(key, buf, {
      httpMetadata: { contentType: file.type || "image/jpeg" },
    });
    await env.DB.prepare("UPDATE travel_partners SET logo_key=? WHERE id=?").bind(key, partner_id).run();
    return Response.json({ ok: true, logo_key: key });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const action = body.action;

  if (action === "register") {
    const business_name = (body.business_name || "").trim();
    const owner_name = (body.owner_name || "").trim();
    const mobile1 = (body.mobile1 || "").trim();
    const business_type = body.business_type || "taxi_travel";
    if (!business_name || !owner_name || !mobile1) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    /* A mobile can register MULTIPLE businesses (each its own row/page), but
       never the SAME category twice - that specific combination is what has
       to stay unique now, not the bare mobile number on its own. */
    const existing = await env.DB
      .prepare("SELECT id FROM travel_partners WHERE mobile1=? AND business_type=?")
      .bind(mobile1, business_type)
      .first();
    if (existing) {
      return Response.json(
        { ok: false, error: "already_registered", partner_id: existing.id },
        { status: 409 }
      );
    }
    /* Category-level authorization: if this mobile has ANY category grants
       on file at all, the category being registered now must be one of
       them - a number the owner only ever authorized for "Taxi" cannot
       self-register as "Restaurant" just by picking it from the dropdown.
       A mobile with NO category grants at all is left unrestricted, so this
       never silently blocks a number authorized before this feature
       existed, or one the owner simply hasn't categorised yet. */
    const catCountRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM authorized_categories WHERE mobile=?").bind(mobile1).first();
    if (catCountRow && catCountRow.c > 0) {
      /* A business_type that isn't one of the fixed, known categories is
         whatever free text someone typed into "Other (please specify)" -
         there is no way for the admin to have pre-authorized that EXACT
         string in advance (the Grant Category dropdown only offers
         "Other" itself as a single option, since it obviously can't list
         every possible custom trade someone might type). So for a custom
         "Other" value, granting "other" once covers any such text from
         that number, rather than requiring an exact-string match that
         could never realistically be set up ahead of time. */
      const isKnownCategory = FIXED_BUSINESS_TYPES.includes(business_type);
      const categoryToCheck = isKnownCategory ? business_type : "other";
      const catAllowed = await env.DB.prepare("SELECT 1 FROM authorized_categories WHERE mobile=? AND category=?").bind(mobile1, categoryToCheck).first();
      if (!catAllowed) {
        return Response.json({ ok: false, error: "category_not_authorized" }, { status: 403 });
      }
    }
    const now = new Date().toISOString();
    const result = await env.DB
      .prepare(
        `INSERT INTO travel_partners
          (business_name, owner_name, mobile1, mobile2, email, location, pincode, business_type, business_subtype, lat, lon, description, business_hours, verified, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`
      )
      .bind(
        business_name,
        owner_name,
        mobile1,
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        business_type,
        body.business_subtype || null,
        body.lat != null && body.lat !== "" ? Number(body.lat) : null,
        body.lon != null && body.lon !== "" ? Number(body.lon) : null,
        body.description || null,
        body.business_hours || null,
        now
      )
      .run();
    return Response.json({ ok: true, partner_id: result.meta.last_row_id });
  }

  if (action === "update") {
    const mobile = (body.mobile || "").trim();
    if (!mobile || !body.partner_id) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2, plan FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const isPremium = row.plan === "premium" || row.plan === "owner_free";
    const brandColor = isPremium && body.brand_color ? String(body.brand_color).trim() : null;
    const brandFontSize = isPremium && body.brand_font_size ? String(body.brand_font_size).trim() : null;
    const brandFontFamily = isPremium && body.brand_font_family ? String(body.brand_font_family).trim() : null;
    const brandDetailSize = isPremium && body.brand_detail_size ? String(body.brand_detail_size).trim() : null;
    const brandLogoSize = isPremium && body.brand_logo_size ? String(body.brand_logo_size).trim() : null;
    /* mobile1 is the account's actual login identity (what push
       subscriptions, trip-alert matching, and login itself all key off
       of) - editable only from the admin's own edit form (the owner's
       self-service "Edit Business Details" never exposes it, to avoid
       someone locking themselves out by mistyping it). Previously this
       UPDATE never included mobile1 at all: the admin form collected a
       corrected number, the request came back ok:true, but the digits
       typed were silently discarded and the old value stayed in place
       forever - exactly the "+91 prefix I already removed, but it's
       still not working" case. COALESCE(NULLIF(?,''),mobile1) only
       changes it when a genuinely non-empty value was sent, so a blank
       field can never accidentally wipe out someone's login number. */
    await env.DB
      .prepare(
        `UPDATE travel_partners SET business_name=?, owner_name=?, mobile1=COALESCE(NULLIF(?,''),mobile1), mobile2=?, email=?, location=?, pincode=?, business_type=?, business_subtype=?, description=?, business_hours=?, lat=COALESCE(?,lat), lon=COALESCE(?,lon), brand_color=COALESCE(?,brand_color), brand_font_size=COALESCE(?,brand_font_size), brand_font_family=COALESCE(?,brand_font_family), brand_detail_size=COALESCE(?,brand_detail_size), brand_logo_size=COALESCE(?,brand_logo_size)
         WHERE id=?`
      )
      .bind(
        body.business_name,
        body.owner_name,
        (body.mobile1 || "").trim(),
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        body.business_type || "taxi_travel",
        body.business_subtype || null,
        body.description || null,
        body.business_hours || null,
        body.lat != null && body.lat !== "" ? Number(body.lat) : null,
        body.lon != null && body.lon !== "" ? Number(body.lon) : null,
        brandColor,
        brandFontSize,
        brandFontFamily,
        brandDetailSize,
        brandLogoSize,
        body.partner_id
      )
      .run();
    return Response.json({ ok: true });
  }

  if (action === "set_available") {
    const mobile = (body.mobile || "").trim();
    if (!mobile || !body.partner_id) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    /* Turning Active ON is also the moment most likely to mean "I am
       wherever I actually am right now, not necessarily my registered
       home/office/stand" - a lat/lon sent along with it (best-effort from
       the phone's GPS, may be absent if permission was denied) updates
       current_lat/current_lon, which trip-alert distance matching prefers
       over the static registration location whenever it's present. */
    const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : null;
    const lon = body.lon != null && body.lon !== "" ? Number(body.lon) : null;
    if (body.available && lat != null && lon != null) {
      await env.DB
        .prepare("UPDATE travel_partners SET available=1, current_lat=?, current_lon=?, current_location_at=? WHERE id=?")
        .bind(lat, lon, new Date().toISOString(), body.partner_id)
        .run();
    } else {
      await env.DB
        .prepare("UPDATE travel_partners SET available=? WHERE id=?")
        .bind(body.available ? 1 : 0, body.partner_id)
        .run();
    }
    return Response.json({ ok: true });
  }

  /* A lightweight, frequent-safe refresh of just the live position - used
     while a partner is Active and the app happens to be open (e.g. every
     time their Dashboard loads), so a driver who has been out running for
     a while still shows a reasonably current position without needing
     true continuous background GPS tracking (which a browser/PWA can't
     reliably do once the app isn't actively open anyway). */
  if (action === "update_location") {
    const mobile = (body.mobile || "").trim();
    const lat = body.lat != null && body.lat !== "" ? Number(body.lat) : null;
    const lon = body.lon != null && body.lon !== "" ? Number(body.lon) : null;
    if (!mobile || !body.partner_id || lat == null || lon == null) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    await env.DB
      .prepare("UPDATE travel_partners SET current_lat=?, current_lon=?, current_location_at=? WHERE id=?")
      .bind(lat, lon, new Date().toISOString(), body.partner_id)
      .run();
    return Response.json({ ok: true });
  }

  if (action === "verify") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await env.DB
      .prepare("UPDATE travel_partners SET verified=? WHERE id=?")
      .bind(body.verified ? 1 : 0, body.partner_id)
      .run();
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!body.partner_id) {
      return Response.json({ ok: false, error: "missing_partner_id" }, { status: 400 });
    }
    await env.DB.prepare("DELETE FROM vehicles WHERE partner_id=?").bind(body.partner_id).run();
    await env.DB.prepare("DELETE FROM travel_partners WHERE id=?").bind(body.partner_id).run();
    return Response.json({ ok: true });
  }

  if (action === "admin_update") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!body.partner_id) {
      return Response.json({ ok: false, error: "missing_partner_id" }, { status: 400 });
    }
    await env.DB
      .prepare(
        `UPDATE travel_partners SET business_name=?, owner_name=?, mobile1=?, mobile2=?, email=?, location=?, pincode=?, business_type=?, business_subtype=?
         WHERE id=?`
      )
      .bind(
        body.business_name,
        body.owner_name,
        body.mobile1,
        body.mobile2 || null,
        body.email || null,
        body.location || null,
        body.pincode || null,
        body.business_type || "taxi_travel",
        body.business_subtype || null,
        body.partner_id
      )
      .run();
    return Response.json({ ok: true });
  }

  if (action === "set_password") {
    const mobile = (body.mobile || "").trim();
    const password = (body.password || "").trim();
    if (!mobile || !password || password.length < 4) {
      return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    const row = await env.DB
      .prepare("SELECT mobile1, mobile2 FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || (row.mobile1 !== mobile && row.mobile2 !== mobile)) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    const hash = await sha256Hex(password);
    await env.DB
      .prepare("UPDATE travel_partners SET portal_password_hash=? WHERE id=?")
      .bind(hash, body.partner_id)
      .run();
    return Response.json({ ok: true });
  }

  if (action === "verify_password") {
    const password = (body.password || "").trim();
    const row = await env.DB
      .prepare("SELECT verified, portal_password_hash FROM travel_partners WHERE id=?")
      .bind(body.partner_id)
      .first();
    if (!row || !row.verified || !row.portal_password_hash) {
      return Response.json({ ok: false, error: "not_available" }, { status: 403 });
    }
    const hash = await sha256Hex(password);
    if (hash !== row.portal_password_hash) {
      return Response.json({ ok: false, error: "wrong_password" }, { status: 401 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
