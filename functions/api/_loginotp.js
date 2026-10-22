/* functions/api/_loginotp.js  (helper module, NOT a route)
   "A NEW phone may log in to a protected account only with a code e-mailed to the owner's VERIFIED e-mail address."
   Until now a mobile number + a name was enough to log in as anybody, on any phone, and business numbers are public.
   WHAT IS PROTECTED
     An account is "protected" when its mobile belongs to a business (travel_partners mobile1 / mobile2) whose e-mail was verified
     with a code (travel_partners.email_verified = 1). Accounts without a verified e-mail stay open exactly as before - the app
     tells those owners (login page + dashboard) that full privacy needs a verified e-mail.
   WHAT HAPPENS ON A NEW PHONE
     login (auth.js) -> loginGate(): protected account + at least one phone already known + this phone not known
        enforce OFF (default, "soft"): the login still works; the event "would_require_code" is counted in security_log
        enforce ON  (flag enforce_device_otp, switched in Menu > Security): login answers 403 {error:"otp_required", hint:"k***@gmail.com"}
     the phone then calls login_otp_send (e-mails a 6-digit code, 10 minutes, 5 tries, 1 per minute, 5 per hour) and
     login_otp_verify (right code -> this phone is added to user_devices) and repeats the login, which now passes.
   OTHER
     security_info  : a known phone asks "is my e-mail verified, how many phones are signed in"
     revoke_others  : a known phone signs out every other phone (the app uses it from Menu > My account security)
     security_log   : one line per event (code sent / wrong code / phone trusted / phones signed out / would-require). No codes, no e-mail text.
   Nothing here can read an owner's business data - it only decides whether a phone is trusted. */
import { getFlag } from "./_flags.js";

const clean = (s, n) => String(s == null ? "" : s).trim().slice(0, n || 80);
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS login_otps (mobile TEXT PRIMARY KEY, device_token TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_sent_at INTEGER NOT NULL, window_start INTEGER NOT NULL, sends_in_window INTEGER NOT NULL DEFAULT 1)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS security_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, mobile TEXT, event TEXT NOT NULL, detail TEXT)"
  ).run();
  ready = true;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function secLog(env, mobile, event, detail) {
  try {
    await ensureTables(env);
    await env.DB.prepare("INSERT INTO security_log (ts, mobile, event, detail) VALUES (?,?,?,?)")
      .bind(Date.now(), clean(mobile, 20), clean(event, 40), clean(detail, 120)).run();
    if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM security_log WHERE ts<?").bind(Date.now() - 90 * 86400000).run();
  } catch (e) { /* logging is best effort */ }
}

/* per-isolate memory of the switch (20 s) */
let flagAt = 0, flagVal = false;
export async function otpEnforcing(env) {
  if (Date.now() - flagAt < 20000) return flagVal;
  flagVal = await getFlag(env, "enforce_device_otp", false);
  flagAt = Date.now();
  return flagVal;
}
export function forgetOtpFlagCache() { flagAt = 0; }

/* the verified e-mail of this mobile (business owner), or null */
export async function verifiedEmailOf(env, mobile) {
  mobile = clean(mobile, 20);
  if (!mobile) return null;
  try {
    const r = await env.DB.prepare(
      "SELECT id, email FROM travel_partners WHERE (mobile1=? OR mobile2=?) AND email_verified=1 AND COALESCE(email,'')<>'' ORDER BY id LIMIT 1"
    ).bind(mobile, mobile).first();
    return r ? { partnerId: r.id, email: String(r.email).trim().toLowerCase() } : null;
  } catch (e) { return null; }
}

export function maskEmail(email) {
  const s = String(email || ""), at = s.indexOf("@");
  if (at < 1) return "";
  return s.slice(0, 1) + "***" + s.slice(at);
}

/* is this phone already trusted for this mobile? (blocked accounts are never trusted) */
export async function deviceKnown(env, mobile, device) {
  mobile = clean(mobile, 20); device = clean(device, 80);
  if (!mobile || !device) return false;
  const u = await env.DB.prepare("SELECT device_token, blocked FROM app_users WHERE mobile=?").bind(mobile).first();
  if (!u || u.blocked) return false;
  if (u.device_token === device) return true;
  try {
    const k = await env.DB.prepare("SELECT 1 AS ok FROM user_devices WHERE mobile=? AND device_token=?").bind(mobile, device).first();
    return !!k;
  } catch (e) { return false; }
}

async function deviceCount(env, mobile) {
  const set = new Set();
  try {
    const u = await env.DB.prepare("SELECT device_token FROM app_users WHERE mobile=?").bind(mobile).first();
    if (u && u.device_token) set.add(u.device_token);
    const { results } = await env.DB.prepare("SELECT device_token FROM user_devices WHERE mobile=?").bind(mobile).all();
    (results || []).forEach((r) => r.device_token && set.add(r.device_token));
  } catch (e) {}
  return set.size;
}

/* the decision used by login: need = true when a code is required (the caller decides soft / enforce) */
export async function loginGate(env, mobile, device) {
  const ve = await verifiedEmailOf(env, mobile);
  if (!ve) return { need: false };
  if ((await deviceCount(env, clean(mobile, 20))) === 0) return { need: false };   /* first phone of the account */
  if (device && (await deviceKnown(env, mobile, device))) return { need: false };
  return { need: true, hint: maskEmail(ve.email), email: ve.email };
}

async function sendMail(env, to, subject, html, text) {
  if (!env.RESEND_API_KEY) return { ok: false, error: "email_not_configured" };
  const from = env.MAIL_FROM || "Travel Connect <no-reply@travelconnect.dev>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!r.ok) return { ok: false, error: "email_send_failed" };
    return { ok: true };
  } catch (e) { return { ok: false, error: "email_send_failed" }; }
}

/* POST login_otp_send {mobile, device_token} */
export async function sendLoginCode(env, body) {
  await ensureTables(env);
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!mobile || !device) return { status: 400, json: { ok: false, error: "bad_request" } };
  const gate = await loginGate(env, mobile, device);
  if (!gate.need) return { status: 200, json: { ok: true, not_needed: true } };
  const now = Date.now();
  const row = await env.DB.prepare("SELECT * FROM login_otps WHERE mobile=?").bind(mobile).first();
  let windowStart = now, sends = 1;
  if (row) {
    if (now - row.last_sent_at < OTP_COOLDOWN_MS) {
      return { status: 429, json: { ok: false, error: "wait", retry_in: Math.ceil((OTP_COOLDOWN_MS - (now - row.last_sent_at)) / 1000), hint: gate.hint } };
    }
    if (now - row.window_start < 3600000) {
      if (row.sends_in_window >= OTP_MAX_SENDS_PER_HOUR) return { status: 429, json: { ok: false, error: "too_many", hint: gate.hint } };
      windowStart = row.window_start;
      sends = row.sends_in_window + 1;
    }
  }
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const hash = await sha256Hex(`${mobile}:${device}:${code}`);
  await env.DB.prepare("INSERT OR REPLACE INTO login_otps (mobile, device_token, code_hash, expires_at, attempts, last_sent_at, window_start, sends_in_window) VALUES (?,?,?,?,0,?,?,?)")
    .bind(mobile, device, hash, now + OTP_TTL_MS, now, windowStart, sends).run();
  const mail = await sendMail(
    env, gate.email,
    "Travel Connect login code " + code,
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222"><p>Someone is logging in to <b>Travel Connect</b> with your mobile number <b>${mobile.replace(/[^0-9+]/g, "")}</b> on a <b>new phone</b>. Your code is:</p><p style="font-size:30px;letter-spacing:6px;font-weight:700;margin:12px 0">${code}</p><p>It is valid for 10 minutes. <b>If this was not you, do not share this code</b> - nobody can log in to your account without it.</p><p style="color:#666">നിങ്ങളുടെ മൊബൈൽ നമ്പർ ഉപയോഗിച്ച് ഒരു പുതിയ ഫോണിൽ Travel Connect ലോഗിൻ ചെയ്യാൻ ശ്രമിക്കുന്നു. കോഡ്: ${code} (10 മിനിറ്റ്). നിങ്ങളല്ലെങ്കിൽ ഈ കോഡ് ആരുമായും പങ്കുവയ്ക്കരുത്.</p></div>`,
    `Your Travel Connect login code for a new phone is ${code}. Valid for 10 minutes. If this was not you, do not share it.`
  );
  if (!mail.ok) {
    await env.DB.prepare("DELETE FROM login_otps WHERE mobile=?").bind(mobile).run();
    await secLog(env, mobile, "code_send_failed", mail.error);
    return { status: mail.error === "email_not_configured" ? 503 : 502, json: { ok: false, error: mail.error, hint: gate.hint } };
  }
  await secLog(env, mobile, "code_sent", "");
  return { status: 200, json: { ok: true, hint: gate.hint } };
}

/* POST login_otp_verify {mobile, device_token, code} -> the phone becomes trusted */
export async function verifyLoginCode(env, body) {
  await ensureTables(env);
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80), code = clean(body.code, 10);
  if (!mobile || !device || !code) return { status: 400, json: { ok: false, error: "bad_request" } };
  const row = await env.DB.prepare("SELECT * FROM login_otps WHERE mobile=?").bind(mobile).first();
  if (!row || row.device_token !== device) return { status: 400, json: { ok: false, error: "no_code" } };
  if (Date.now() > row.expires_at) {
    await env.DB.prepare("DELETE FROM login_otps WHERE mobile=?").bind(mobile).run();
    return { status: 400, json: { ok: false, error: "expired" } };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await env.DB.prepare("DELETE FROM login_otps WHERE mobile=?").bind(mobile).run();
    await secLog(env, mobile, "code_locked", "too many wrong codes");
    return { status: 429, json: { ok: false, error: "too_many_attempts" } };
  }
  const hash = await sha256Hex(`${mobile}:${device}:${code}`);
  if (hash !== row.code_hash) {
    await env.DB.prepare("UPDATE login_otps SET attempts=attempts+1 WHERE mobile=?").bind(mobile).run();
    await secLog(env, mobile, "code_wrong", "");
    return { status: 400, json: { ok: false, error: "wrong_code", attempts_left: OTP_MAX_ATTEMPTS - row.attempts - 1 } };
  }
  await env.DB.prepare("DELETE FROM login_otps WHERE mobile=?").bind(mobile).run();
  try {
    await env.DB.prepare("INSERT OR IGNORE INTO user_devices (mobile, device_token, created_at) VALUES (?,?,?)").bind(mobile, device, new Date().toISOString()).run();
  } catch (e) {}
  await secLog(env, mobile, "device_trusted", "");
  return { status: 200, json: { ok: true } };
}

/* POST security_info {mobile, device_token}  (a trusted phone only) */
export async function securityInfo(env, body) {
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return { status: 403, json: { ok: false, error: "unauthorized" } };
  const ve = await verifiedEmailOf(env, mobile);
  return { status: 200, json: { ok: true, email_verified: !!ve, email_hint: ve ? maskEmail(ve.email) : "", devices: await deviceCount(env, mobile), enforce: await otpEnforcing(env) } };
}

/* POST revoke_others {mobile, device_token}: every phone except this one is signed out */
export async function revokeOthers(env, body) {
  await ensureTables(env);
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return { status: 403, json: { ok: false, error: "unauthorized" } };
  const before = await deviceCount(env, mobile);
  await env.DB.prepare("DELETE FROM user_devices WHERE mobile=? AND device_token<>?").bind(mobile, device).run();
  await env.DB.prepare("INSERT OR IGNORE INTO user_devices (mobile, device_token, created_at) VALUES (?,?,?)").bind(mobile, device, new Date().toISOString()).run();
  await env.DB.prepare("UPDATE app_users SET device_token=? WHERE mobile=?").bind(device, mobile).run();
  await env.DB.prepare("DELETE FROM login_otps WHERE mobile=?").bind(mobile).run();
  await secLog(env, mobile, "signed_out_others", "phones before: " + before);
  return { status: 200, json: { ok: true, removed: Math.max(0, before - 1) } };
}

/* admin screen: what the last 3 days saw */
export async function otpStats(env) {
  try {
    await ensureTables(env);
    const since = Date.now() - 3 * 86400000;
    const { results } = await env.DB.prepare("SELECT event, COUNT(*) AS n FROM security_log WHERE ts>=? GROUP BY event ORDER BY n DESC").bind(since).all();
    return results || [];
  } catch (e) { return []; }
}
