import { verifyAdminToken } from "./_auth_helper.js";
import { runExpirySweep } from "./docs_expiry.js";
import { ENFORCE_DATE, istToday, missingDocs, vclassOf, seatsOf } from "./trip_class.js";

/* Vehicle-document status (the documents themselves live on each vehicle record).
   GET ?action=status&partner_id&mobile&device   owner: what is still missing?
   GET ?action=admin_summary&partner_id&token    admin: the partner's vehicles with documents
   GET ?action=sweep&token                       admin: run the daily check now */
const j = (o, s) => Response.json(o, s ? { status: s } : undefined);

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
async function vehiclesOf(env, partnerId) {
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
  return ((await env.DB.prepare("SELECT v.*, (SELECT business_type FROM travel_partners WHERE id=v.partner_id) AS business_type FROM vehicles v WHERE v.partner_id=? ORDER BY v.id").bind(partnerId).all()).results) || [];
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const today = istToday();

  if (action === "status") {
    const p = await ownerAuth(env, url.searchParams.get("partner_id"), url.searchParams.get("mobile"), url.searchParams.get("device"));
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    const vs = await vehiclesOf(env, p.id);
    const list = vs.map((v) => ({ id: v.id, vehicle_number: v.vehicle_number, verified: !!v.verified, missing: missingDocs(v, today) }));
    const hasComplete = list.some((v) => v.missing.length === 0);
    const vehicleType = ["taxi_travel", "auto_rickshaw", "pickup_goods"].includes(p.business_type || "taxi_travel");
    let authorized = false;
    try { authorized = !!(await env.DB.prepare("SELECT 1 AS x FROM authorized_users WHERE mobile=?").bind(p.mobile1).first()); } catch (e) {}
    /* Auto / Goods owners must register a vehicle with complete documents before approval (unless on the Authorized list). */
    const required = ["auto_rickshaw", "pickup_goods"].includes(p.business_type) && !p.verified && !authorized && !hasComplete;
    return j({ ok: true, vehicle_type: vehicleType, required, enforce_date: ENFORCE_DATE, vehicles: list });
  }

  if (action === "admin_summary" || action === "sweep") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) return j({ ok: false, error: "unauthorized" }, 401);
    if (action === "sweep") return j({ ok: true, ...(await runExpirySweep(env)) });
    const vs = await vehiclesOf(env, url.searchParams.get("partner_id"));
    return j({
      ok: true,
      vehicles: vs.map((v) => ({
        id: v.id, vehicle_number: v.vehicle_number, category: v.category, seats: seatsOf(v), vclass: vclassOf(v), verified: !!v.verified,
        permit_expiry: v.permit_expiry, insurance_expiry: v.insurance_expiry, rc_expiry: v.rc_expiry,
        keys: { Front: v.front_photo_key, RC: v.rc_photo_key, Insurance: v.insurance_photo_key, Permit: v.permit_photo_key },
        missing: missingDocs(v, today),
      })),
    });
  }
  return j({ ok: false, error: "unknown_action" });
}

export async function onRequestPost() {
  return j({ ok: false, error: "unknown_action" });
}
