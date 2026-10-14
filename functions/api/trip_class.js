/* Who may receive which kind of trip alert, and when a vehicle's documents count as "complete".
   Alert kinds sent by the customer app (vclass):
     agency    - Travel Agency: every verified, Active Taxi/Travel business (with or without vehicles)
     cab       - Motor Cab: businesses that have a verified vehicle with up to 7 seats in total (up to 6 passengers + driver)
     carriage  - Contract Carriage: businesses that have a verified vehicle with 8 or more seats in total (7+ passengers + driver). Seats are stored as passengers + 1 (driver)
   Auto Rickshaw / Pickup-Goods alerts go to verified, Active owners of that type; from ENFORCE_DATE
   they also need at least one verified vehicle (vehicles lose Verified when their documents are incomplete/expired). */

export const ENFORCE_DATE = "2027-01-01";
export const VCLASSES = ["agency", "cab", "carriage"];
export const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

export function seatsOf(v) {
  const n = parseInt(v && v.seats, 10);
  if (n > 0) return n;
  const c = String((v && v.category) || "");
  const m = c.match(/(\d{1,2})\s*[- ]?\s*(seat|seater|str)/i) || c.match(/^\s*(\d{1,2})\b/);
  return m ? parseInt(m[1], 10) : null;
}
/* Vehicles whose seat count is unknown are treated as ordinary cabs. */
export const vclassOf = (v) => { const s = seatsOf(v); return s !== null && s > 7 ? "carriage" : "cab"; };

/* What is still missing from a vehicle record (empty list = complete and valid). */
export function missingDocs(v, today = istToday()) {
  const m = [];
  if (!v.front_photo_key) m.push("Front photo");
  if (!v.rc_photo_key) m.push("RC photo");
  if (!v.insurance_photo_key) m.push("Insurance photo");
  if (!v.permit_photo_key) m.push("Permit photo");
  if (!v.insurance_expiry) m.push("Insurance expiry date");
  else if (v.insurance_expiry < today) m.push("Insurance expired");
  if (!v.permit_expiry) m.push("Permit expiry date");
  else if (v.permit_expiry < today) m.push("Permit expired");
  /* Taxi/Travel vehicles must also have the seating capacity (passengers + driver) */
  if (v.business_type === "taxi_travel" && !(parseInt(v.seats, 10) >= 2)) m.push("Seating capacity (passenger seats)");
  return m;
}
export const isComplete = (v, today) => missingDocs(v, today).length === 0;

const BASE =
  "SELECT id, business_name, mobile1, mobile2, plan, plan_expires_at, COALESCE(current_lat, lat) AS lat, COALESCE(current_lon, lon) AS lon FROM travel_partners WHERE business_type=? AND verified=1 AND available=1";

async function ensureSeats(env) {
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
}

/* Partners to alert for a new request. vclass may be null for older app versions (old behaviour). */
export async function eligiblePartners(env, businessType, vclass) {
  const partners = ((await env.DB.prepare(BASE).bind(businessType).all()).results) || [];
  const needVehicles = (businessType === "taxi_travel" && (vclass === "cab" || vclass === "carriage")) ||
    ((businessType === "auto_rickshaw" || businessType === "pickup_goods") && istToday() >= ENFORCE_DATE);
  if (!needVehicles) return partners;
  await ensureSeats(env);
  const vs = ((await env.DB.prepare(
    "SELECT partner_id, category, seats FROM vehicles WHERE verified=1 AND partner_id IN (SELECT id FROM travel_partners WHERE business_type=? AND verified=1 AND available=1)"
  ).bind(businessType).all()).results) || [];
  const ok = new Set();
  for (const v of vs) {
    if (businessType === "taxi_travel" && vclassOf(v) !== vclass) continue;
    ok.add(v.partner_id);
  }
  return partners.filter((p) => ok.has(p.id));
}

/* Same rule for one partner (used when the partner opens or accepts an alert). */
export async function partnerMatches(env, partnerId, businessType, vclass) {
  if (businessType === "taxi_travel" && (!vclass || vclass === "agency")) return true;
  const needVehicles = (businessType === "taxi_travel") || istToday() >= ENFORCE_DATE;
  if (!needVehicles) return true;
  await ensureSeats(env);
  const vs = ((await env.DB.prepare("SELECT category, seats FROM vehicles WHERE verified=1 AND partner_id=?").bind(partnerId).all()).results) || [];
  if (businessType !== "taxi_travel") return vs.length > 0;
  return vs.some((v) => vclassOf(v) === vclass);
}
