import { verifyAdminToken, createAdminSession } from "./_auth_helper.js";
import { getFlag, setFlag } from "./_flags.js";
import { softStats, forgetFlagCache } from "./_devauth.js";
import { loginGate, otpEnforcing, forgetOtpFlagCache, secLog, sendLoginCode, verifyLoginCode, securityInfo, revokeOthers, otpStats } from "./_loginotp.js";


/* ---------- BLOOD DONORS (optional, opt-in) ----------
   A user (customer or business owner - both live in app_users) may add a blood
   group and switch "available to donate" ON. Only while that switch is ON do
   their name, area and mobile number appear to other logged-in users who
   search by blood group. Switching OFF hides them again immediately.
   Because turning the switch ON exposes a mobile number, every blood action
   checks the DEVICE TOKEN that was recorded at login - knowing someone's
   mobile number alone is not enough to switch them on or read donor lists.
   A user row with no device token yet adopts the first one presented. */
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

async function bloodAuthUser(env, mobile, device) {
  mobile = (mobile || "").trim();
  device = (device || "").trim();
  if (!mobile || !device) return null;
  const row = await env.DB
    .prepare("SELECT mobile, name, blocked, device_token, blood_group, blood_donor FROM app_users WHERE mobile=?")
    .bind(mobile)
    .first();
  if (!row || row.blocked) return null;
  if (!row.device_token) {
    await env.DB.prepare("UPDATE app_users SET device_token=? WHERE mobile=?").bind(device, mobile).run();
    return row;
  }
  if (row.device_token === device) return row;
  /* The same person may use several devices (phone + another browser). Every
     login records its device in user_devices, so logging in somewhere else no
     longer locks the first device out. Wrapped in try/catch so nothing breaks
     before the table exists. */
  try {
    const known = await env.DB
      .prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?")
      .bind(mobile, device)
      .first();
    if (known) return row;
  } catch (e) {}
  return null;
}

/* GET ?action=users&token=...        — owner: list all logged-in users
   GET ?action=check&mobile=...&device=... — is this mobile OR this device blocked?
   GET ?action=lookup&mobile=...       — returns this mobile's own previously-saved
                                          name/location/pincode (if it has logged in
                                          before), so the login screen can pre-fill
                                          them for a returning user instead of asking
                                          again every time. No auth needed — this only
                                          returns what that person themselves already
                                          typed in on an earlier login, nothing new. */
/* app_mode: "app" once the person has ever opened Travel Connect as an
   installed app (home-screen / standalone), otherwise "web" (website only);
   NULL until they next open the app after this update. Adds the column the
   first time; the "duplicate column" error on later runs is swallowed. */
async function ensureAuthColumns(env) {
  try { await env.DB.prepare("ALTER TABLE app_users ADD COLUMN app_mode TEXT").run(); } catch (e) { /* exists */ }
}
async function recordAppMode(env, mobile, mode) {
  if (!mobile || (mode !== "app" && mode !== "web")) return;
  try {
    await env.DB
      .prepare("UPDATE app_users SET app_mode=CASE WHEN ?='app' THEN 'app' ELSE COALESCE(app_mode,'web') END WHERE mobile=?")
      .bind(mode, mobile)
      .run();
  } catch (e) {}
}

/* ---------- ADMIN PASSWORD (hashed, with a limit on wrong attempts) ----------
   Before: a password changed inside the app was stored as plain text in D1, any length of 4+ letters was accepted and wrong guesses
   were never limited. Now:
   - a changed password is stored only as a salted PBKDF2-SHA256 hash (table admin_password_hash); the old plain-text row is deleted
     the first time the old password is used (it is converted automatically), so nothing readable stays in the database;
   - at least 8 characters;
   - 5 wrong tries from one address (or 40 from all addresses together) -> locked for 15 minutes (table admin_login_fail);
   - expired admin sessions are cleaned out at every successful login.
   Order of checks: hashed password -> old plain-text override (converted) -> the Cloudflare secret ADMIN_PASSWORD. */
const ADMIN_ITER = 100000; /* the most Cloudflare Workers allow */
const ADMIN_LOCK_MS = 15 * 60 * 1000;
const b64 = (buf) => { let s = ""; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
const unb64 = (t) => { const s = atob(t), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
function sameText(a, b) {
  a = String(a == null ? "" : a); b = String(b == null ? "" : b);
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
async function hashPw(pw, saltBytes, iter) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: iter, hash: "SHA-256" }, base, 256);
  return b64(bits);
}
async function ensureAdminTables(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_password_hash (id INTEGER PRIMARY KEY CHECK (id=1), salt TEXT NOT NULL, hash TEXT NOT NULL, iter INTEGER NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_login_fail (ip TEXT, at INTEGER)").run();
}
async function storeAdminHash(env, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPw(pw, salt, ADMIN_ITER);
  await env.DB.prepare(
    "INSERT INTO admin_password_hash (id, salt, hash, iter) VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET salt=excluded.salt, hash=excluded.hash, iter=excluded.iter"
  ).bind(b64(salt), hash, ADMIN_ITER).run();
}
async function adminPasswordOk(env, pw) {
  if (typeof pw !== "string" || !pw) return false;
  const row = await env.DB.prepare("SELECT salt, hash, iter FROM admin_password_hash WHERE id=1").first().catch(() => null);
  if (row) return sameText(await hashPw(pw, unb64(row.salt), row.iter || ADMIN_ITER), row.hash);
  const old = await env.DB.prepare("SELECT password FROM admin_password_override WHERE id=1").first().catch(() => null);
  if (old && old.password) {
    if (!sameText(pw, old.password)) return false;
    /* convert: keep only the hash from now on */
    try { await storeAdminHash(env, pw); await env.DB.prepare("DELETE FROM admin_password_override WHERE id=1").run(); } catch (e) {}
    return true;
  }
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD !== "" && sameText(pw, env.ADMIN_PASSWORD);
}

/* OPEN REGISTRATION: when false, nobody needs to be on the "Authorized
   Users" allowlist any more - anyone can log in and register a business.
   Admin verification still decides the "Verified" badge customers see, and
   blocking still works. Set to true to bring the old allowlist back. */
const REQUIRE_ALLOWLIST = false;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "lookup") {
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!mobile) return Response.json({ ok: true, found: false });
    const row = await env.DB
      .prepare("SELECT name, location, pincode FROM app_users WHERE mobile=?")
      .bind(mobile)
      .first();
    if (!row) return Response.json({ ok: true, found: false });
    return Response.json({ ok: true, found: true, name: row.name, location: row.location, pincode: row.pincode });
  }

  if (action === "users") {
    await ensureAuthColumns(env);
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB
      .prepare(
        "SELECT id,name,mobile,email,location,pincode,role,first_login_at,last_login_at,login_count,blocked,app_mode FROM app_users ORDER BY last_login_at DESC"
      )
      .all();
    return Response.json({ ok: true, users: results });
  }

  /* admin: is the device check ON, and what did soft mode see lately? */
  if (action === "devauth_status") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    return Response.json({ ok: true, enforce: await getFlag(env, "enforce_device_auth", false), soft: await softStats(env), otp_enforce: await otpEnforcing(env), otp: await otpStats(env) });
  }

  if (action === "check") {
    const mobile = url.searchParams.get("mobile");
    const device = url.searchParams.get("device");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" });
    await ensureAuthColumns(env);
    await recordAppMode(env, mobile, url.searchParams.get("mode"));

    const ownerRow = await env.DB.prepare("SELECT mobile FROM app_owner WHERE id=1").first();
    if (ownerRow && ownerRow.mobile === mobile) {
      return Response.json({ ok: true, blocked: false, authorized: true, isOwner: true });
    }

    const row = await env.DB
      .prepare("SELECT blocked, role FROM app_users WHERE mobile=?")
      .bind(mobile)
      .first();
    let blocked = !!(row && row.blocked);
    if (!blocked && device) {
      const devRow = await env.DB
        .prepare("SELECT device_token FROM blocked_devices WHERE device_token=?")
        .bind(device)
        .first();
      if (devRow) blocked = true;
    }
    let authorized = true;
    const isCustomer = row && row.role === "customer";
    const allowlistCount = await env.DB.prepare("SELECT COUNT(*) AS c FROM authorized_users").first();
    /* The switch lives in Admin > Authorized Users (stored in the database). When ON, only listed numbers can be business owners. */
    if ((await getFlag(env, "require_allowlist", REQUIRE_ALLOWLIST)) && !isCustomer) {
      const allowed = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
      authorized = !!allowed;
    }
    return Response.json({ ok: true, blocked, authorized, isOwner: false });
  }


  /* GET ?action=my_blood&mobile=...&device=... - the caller's own blood settings */
  if (action === "my_blood") {
    const me = await bloodAuthUser(env, url.searchParams.get("mobile"), url.searchParams.get("device"));
    if (!me) return Response.json({ ok: false, error: "device_mismatch" }, { status: 403 });
    return Response.json({ ok: true, blood_group: me.blood_group || "", blood_donor: me.blood_donor ? 1 : 0 });
  }

  /* GET ?action=blood_donors&group=O+&mobile=...&device=... - donors of one blood
     group who have their switch ON. Requires a logged-in caller (device checked).
     Returns only what a person needs to contact a donor: name, area, mobile. */
  if (action === "blood_donors") {
    const me = await bloodAuthUser(env, url.searchParams.get("mobile"), url.searchParams.get("device"));
    if (!me) return Response.json({ ok: false, error: "device_mismatch" }, { status: 403 });
    const group = (url.searchParams.get("group") || "").trim().toUpperCase();
    if (!BLOOD_GROUPS.includes(group)) return Response.json({ ok: false, error: "invalid_group" }, { status: 400 });
    const { results } = await env.DB
      .prepare(
        "SELECT name, mobile, location, pincode, blood_group FROM app_users WHERE blood_donor=1 AND blood_group=? AND COALESCE(blocked,0)=0 AND mobile<>? ORDER BY name LIMIT 100"
      )
      .bind(group, me.mobile)
      .all();
    return Response.json({ ok: true, donors: results });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const action = body.action;

  if (action === "admin_login") {
    await ensureAdminTables(env);
    const ip = (request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
    const now = Date.now();
    await env.DB.prepare("DELETE FROM admin_login_fail WHERE at<?").bind(now - ADMIN_LOCK_MS).run().catch(() => {});
    const mine = await env.DB.prepare("SELECT COUNT(*) AS c FROM admin_login_fail WHERE ip=?").bind(ip).first();
    const all = await env.DB.prepare("SELECT COUNT(*) AS c FROM admin_login_fail").first();
    if ((mine && mine.c >= 5) || (all && all.c >= 40)) {
      return Response.json({ ok: false, error: "too_many_attempts", retry_minutes: 15 }, { status: 429 });
    }
    if (!(await adminPasswordOk(env, body.password))) {
      await env.DB.prepare("INSERT INTO admin_login_fail (ip, at) VALUES (?,?)").bind(ip, now).run().catch(() => {});
      return Response.json({ ok: false, error: "wrong_password" }, { status: 401 });
    }
    await env.DB.prepare("DELETE FROM admin_login_fail WHERE ip=?").bind(ip).run().catch(() => {});
    await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at<?").bind(new Date().toISOString()).run().catch(() => {});
    const token = await createAdminSession(env);
    return Response.json({ ok: true, token });
  }

  /* Owner-only: lets the owner change the admin password from within the app. It is stored only as a salted hash (see above). */
  if (action === "admin_change_password") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (typeof body.new_password !== "string" || body.new_password.length < 8) {
      return Response.json({ ok: false, error: "password_too_short" }, { status: 400 });
    }
    await ensureAdminTables(env);
    await storeAdminHash(env, body.new_password);
    await env.DB.prepare("DELETE FROM admin_password_override WHERE id=1").run().catch(() => {});
    return Response.json({ ok: true });
  }

  /* admin: switch the device check (enforce_device_auth) ON / OFF */
  if (action === "set_devauth") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await setFlag(env, "enforce_device_auth", !!body.on);
    forgetFlagCache();
    return Response.json({ ok: true, enforce: !!body.on });
  }

  /* admin: switch "new phone needs an e-mailed code" (enforce_device_otp) ON / OFF */
  if (action === "set_devotp") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await setFlag(env, "enforce_device_otp", !!body.on);
    forgetOtpFlagCache();
    return Response.json({ ok: true, otp_enforce: !!body.on });
  }

  /* new phone on a protected account: e-mailed code (see _loginotp.js) */
  if (action === "login_otp_send" || action === "login_otp_verify" || action === "security_info" || action === "revoke_others") {
    const r = action === "login_otp_send" ? await sendLoginCode(env, body)
      : action === "login_otp_verify" ? await verifyLoginCode(env, body)
      : action === "security_info" ? await securityInfo(env, body)
      : await revokeOthers(env, body);
    return Response.json(r.json, { status: r.status });
  }

  if (action === "login") {
    const name = (body.name || "").trim();
    const mobile = (body.mobile || "").trim();
    const deviceToken = (body.device_token || "").trim();
    const role = body.role === "customer" ? "customer" : "owner";
    if (!name || !mobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const ownerRow = await env.DB.prepare("SELECT mobile FROM app_owner WHERE id=1").first();
    const isOwner = !!(ownerRow && ownerRow.mobile === mobile);
    const skipAllowlist = !(await getFlag(env, "require_allowlist", REQUIRE_ALLOWLIST)) || isOwner || role === "customer";

    if (!skipAllowlist) {
      const allowed = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
      if (!allowed) {
        return Response.json({ ok: false, error: "not_authorized" }, { status: 403 });
      }
    }

    if (!isOwner && deviceToken) {
      const blockedDevice = await env.DB
        .prepare("SELECT device_token FROM blocked_devices WHERE device_token=?")
        .bind(deviceToken)
        .first();
      if (blockedDevice) {
        return Response.json({ ok: false, error: "blocked" }, { status: 403 });
      }
    }

    const existing = await env.DB
      .prepare("SELECT * FROM app_users WHERE mobile=?")
      .bind(mobile)
      .first();

    if (!isOwner && existing && existing.blocked) {
      return Response.json({ ok: false, error: "blocked" }, { status: 403 });
    }

    /* A protected account (verified e-mail) lets a NEW phone in only with the e-mailed code. Soft mode (default) only counts it. */
    const gate = await loginGate(env, mobile, deviceToken);
    if (gate.need) {
      if (await otpEnforcing(env)) {
        await secLog(env, mobile, "login_needs_code", "");
        return Response.json({ ok: false, error: "otp_required", hint: gate.hint }, { status: 403 });
      }
      await secLog(env, mobile, "would_require_code", "");
    }

    const now = new Date().toISOString();
    const email = (body.email || "").trim();
    const location = (body.location || "").trim();
    const pincode = (body.pincode || "").trim();
    const lat = (body.lat != null && body.lat !== "") ? Number(body.lat) : null;
    const lon = (body.lon != null && body.lon !== "") ? Number(body.lon) : null;
    /* the phone that was the account's main one keeps its trust when another phone logs in (its token is replaced below) */
    if (existing && existing.device_token && deviceToken && existing.device_token !== deviceToken) {
      try {
        await env.DB.prepare("INSERT OR IGNORE INTO user_devices (mobile, device_token, created_at) VALUES (?,?,?)").bind(mobile, existing.device_token, now).run();
      } catch (e) {}
    }
    if (existing) {
      await env.DB
        .prepare(
          "UPDATE app_users SET name=?, last_login_at=?, login_count=login_count+1, device_token=?, email=COALESCE(NULLIF(?,''),email), location=COALESCE(NULLIF(?,''),location), pincode=COALESCE(NULLIF(?,''),pincode), lat=COALESCE(?,lat), lon=COALESCE(?,lon) WHERE mobile=?"
        )
        .bind(name, now, deviceToken || existing.device_token || null, email, location, pincode, lat, lon, mobile)
        .run();
    } else {
      await env.DB
        .prepare(
          "INSERT INTO app_users (name,mobile,invite_token,first_login_at,last_login_at,login_count,blocked,device_token,email,location,pincode,lat,lon,role) VALUES (?,?,?,?,?,1,0,?,?,?,?,?,?,?)"
        )
        .bind(name, mobile, body.invite_token || null, now, now, deviceToken || null, email, location, pincode, lat, lon, role)
        .run();
    }

    await ensureAuthColumns(env);
    await recordAppMode(env, mobile, body.mode);
    /* remember this device for this mobile (several devices allowed) */
    if (deviceToken) {
      try {
        await env.DB
          .prepare("INSERT OR IGNORE INTO user_devices (mobile, device_token, created_at) VALUES (?,?,?)")
          .bind(mobile, deviceToken, now)
          .run();
      } catch (e) {}
    }

    if (body.invite_token) {
      const invite = await env.DB
        .prepare("SELECT * FROM invite_links WHERE token=?")
        .bind(body.invite_token)
        .first();
      if (invite && !invite.used_at) {
        await env.DB
          .prepare("UPDATE invite_links SET used_at=?, used_by_name=?, used_by_mobile=? WHERE token=?")
          .bind(now, name, mobile, body.invite_token)
          .run();
      }
    }

    return Response.json({ ok: true, name, mobile, isOwner });
  }

  if (action === "block" || action === "unblock") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await env.DB
      .prepare("UPDATE app_users SET blocked=? WHERE mobile=?")
      .bind(action === "block" ? 1 : 0, body.mobile)
      .run();

    const row = await env.DB
      .prepare("SELECT device_token FROM app_users WHERE mobile=?")
      .bind(body.mobile)
      .first();

    if (action === "block") {
      if (row && row.device_token) {
        const now = new Date().toISOString();
        await env.DB
          .prepare(
            "INSERT INTO blocked_devices (device_token, blocked_at, note) VALUES (?,?,?) ON CONFLICT(device_token) DO NOTHING"
          )
          .bind(row.device_token, now, "blocked via mobile " + body.mobile)
          .run();
      }
    } else {
      if (row && row.device_token) {
        await env.DB
          .prepare("DELETE FROM blocked_devices WHERE device_token=?")
          .bind(row.device_token)
          .run();
      }
    }
    return Response.json({ ok: true });
  }

  /* NEW — lets the admin correct a saved display name for any user (business
     owner or customer) without them needing to do it themselves. */
  if (action === "admin_update_user") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!body.mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB
      .prepare("UPDATE app_users SET name=? WHERE mobile=?")
      .bind((body.name || "").trim(), body.mobile)
      .run();
    return Response.json({ ok: true });
  }

  /* NEW — permanently removes a user's record (their saved name/location/
     login history). They can still log in again afterward as if brand new -
     this does not block them (use "block" for that); it only erases what's
     currently on file. */
  if (action === "admin_delete_user") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!body.mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB.prepare("DELETE FROM app_users WHERE mobile=?").bind(body.mobile).run();
    return Response.json({ ok: true });
  }

  if (action === "create_invite") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const token = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB
      .prepare(
        "INSERT INTO invite_links (token,recipient_name,recipient_mobile,created_at) VALUES (?,?,?,?)"
      )
      .bind(token, body.recipient_name || null, body.recipient_mobile || null, now)
      .run();
    return Response.json({ ok: true, token });
  }


  /* POST action=set_blood {mobile, device_token, blood_group, blood_donor}
     Saves the caller's OWN setting. Switching ON requires a valid blood group.
     blood_group may be saved while the switch is OFF (then nobody can see it). */
  if (action === "set_blood") {
    const me = await bloodAuthUser(env, body.mobile, body.device_token);
    if (!me) return Response.json({ ok: false, error: "device_mismatch" }, { status: 403 });
    const group = (body.blood_group || "").trim().toUpperCase();
    if (group && !BLOOD_GROUPS.includes(group)) {
      return Response.json({ ok: false, error: "invalid_group" }, { status: 400 });
    }
    const donor = body.blood_donor ? 1 : 0;
    if (donor && !group) {
      return Response.json({ ok: false, error: "group_required" }, { status: 400 });
    }
    await env.DB
      .prepare("UPDATE app_users SET blood_group=?, blood_donor=? WHERE mobile=?")
      .bind(group || null, donor, me.mobile)
      .run();
    return Response.json({ ok: true, blood_group: group, blood_donor: donor });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
