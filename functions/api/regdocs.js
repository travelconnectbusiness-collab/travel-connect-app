import { verifyAdminToken } from "./_auth_helper.js";

/* Vehicle documents for Taxi / Auto / Goods owners who are NOT on the
   Authorized Users list.
   GET  ?action=status&partner_id&mobile&device     owner: do I still need to upload?
   GET  ?action=get&partner_id&token                admin: the saved record
   GET  ?action=file&key&token                      admin: one photo
   POST multipart action=submit                     owner: upload the 4 photos + dates */

export const VEHICLE_TYPES = ["taxi_travel", "auto_rickshaw", "pickup_goods"];
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const j = (o, s) => Response.json(o, s ? { status: s } : undefined);

let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS reg_docs (partner_id INTEGER PRIMARY KEY, vehicle_no TEXT, front_key TEXT, rc_key TEXT, rc_date TEXT, permit_key TEXT, permit_expiry TEXT, ins_key TEXT, ins_expiry TEXT, created_at TEXT, updated_at TEXT)"
  ).run();
  ready = true;
}

async function ownerAuth(env, partnerId, mobile, device) {
  partnerId = parseInt(partnerId, 10);
  mobile = (mobile || "").toString().trim();
  device = (device || "").toString().trim();
  if (!partnerId || !mobile || !device) return null;
  const p = await env.DB.prepare("SELECT * FROM travel_partners WHERE id=?").bind(partnerId).first();
  if (!p || (p.mobile1 !== mobile && p.mobile2 !== mobile)) return null;
  const u = await env.DB.prepare("SELECT device_token, blocked FROM app_users WHERE mobile=?").bind(mobile).first();
  if (!u || u.blocked) return null;
  if (!u.device_token) { await env.DB.prepare("UPDATE app_users SET device_token=? WHERE mobile=?").bind(device, mobile).run(); return p; }
  if (u.device_token === device) return p;
  try {
    const known = await env.DB.prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?").bind(mobile, device).first();
    if (known) return p;
  } catch (e) {}
  return null;
}

/* Are documents required for this partner? (vehicle category, number not on the Authorized list, not already approved) */
async function required(env, p) {
  if (!VEHICLE_TYPES.includes(p.business_type || "taxi_travel")) return false;
  if (p.verified) return false;
  const a = await env.DB.prepare("SELECT 1 AS x FROM authorized_users WHERE mobile=?").bind(p.mobile1).first();
  return !a;
}
const isImage = (f) => f && typeof f.arrayBuffer === "function" && f.size > 0 && (f.type || "").startsWith("image/");
const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(new Date(s).getTime());

export async function onRequestGet({ request, env }) {
  await ensure(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "status") {
    const p = await ownerAuth(env, url.searchParams.get("partner_id"), url.searchParams.get("mobile"), url.searchParams.get("device"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    const need = await required(env, p);
    const d = await env.DB.prepare("SELECT vehicle_no, permit_expiry, ins_expiry FROM reg_docs WHERE partner_id=?").bind(p.id).first();
    return j({ ok: true, required: need, submitted: !!d, docs: d || null });
  }

  if (action === "get" || action === "file") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) return j({ ok: false, error: "unauthorized" }, 401);
    if (action === "get") {
      const d = await env.DB.prepare("SELECT * FROM reg_docs WHERE partner_id=?").bind(url.searchParams.get("partner_id")).first();
      return j({ ok: true, docs: d || null });
    }
    const key = url.searchParams.get("key") || "";
    if (!key.startsWith("regdocs/")) return j({ ok: false, error: "bad_key" }, 400);
    const obj = await env.FILES.get(key);
    if (!obj) return j({ ok: false, error: "not_found" }, 404);
    return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, max-age=300" } });
  }
  return j({ ok: false, error: "unknown_action" });
}

export async function onRequestPost({ request, env }) {
  await ensure(env);
  let fd;
  try { fd = await request.formData(); } catch (e) { return j({ ok: false, error: "bad_request" }, 400); }
  const f = (k) => (fd.get(k) || "").toString().trim();
  if (f("action") !== "submit") return j({ ok: false, error: "unknown_action" });

  const p = await ownerAuth(env, f("partner_id"), f("mobile"), f("device_token"));
  if (!p) return j({ ok: false, error: "unauthorized" }, 403);
  if (!VEHICLE_TYPES.includes(p.business_type || "taxi_travel")) return j({ ok: false, error: "not_needed" }, 400);

  const vehicleNo = f("vehicle_no").toUpperCase().replace(/\s+/g, " ").slice(0, 20);
  const rcDate = f("rc_date"), permitExp = f("permit_expiry"), insExp = f("ins_expiry");
  const old = await env.DB.prepare("SELECT * FROM reg_docs WHERE partner_id=?").bind(p.id).first();

  /* every photo is mandatory the first time; when re-submitting, a missing photo keeps the old one */
  const files = { front: fd.get("front"), rc: fd.get("rc"), permit: fd.get("permit"), ins: fd.get("ins") };
  const oldKey = { front: old && old.front_key, rc: old && old.rc_key, permit: old && old.permit_key, ins: old && old.ins_key };
  for (const k of Object.keys(files)) {
    if (!isImage(files[k]) && !oldKey[k]) return j({ ok: false, error: "photo_missing", field: k }, 400);
    if (isImage(files[k]) && files[k].size > MAX_IMAGE_BYTES) return j({ ok: false, error: "image_too_big", field: k }, 400);
  }
  if (vehicleNo.length < 4) return j({ ok: false, error: "vehicle_no_required" }, 400);
  const today = new Date().toISOString().slice(0, 10);
  if (!okDate(permitExp)) return j({ ok: false, error: "permit_date_required" }, 400);
  if (!okDate(insExp)) return j({ ok: false, error: "ins_date_required" }, 400);
  if (permitExp < today) return j({ ok: false, error: "permit_expired" }, 400);
  if (insExp < today) return j({ ok: false, error: "ins_expired" }, 400);
  if (rcDate && !okDate(rcDate)) return j({ ok: false, error: "rc_date_bad" }, 400);

  const keys = {};
  for (const k of Object.keys(files)) {
    if (isImage(files[k])) {
      const key = `regdocs/${p.id}/${Date.now()}-${k}.jpg`;
      await env.FILES.put(key, await files[k].arrayBuffer(), { httpMetadata: { contentType: files[k].type || "image/jpeg" } });
      keys[k] = key;
      if (oldKey[k]) { try { await env.FILES.delete(oldKey[k]); } catch (e) {} }
    } else keys[k] = oldKey[k];
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO reg_docs (partner_id, vehicle_no, front_key, rc_key, rc_date, permit_key, permit_expiry, ins_key, ins_expiry, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(partner_id) DO UPDATE SET vehicle_no=excluded.vehicle_no, front_key=excluded.front_key, rc_key=excluded.rc_key, rc_date=excluded.rc_date,
       permit_key=excluded.permit_key, permit_expiry=excluded.permit_expiry, ins_key=excluded.ins_key, ins_expiry=excluded.ins_expiry, updated_at=excluded.updated_at`
  ).bind(p.id, vehicleNo, keys.front, keys.rc, rcDate || null, keys.permit, permitExp, keys.ins, insExp, now, now).run();
  return j({ ok: true });
}
