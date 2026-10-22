/* functions/api/_devauth.js  (helper module, NOT a route)
   "Is the person who sent this request really the person they say they are?"
   Until now most owner actions (call logs, SOS, chat, business edits, push subscriptions ...) only looked at a MOBILE NUMBER sent
   in the request, and numbers of businesses are public - so knowing a number was enough. Now the phone sends two headers with every
   /api request (tc-devhdr.js):
        X-TC-Mobile : the mobile it is logged in with
        X-TC-Device : the device token this phone got at login
   and the server checks that this pair is a known, not blocked device of that mobile.
   SOFT MODE (default): a request that fails the check is still served, but counted in table devauth_soft (day, endpoint, reason)
   so the admin can see what would break before switching the check ON. Older apps that do not send the headers yet only show up there.
   ENFORCE MODE (flag enforce_device_auth = 1, switched in the app: Menu > Security): a failed check gets 403 {error:"device_unverified"}.
   Usage in an endpoint:
        const deny = await deviceCheck(env, request, "calls.post", [mobile]);   // [] / null = any logged-in user
        if (deny) return deny;
   NOTE: this step does not yet make a NEW device prove itself (the login still accepts any new device token) - that comes with the
   e-mail code step. It stops everybody who is not logged in as that number at all (no headers / unknown device). */
import { getFlag } from "./_flags.js";

const clean = (s, n) => String(s == null ? "" : s).trim().slice(0, n || 80);

/* small per-isolate memory so a burst of requests costs one lookup, not many (blocked users are shut out within ~30 s) */
const cache = new Map();
const CACHE_MS = 30000;
let flagAt = 0, flagVal = false;
let softReady = false;

export async function callerOf(env, request) {
  const mobile = clean(request.headers.get("X-TC-Mobile"), 20);
  const device = clean(request.headers.get("X-TC-Device"), 80);
  if (!mobile || !device) return { mobile: "", device: "", valid: false, why: "no_header" };
  const key = mobile + "|" + device;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.v;
  let v;
  try {
    const row = await env.DB.prepare("SELECT blocked, device_token FROM app_users WHERE mobile=?").bind(mobile).first();
    if (!row) v = { mobile, device, valid: false, why: "no_user" };
    else if (row.blocked) v = { mobile, device, valid: false, why: "blocked" };
    else if (row.device_token === device) v = { mobile, device, valid: true };
    else {
      let known = null;
      try { known = await env.DB.prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?").bind(mobile, device).first(); } catch (e) {}
      v = known ? { mobile, device, valid: true } : { mobile, device, valid: false, why: "unknown_device" };
    }
  } catch (e) {
    v = { mobile, device, valid: false, why: "lookup_error" };
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, { until: Date.now() + CACHE_MS, v });
  return v;
}

export async function enforcing(env) {
  if (Date.now() - flagAt < 20000) return flagVal;
  flagVal = await getFlag(env, "enforce_device_auth", false);
  flagAt = Date.now();
  return flagVal;
}
export function forgetFlagCache() { flagAt = 0; }

async function noteSoft(env, path, why) {
  try {
    if (!softReady) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS devauth_soft (day TEXT, path TEXT, why TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (day, path, why))").run();
      softReady = true;
    }
    const day = new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      "INSERT INTO devauth_soft (day, path, why, n) VALUES (?,?,?,1) ON CONFLICT(day, path, why) DO UPDATE SET n=n+1"
    ).bind(day, path, why).run();
  } catch (e) { /* counting is best effort */ }
}

/* allowed: array of mobile numbers the caller may act as (any of them), or null / [] = any valid logged-in user */
export async function deviceCheck(env, request, path, allowed) {
  const c = await callerOf(env, request);
  const list = Array.isArray(allowed) ? allowed.filter(Boolean).map(String) : [];
  let why = "";
  if (!c.valid) why = c.why;
  else if (list.length && !list.includes(c.mobile)) why = "mobile_mismatch";
  if (!why) return null;
  if (await enforcing(env)) {
    return Response.json({ ok: false, error: "device_unverified", why }, { status: 403 });
  }
  await noteSoft(env, path, why);
  return null;
}

/* admin screen: what the soft mode has seen in the last 3 days */
export async function softStats(env) {
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS devauth_soft (day TEXT, path TEXT, why TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (day, path, why))").run();
    const since = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const { results } = await env.DB.prepare("SELECT day, path, why, n FROM devauth_soft WHERE day>=? ORDER BY day DESC, n DESC LIMIT 60").bind(since).all();
    return results || [];
  } catch (e) { return []; }
}
