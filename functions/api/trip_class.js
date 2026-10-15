/* Who may receive which kind of trip alert, and when a vehicle's documents count as "complete".
   Alert kinds sent by the customer app (vclass):
     agency    - Travel Agency: every verified, Active Taxi/Travel business (with or without vehicles)
     cab       - Motor Cab: businesses that have a verified vehicle with up to 7 seats in total (up to 6 passengers + driver)
     carriage  - Contract Carriage: businesses that have a verified vehicle with 8 or more seats in total (7+ passengers + driver). Seats are stored as passengers + 1 (driver)
   Auto Rickshaw / Pickup-Goods alerts go to verified, Active owners of that type; from ENFORCE_DATE
   they also need at least one verified vehicle (vehicles lose Verified when their documents are incomplete/expired). */

export const ENFORCE_DATE = "2027-01-01"; /* default; the admin can change it (Pending Approvals > Verification deadline) */
export const VCLASSES = ["agency", "cab", "carriage"];
export const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

/* The deadline actually in force: admin setting (app_flags 'enforce_date') or the default above.
   Cached for 60 seconds per server instance so alerts do not read the database every time. */
let edCache = { v: ENFORCE_DATE, t: 0 };
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") && !isNaN(new Date(d + "T00:00:00Z"));
export async function getEnforceDate(env) {
  if (Date.now() - edCache.t < 60000) return edCache.v;
  let v = ENFORCE_DATE;
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key='enforce_date'").first();
    if (r && isDate(r.value)) v = r.value;
  } catch (e) {}
  edCache = { v, t: Date.now() };
  return v;
}
export async function setEnforceDate(env, date) {
  if (!isDate(date)) return false;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
  await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES ('enforce_date', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(date).run();
  edCache = { v: date, t: Date.now() };
  return true;
}
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_ML = ["ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ"];
export function dateLabels(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { en: `${d} ${MONTHS_EN[m - 1]} ${y}`, ml: `${y} ${MONTHS_ML[m - 1]} ${d}` };
}

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

/* LIVE rule: is this vehicle Verified RIGHT NOW? Checked at the moment of use (alerts, boards, lists),
   so it never depends on the daily check having run yet. A vehicle counts only if
   - the admin approved it (verified=1),
   - its insurance / permit date (if set) has not passed,
   - and from the deadline on, all its documents are complete. */
export function vehicleLive(v, today, enforceDate) {
  if (!v.verified) return false;
  if (v.insurance_expiry && v.insurance_expiry < today) return false;
  if (v.permit_expiry && v.permit_expiry < today) return false;
  if (today >= enforceDate && missingDocs(v, today).length) return false;
  return true;
}

/* From the deadline an Auto / Goods business without a live vehicle is not Verified. Applied to partner rows
   (directory, "mine") so the Verified chip is right even before the daily check has updated the database. */
export async function applyLivePartnerVerified(env, partners) {
  const today = istToday(), ed = await getEnforceDate(env);
  if (today < ed) return partners;
  const rows = partners.filter((p) => p && p.verified && (p.business_type === "auto_rickshaw" || p.business_type === "pickup_goods"));
  if (!rows.length) return partners;
  await ensureSeats(env);
  const vs = ((await env.DB.prepare(
    "SELECT v.*, p.business_type FROM vehicles v JOIN travel_partners p ON p.id=v.partner_id WHERE v.verified=1 AND p.business_type IN ('auto_rickshaw','pickup_goods')"
  ).all()).results) || [];
  const ok = new Set(vs.filter((v) => vehicleLive(v, today, ed)).map((v) => v.partner_id));
  for (const p of rows) if (!ok.has(p.id)) p.verified = 0;
  return partners;
}

const BASE =
  "SELECT id, business_name, mobile1, mobile2, plan, plan_expires_at, COALESCE(current_lat, lat) AS lat, COALESCE(current_lon, lon) AS lon FROM travel_partners WHERE business_type=? AND verified=1 AND available=1";

async function ensureSeats(env) {
  try { await env.DB.prepare("ALTER TABLE vehicles ADD COLUMN seats INTEGER").run(); } catch (e) {}
}

/* Partners to alert for a new request. vclass may be null for older app versions (old behaviour). */
export async function eligiblePartners(env, businessType, vclass) {
  const partners = ((await env.DB.prepare(BASE).bind(businessType).all()).results) || [];
  const needVehicles = (businessType === "taxi_travel" && (vclass === "cab" || vclass === "carriage")) ||
    ((businessType === "auto_rickshaw" || businessType === "pickup_goods") && istToday() >= (await getEnforceDate(env)));
  if (!needVehicles) return partners;
  await ensureSeats(env);
  const vs = ((await env.DB.prepare(
    "SELECT * FROM vehicles WHERE verified=1 AND partner_id IN (SELECT id FROM travel_partners WHERE business_type=? AND verified=1 AND available=1)"
  ).bind(businessType).all()).results) || [];
  const today = istToday(), ed = await getEnforceDate(env);
  const ok = new Set();
  for (const v of vs) {
    v.business_type = businessType;
    if (!vehicleLive(v, today, ed)) continue;
    if (businessType === "taxi_travel" && vclassOf(v) !== vclass) continue;
    ok.add(v.partner_id);
  }
  return partners.filter((p) => ok.has(p.id));
}

/* Same rule for one partner (used when the partner opens or accepts an alert). */
export async function partnerMatches(env, partnerId, businessType, vclass) {
  if (businessType === "taxi_travel" && (!vclass || vclass === "agency")) return true;
  const needVehicles = (businessType === "taxi_travel") || istToday() >= (await getEnforceDate(env));
  if (!needVehicles) return true;
  await ensureSeats(env);
  const today = istToday(), ed = await getEnforceDate(env);
  const vs = (((await env.DB.prepare("SELECT * FROM vehicles WHERE verified=1 AND partner_id=?").bind(partnerId).all()).results) || [])
    .map((v) => ({ ...v, business_type: businessType })).filter((v) => vehicleLive(v, today, ed));
  if (businessType !== "taxi_travel") return vs.length > 0;
  return vs.some((v) => vclassOf(v) === vclass);
}
