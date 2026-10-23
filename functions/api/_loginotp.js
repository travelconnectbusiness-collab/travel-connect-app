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
   E-MAIL FOR EVERY ACCOUNT (step 4): owners AND customers verify an e-mail with a code (email_otp_send / email_otp_verify); it is stored on
     app_users (email, email_verified). A brand-new account is created with email_required=1: the app then insists on verification, or on
     the person ticking "I accept the risk" (accept_email_risk, stored with its time in app_users.risk_accepted_at). Older accounts get a warning only.
     The e-mail of a business verified earlier (travel_partners) still counts as a verified e-mail.
   OTHER
     security_info  : a known phone asks "is my e-mail verified, how many phones are signed in"
     revoke_others  : a known phone signs out every other phone (the app uses it from Menu > My account security)
     security_log   : one line per event (code sent / wrong code / phone trusted / phones signed out / would-require). No codes, no e-mail text.
   Nothing here can read an owner's business data - it only decides whether a phone is trusted. */
import { getFlag } from "./_flags.js";
import { sendWebPush } from "./_webpush.js";

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
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS email_verify_otps (mobile TEXT PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_sent_at INTEGER NOT NULL, window_start INTEGER NOT NULL, sends_in_window INTEGER NOT NULL DEFAULT 1)"
  ).run();
  for (const c of ["email_verified INTEGER DEFAULT 0", "email_verified_at TEXT", "email_required INTEGER DEFAULT 0", "risk_accepted_at TEXT"]) {
    try { await env.DB.prepare("ALTER TABLE app_users ADD COLUMN " + c).run(); } catch (e) { /* already there */ }
  }
  ready = true;
}
export async function ensureEmailColumns(env) { await ensureTables(env); }

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

/* the verified e-mail of this mobile: the account's own (app_users) or, for older business owners, the business e-mail verified earlier */
export async function verifiedEmailOf(env, mobile) {
  mobile = clean(mobile, 20);
  if (!mobile) return null;
  try {
    await ensureTables(env);
    const u = await env.DB.prepare("SELECT email, email_verified FROM app_users WHERE mobile=?").bind(mobile).first();
    if (u && u.email_verified && String(u.email || "").trim()) return { partnerId: 0, email: String(u.email).trim().toLowerCase() };
  } catch (e) {}
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
  await ensureTables(env);
  const ve = await verifiedEmailOf(env, mobile);
  const u = await env.DB.prepare("SELECT email, email_required, risk_accepted_at FROM app_users WHERE mobile=?").bind(mobile).first();
  const must = !ve && !!(u && u.email_required) && !(u && u.risk_accepted_at);
  return { status: 200, json: { ok: true, email_verified: !!ve, email_hint: ve ? maskEmail(ve.email) : "", email_typed: !ve && u && u.email ? String(u.email) : "", must_verify: must, risk_accepted: !!(u && u.risk_accepted_at), devices: await deviceCount(env, mobile), enforce: await otpEnforcing(env) } };
}

/* POST email_otp_send {mobile, device_token, email}: a trusted phone asks for a code to prove an e-mail address */
export async function sendEmailCode(env, body) {
  await ensureTables(env);
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  const email = clean(body.email, 120).toLowerCase();
  if (!(await deviceKnown(env, mobile, device))) return { status: 403, json: { ok: false, error: "unauthorized" } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { status: 400, json: { ok: false, error: "bad_email" } };
  const now = Date.now();
  const row = await env.DB.prepare("SELECT * FROM email_verify_otps WHERE mobile=?").bind(mobile).first();
  let windowStart = now, sends = 1;
  if (row) {
    if (now - row.last_sent_at < OTP_COOLDOWN_MS) return { status: 429, json: { ok: false, error: "wait", retry_in: Math.ceil((OTP_COOLDOWN_MS - (now - row.last_sent_at)) / 1000) } };
    if (now - row.window_start < 3600000) {
      if (row.sends_in_window >= OTP_MAX_SENDS_PER_HOUR) return { status: 429, json: { ok: false, error: "too_many" } };
      windowStart = row.window_start; sends = row.sends_in_window + 1;
    }
  }
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const hash = await sha256Hex(`${mobile}:${email}:${code}`);
  await env.DB.prepare("INSERT OR REPLACE INTO email_verify_otps (mobile, email, code_hash, expires_at, attempts, last_sent_at, window_start, sends_in_window) VALUES (?,?,?,?,0,?,?,?)")
    .bind(mobile, email, hash, now + OTP_TTL_MS, now, windowStart, sends).run();
  const mail = await sendMail(
    env, email,
    "Travel Connect e-mail code " + code,
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222"><p>Your <b>Travel Connect</b> e-mail verification code is:</p><p style="font-size:30px;letter-spacing:6px;font-weight:700;margin:12px 0">${code}</p><p>Valid for 10 minutes. If you did not ask for this, ignore this e-mail.</p><p style="color:#666">നിങ്ങളുടെ Travel Connect ഇമെയിൽ വെരിഫിക്കേഷൻ കോഡ്: ${code} (10 മിനിറ്റ്).</p></div>`,
    `Your Travel Connect e-mail verification code is ${code}. Valid for 10 minutes.`
  );
  if (!mail.ok) {
    await env.DB.prepare("DELETE FROM email_verify_otps WHERE mobile=?").bind(mobile).run();
    await secLog(env, mobile, "email_code_send_failed", mail.error);
    return { status: mail.error === "email_not_configured" ? 503 : 502, json: { ok: false, error: mail.error } };
  }
  await secLog(env, mobile, "email_code_sent", "");
  return { status: 200, json: { ok: true } };
}

/* POST email_otp_verify {mobile, device_token, email, code}: right code -> the e-mail is VERIFIED on the account */
export async function verifyEmailCode(env, body) {
  await ensureTables(env);
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  const email = clean(body.email, 120).toLowerCase(), code = clean(body.code, 10);
  if (!(await deviceKnown(env, mobile, device))) return { status: 403, json: { ok: false, error: "unauthorized" } };
  const row = await env.DB.prepare("SELECT * FROM email_verify_otps WHERE mobile=?").bind(mobile).first();
  if (!row || row.email !== email) return { status: 400, json: { ok: false, error: "no_code" } };
  if (Date.now() > row.expires_at) {
    await env.DB.prepare("DELETE FROM email_verify_otps WHERE mobile=?").bind(mobile).run();
    return { status: 400, json: { ok: false, error: "expired" } };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await env.DB.prepare("DELETE FROM email_verify_otps WHERE mobile=?").bind(mobile).run();
    await secLog(env, mobile, "email_code_locked", "");
    return { status: 429, json: { ok: false, error: "too_many_attempts" } };
  }
  const hash = await sha256Hex(`${mobile}:${email}:${code}`);
  if (hash !== row.code_hash) {
    await env.DB.prepare("UPDATE email_verify_otps SET attempts=attempts+1 WHERE mobile=?").bind(mobile).run();
    await secLog(env, mobile, "email_code_wrong", "");
    return { status: 400, json: { ok: false, error: "wrong_code", attempts_left: OTP_MAX_ATTEMPTS - row.attempts - 1 } };
  }
  await env.DB.prepare("UPDATE app_users SET email=?, email_verified=1, email_verified_at=? WHERE mobile=?").bind(email, new Date().toISOString(), mobile).run();
  await env.DB.prepare("DELETE FROM email_verify_otps WHERE mobile=?").bind(mobile).run();
  await secLog(env, mobile, "email_verified", "");
  return { status: 200, json: { ok: true, email_hint: maskEmail(email) } };
}

/* POST accept_email_risk {mobile, device_token}: the person chooses to go on without a verified e-mail (kept with the time) */
export async function acceptEmailRisk(env, body) {
  await ensureTables(env);
  const mobile = clean(body.mobile, 20), device = clean(body.device_token, 80);
  if (!(await deviceKnown(env, mobile, device))) return { status: 403, json: { ok: false, error: "unauthorized" } };
  await env.DB.prepare("UPDATE app_users SET risk_accepted_at=? WHERE mobile=?").bind(new Date().toISOString(), mobile).run();
  await secLog(env, mobile, "risk_accepted", "");
  return { status: 200, json: { ok: true } };
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

/* ---------- reminder notification to accounts that have no verified e-mail yet (admin button) ----------
   Only phones that switched notifications ON can get it (push_subscriptions). People who ticked "I accept the risk" are left alone.
   At most one send per 20 hours. The message says what to do; the app then shows its own bar / box. */
const REMINDER_GAP_MS = 20 * 3600 * 1000;
const REMINDER_SQL =
  "SELECT s.endpoint, s.p256dh, s.auth, s.mobile FROM push_subscriptions s JOIN app_users u ON u.mobile = s.mobile " +
  "WHERE COALESCE(u.email_verified,0)=0 AND u.risk_accepted_at IS NULL AND COALESCE(u.blocked,0)=0 " +
  "AND NOT EXISTS (SELECT 1 FROM travel_partners p WHERE (p.mobile1=u.mobile OR p.mobile2=u.mobile) AND p.email_verified=1 AND COALESCE(p.email,'')<>'')";

export async function reminderStats(env) {
  try {
    await ensureTables(env);
    const { results } = await env.DB.prepare(REMINDER_SQL).all();
    const rows = results || [];
    const unv = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM app_users u WHERE COALESCE(u.email_verified,0)=0 AND COALESCE(u.blocked,0)=0 AND NOT EXISTS (SELECT 1 FROM travel_partners p WHERE (p.mobile1=u.mobile OR p.mobile2=u.mobile) AND p.email_verified=1 AND COALESCE(p.email,'')<>'')"
    ).first();
    const last = await env.DB.prepare("SELECT ts FROM security_log WHERE event='reminder_sent' ORDER BY ts DESC LIMIT 1").first();
    return { unverified_accounts: unv ? unv.c : 0, phones: rows.length, people: new Set(rows.map((r) => r.mobile)).size, last: last ? last.ts : 0, push_ready: !!env.VAPID_PRIVATE_JWK };
  } catch (e) { return { unverified_accounts: 0, phones: 0, people: 0, last: 0, push_ready: false }; }
}

export async function sendEmailReminder(env) {
  await ensureTables(env);
  if (!env.VAPID_PRIVATE_JWK) return { status: 503, json: { ok: false, error: "push_not_configured" } };
  const st = await reminderStats(env);
  if (st.last && Date.now() - st.last < REMINDER_GAP_MS) {
    return { status: 429, json: { ok: false, error: "too_soon", retry_minutes: Math.ceil((REMINDER_GAP_MS - (Date.now() - st.last)) / 60000) } };
  }
  const { results } = await env.DB.prepare(REMINDER_SQL).all();
  const subs = results || [];
  const payload = {
    type: "message",
    title: "\u{1F512} Protect your Travel Connect account",
    body: "Add and verify your e-mail so nobody can log in as you on another phone. \u0d07\u0d2e\u0d46\u0d2f\u0d3f\u0d32\u0d4d \u0d35\u0d46\u0d30\u0d3f\u0d2b\u0d48 \u0d1a\u0d46\u0d2f\u0d4d\u0d2f\u0d42.",
    tag: "tc-email-reminder",
    url: "/",
  };
  let sent = 0, failed = 0;
  for (let i = 0; i < subs.length; i += 10) {
    await Promise.all(subs.slice(i, i + 10).map(async (sub) => {
      try {
        const r = await sendWebPush(env, sub, payload);
        if (r.ok) sent++; else failed++;
        if (r.stale) await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint=?").bind(sub.endpoint).run();
      } catch (e) { failed++; }
    }));
  }
  await secLog(env, "", "reminder_sent", "sent " + sent + ", failed " + failed);
  return { status: 200, json: { ok: true, sent, failed, people: st.people } };
}
