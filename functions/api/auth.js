import { verifyAdminToken, createAdminSession } from "./_auth_helper.js";

/* GET ?action=users&token=...        — owner: list all logged-in users
   GET ?action=check&mobile=...&device=... — is this mobile OR this device blocked? */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "users") {
    const token = url.searchParams.get("token");
    if (!(await verifyAdminToken(env, token))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB
      .prepare(
        "SELECT id,name,mobile,first_login_at,last_login_at,login_count,blocked FROM app_users ORDER BY last_login_at DESC"
      )
      .all();
    return Response.json({ ok: true, users: results });
  }

  if (action === "check") {
    const mobile = url.searchParams.get("mobile");
    const device = url.searchParams.get("device");
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" });

    /* The owner's number always passes every check — never blocked, never
       needs to be on the allowlist. This is the safety net so the owner can
       never lock themselves out of their own app. */
    const ownerRow = await env.DB.prepare("SELECT mobile FROM app_owner WHERE id=1").first();
    if (ownerRow && ownerRow.mobile === mobile) {
      return Response.json({ ok: true, blocked: false, authorized: true });
    }

    const row = await env.DB
      .prepare("SELECT blocked FROM app_users WHERE mobile=?")
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
    /* Also re-checks the allowlist on every ongoing session (not just at the
       login moment) — so removing someone's number actually logs them out on
       their next check, not just prevents a brand-new login. Skipped entirely
       while the allowlist table is empty, same as at login. */
    let authorized = true;
    const allowlistCount = await env.DB.prepare("SELECT COUNT(*) AS c FROM authorized_users").first();
    if (allowlistCount && allowlistCount.c > 0) {
      const allowed = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
      authorized = !!allowed;
    }
    return Response.json({ ok: true, blocked, authorized });
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

  /* Checks the password (a Cloudflare Secret) — on success issues a temporary session
     token instead of ever sending the password itself back to the browser. */
  if (action === "admin_login") {
    if (body.password !== env.ADMIN_PASSWORD) {
      return Response.json({ ok: false, error: "wrong_password" }, { status: 401 });
    }
    const token = await createAdminSession(env);
    return Response.json({ ok: true, token });
  }

  /* Anyone can call this — it just records who is using the app on which device
     (not SMS-verified). A blocked mobile OR a blocked device is rejected immediately,
     even if the person types in a brand-new name/mobile from the same device.
     NEW: the mobile number must also be present in the authorized_users allowlist
     (added by the owner) — if the allowlist table is completely empty, this check
     is skipped entirely, so the app keeps working exactly as before until the owner
     actually starts using the allowlist feature. */
  if (action === "login") {
    const name = (body.name || "").trim();
    const mobile = (body.mobile || "").trim();
    const deviceToken = (body.device_token || "").trim();
    if (!name || !mobile) {
      return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    /* The owner's number always skips the allowlist check entirely. */
    const ownerRow = await env.DB.prepare("SELECT mobile FROM app_owner WHERE id=1").first();
    const isOwner = !!(ownerRow && ownerRow.mobile === mobile);

    if (!isOwner) {
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
    if (existing) {
      await env.DB
        .prepare(
          "UPDATE app_users SET name=?, last_login_at=?, login_count=login_count+1, device_token=? WHERE mobile=?"
        )
        .bind(name, now, deviceToken || existing.device_token || null, mobile)
        .run();
    } else {
      await env.DB
        .prepare(
          "INSERT INTO app_users (name,mobile,invite_token,first_login_at,last_login_at,login_count,blocked,device_token) VALUES (?,?,?,?,?,1,0,?)"
        )
        .bind(name, mobile, body.invite_token || null, now, now, deviceToken || null)
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

    return Response.json({ ok: true, name, mobile });
  }

  /* Owner-only: blocking a mobile ALSO blocks the device token last used by that
     mobile (if any is on record), so the same phone can't just re-register with a
     different name/number to get back in immediately. */
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
      /* unblock: also lift the device-level block for this device, otherwise the
         phone stays locked out even though the mobile number itself was cleared. */
      if (row && row.device_token) {
        await env.DB
          .prepare("DELETE FROM blocked_devices WHERE device_token=?")
          .bind(row.device_token)
          .run();
      }
    }
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
