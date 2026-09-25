import { verifyAdminToken, createAdminSession } from "./_auth_helper.js";

/* GET ?action=users&token=...        — owner: list all logged-in users
   GET ?action=check&mobile=...&device=... — is this mobile OR this device blocked?
   GET ?action=lookup&mobile=...       — returns this mobile's own previously-saved
                                          name/location/pincode (if it has logged in
                                          before), so the login screen can pre-fill
                                          them for a returning user instead of asking
                                          again every time. No auth needed — this only
                                          returns what that person themselves already
                                          typed in on an earlier login, nothing new. */
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
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB
      .prepare(
        "SELECT id,name,mobile,email,location,pincode,role,first_login_at,last_login_at,login_count,blocked FROM app_users ORDER BY last_login_at DESC"
      )
      .all();
    return Response.json({ ok: true, users: results });
  }

  if (action === "check") {
    const mobile = url.searchParams.get("mobile");
    const device = url.searchParams.get("device");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" });

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
    if (!isCustomer && allowlistCount && allowlistCount.c > 0) {
      const allowed = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
      authorized = !!allowed;
    }
    return Response.json({ ok: true, blocked, authorized, isOwner: false });
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
    const override = await env.DB.prepare(
      "SELECT password FROM admin_password_override WHERE id=1"
    ).first().catch(() => null);
    const currentPassword = override ? override.password : env.ADMIN_PASSWORD;
    if (body.password !== currentPassword) {
      return Response.json({ ok: false, error: "wrong_password" }, { status: 401 });
    }
    const token = await createAdminSession(env);
    return Response.json({ ok: true, token });
  }

  /* Owner-only: lets the owner change the admin password from within the app
     instead of only via the Cloudflare dashboard secret. Stores it the same
     way — as a Cloudflare Secret would be checked — but since Workers can't
     rewrite their own secrets from inside a request, this instead stores an
     override in D1 that admin_login checks FIRST, falling back to the
     env.ADMIN_PASSWORD secret if no override row exists. */
  if (action === "admin_change_password") {
    if (!(await verifyAdminToken(env, body.token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!body.new_password || body.new_password.length < 4) {
      return Response.json({ ok: false, error: "password_too_short" }, { status: 400 });
    }
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS admin_password_override (id INTEGER PRIMARY KEY CHECK (id=1), password TEXT NOT NULL)"
    ).run();
    await env.DB.prepare(
      "INSERT INTO admin_password_override (id, password) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET password=excluded.password"
    ).bind(body.new_password).run();
    return Response.json({ ok: true });
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
    const skipAllowlist = isOwner || role === "customer";

    if (!skipAllowlist) {
      const allowlistCount = await env.DB.prepare("SELECT COUNT(*) AS c FROM authorized_users").first();
      if (allowlistCount && allowlistCount.c > 0) {
        const allowed = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
        if (!allowed) {
          return Response.json({ ok: false, error: "not_authorized" }, { status: 403 });
        }
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

    const now = new Date().toISOString();
    const email = (body.email || "").trim();
    const location = (body.location || "").trim();
    const pincode = (body.pincode || "").trim();
    const lat = (body.lat != null && body.lat !== "") ? Number(body.lat) : null;
    const lon = (body.lon != null && body.lon !== "") ? Number(body.lon) : null;
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

  return Response.json({ ok: false, error: "unknown_action" });
}
