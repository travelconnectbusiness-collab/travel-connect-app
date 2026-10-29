/* functions/api/admin_backup.js - admin "Download backup" (owner's Part 3 item): a copy of the app's data that the admin can keep.
   The phone (tc-admindata.js) asks table by table and page by page, and joins the answers into ONE .json file, so no single request is big
   (the free plan limits time and memory per request).
     POST /api/admin_backup  { token }                         -> { ok, tables:[{name, rows, skipped?}] }
     POST /api/admin_backup  { token, table, offset }          -> { ok, table, rows:[{...}], offset, next }   (next = null at the end; 200 rows per call)
   ADMIN ONLY (admin token). NO SECRETS: tables whose name looks like a login code / OTP / proof / session / push subscription / security log are listed as
   skipped and never read; in every other table the columns whose name has a word like token / hash / secret / password / code / otp / auth / (api_key, x_key)
   endpoint (pincode, rate_per_km ... are kept) are dropped from the rows. Table names come from sqlite_master (never from the request text), so nothing can be injected.
   The rule is by NAME because this file does not know every table - look at the first downloaded file once and tell if something private is in it. */
import { verifyAdminToken } from "./_auth_helper.js";
import { allowed } from "./_ratelimit.js";

const PAGE = 200;
const BAD_TABLE = /otp|code_|proof|session|secret|subscri|security_log|devauth|ratelimit|rate_limit|challenge/i;
const BAD_COL = /(^|_)(token|hash|secret|password|passwd|pass|otp|code|salt|auth|endpoint|p256dh)(_|$)|token|hash$|_key$|^key_|api_?key|private/i;   /* a plain column called key (flag / setting NAME) is kept */

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  if (!(await verifyAdminToken(env, body.token))) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!(await allowed(env, "admbk", 600, 3600))) return Response.json({ ok: false, error: "slow_down" }, { status: 429 });
  const list = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").all();
  const names = (list.results || []).map((r) => r.name);

  if (!body.table) {
    const tables = [];
    for (const n of names) {
      if (BAD_TABLE.test(n)) { tables.push({ name: n, rows: 0, skipped: true }); continue; }
      let rows = 0;
      try { const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM "' + n.replace(/"/g, '""') + '"').first(); rows = (c && c.n) || 0; } catch (e) {}
      tables.push({ name: n, rows });
    }
    return Response.json({ ok: true, tables });
  }

  const t = names.indexOf(String(body.table)) >= 0 ? String(body.table) : "";
  if (!t || BAD_TABLE.test(t)) return Response.json({ ok: false, error: "bad_table" }, { status: 400 });
  const off = Math.max(0, parseInt(body.offset, 10) || 0);
  const q = '"' + t.replace(/"/g, '""') + '"';
  const res = await env.DB.prepare("SELECT * FROM " + q + " LIMIT ? OFFSET ?").bind(PAGE + 1, off).all();
  const all = res.results || [];
  const more = all.length > PAGE;
  const rows = all.slice(0, PAGE).map((r) => {
    const o = {};
    for (const k of Object.keys(r)) if (!BAD_COL.test(k)) o[k] = r[k];
    return o;
  });
  return Response.json({ ok: true, table: t, rows, offset: off, next: more ? off + PAGE : null });
}
