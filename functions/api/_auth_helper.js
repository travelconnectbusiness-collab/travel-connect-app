/* The admin password now lives ONLY as a Cloudflare Secret (env.ADMIN_PASSWORD) — it is
   never sent to or stored in the browser. Instead, after a correct password check the
   server hands back a short-lived random session token, which the browser holds in
   sessionStorage and sends for further admin actions. This file verifies that token. */

export async function verifyAdminToken(env, token) {
  if (!token) return false;
  const row = await env.DB
    .prepare("SELECT expires_at FROM admin_sessions WHERE token=?")
    .bind(token)
    .first();
  if (!row) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

export async function createAdminSession(env) {
  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours
  await env.DB
    .prepare("INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?,?,?)")
    .bind(token, now.toISOString(), expires.toISOString())
    .run();
  return token;
}
