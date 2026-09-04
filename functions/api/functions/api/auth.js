const ADMIN_PASSWORD = "Krishna@123";

/* GET ?action=users&password=... — owner-only list of everyone who has ever logged in,
   with their contact details and block status. Used by the Admin "Logged-in Users" panel. */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "users") {
    const password = url.searchParams.get("password");
    if (password !== ADMIN_PASSWORD) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB
      .prepare(
        "SELECT id,name,mobile,first_login_at,last_login_at,login_count,blocked FROM app_users ORDER BY last_login_at DESC"
      )
      .all();
    return Response.json({ ok: true, users: results });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const action = body.action;

  /* Anyone can call this — it just records who is using the app (self-declared name/mobile,
     not SMS-verified). A blocked mobile number is rejected here before any session is granted. */
  if (action === "login") {
    const name = (body.name || "").trim();
    const mobile = (body.mobile || "").trim();
    if (!name || !mobile) {
      return Response.json({ ok: false, error: "name_mobile_required" }, { status: 400 });
    }

    const existing = await env.DB
      .prepare("SELECT * FROM app_users WHERE mobile=?")
      .bind(mobile)
      .first();

    if (existing && existing.blocked) {
      return Response.json({ ok: false, error: "blocked" }, { status: 403 });
    }

    const now = new Date().toISOString();
    if (existing) {
      await env.DB
        .prepare("UPDATE app_users SET name=?, last_login_at=?, login_count=login_count+1 WHERE mobile=?")
        .bind(name, now, mobile)
        .run();
    } else {
      await env.DB
        .prepare(
          "INSERT INTO app_users (name,mobile,invite_token,first_login_at,last_login_at,login_count) VALUES (?,?,?,?,?,1)"
        )
        .bind(name, mobile, body.invite_token || null, now, now)
        .run();
    }

    /* If this login came from a one-time invite link, mark that link as used
       (by whom, and when) so it can't be silently reused by someone else later. */
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

  if (action === "block" || action === "unblock") {
    if (body.password !== ADMIN_PASSWORD) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    await env.DB
      .prepare("UPDATE app_users SET blocked=? WHERE mobile=?")
      .bind(action === "block" ? 1 : 0, body.mobile)
      .run();
    return Response.json({ ok: true });
  }

  if (action === "create_invite") {
    if (body.password !== ADMIN_PASSWORD) {
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

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}
