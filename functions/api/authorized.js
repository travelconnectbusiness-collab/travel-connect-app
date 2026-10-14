import { verifyAdminToken } from "./_auth_helper.js";
import { getFlag, setFlag } from "./_flags.js";

/* Category-scoped authorization, on top of the existing plain mobile
   allowlist above - lets the owner say "this number may register as Taxi
   and Auto Rickshaw", so the same number can't also self-register as (say)
   Restaurant without the owner deliberately adding that category too. A
   mobile with ZERO rows here is left unrestricted (matches the app's
   existing "empty allowlist = no restriction yet" pattern) - so this only
   starts enforcing once the owner actually grants at least one category to
   that specific number, and never silently locks out someone authorized
   before this feature existed. */
async function ensureCategoryTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS authorized_categories (mobile TEXT NOT NULL, category TEXT NOT NULL, added_at TEXT NOT NULL, PRIMARY KEY (mobile, category))"
  ).run();
}

/* GET ?action=list - returns every authorized mobile number (admin panel only).
   GET ?action=check&mobile=... - used by the login flow itself (auth.js) to
   check whether a given mobile is allowed to log in at all. Kept as a public,
   read-only, mobile-scoped check (no name/list data leaked) since the login
   screen needs to call it before a session exists.
   GET ?action=list_categories&mobile=... - public, mobile-scoped: which
   business categories (if any) this number is restricted to. An empty array
   means "not restricted to specific categories yet".
   GET ?action=check_category&mobile=...&category=... - public: is this
   mobile allowed to register under this specific category right now? */
export async function onRequestGet({ request, env }) {
  await ensureCategoryTable(env);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "check") {
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!mobile) return Response.json({ ok: false, allowed: false });
    const row = await env.DB.prepare("SELECT 1 FROM authorized_users WHERE mobile=?").bind(mobile).first();
    return Response.json({ ok: true, allowed: !!row });
  }

  if (action === "list") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { results } = await env.DB.prepare("SELECT mobile, name, added_at FROM authorized_users ORDER BY added_at DESC").all();
    /* Suggestion only (nothing is saved): the business categories each number has actually registered. */
    const reg = await env.DB.prepare("SELECT mobile1, business_type FROM travel_partners WHERE mobile1 IS NOT NULL AND mobile1<>'' AND business_type IS NOT NULL GROUP BY mobile1, business_type").all();
    const byMobile = {};
    for (const r of reg.results || []) (byMobile[r.mobile1] = byMobile[r.mobile1] || []).push(r.business_type);
    return Response.json({ ok: true, users: results.map((u) => ({ ...u, registered: byMobile[u.mobile] || [] })) });
  }

  if (action === "mode") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    return Response.json({ ok: true, require_allowlist: await getFlag(env, "require_allowlist", false) });
  }

  if (action === "list_categories") {
    const mobile = (url.searchParams.get("mobile") || "").trim();
    if (!mobile) return Response.json({ ok: true, categories: [] });
    const { results } = await env.DB.prepare("SELECT category FROM authorized_categories WHERE mobile=? ORDER BY category").bind(mobile).all();
    return Response.json({ ok: true, categories: results.map((r) => r.category) });
  }

  if (action === "check_category") {
    const mobile = (url.searchParams.get("mobile") || "").trim();
    const category = (url.searchParams.get("category") || "").trim();
    if (!mobile || !category) return Response.json({ ok: true, allowed: true });
    const countRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM authorized_categories WHERE mobile=?").bind(mobile).first();
    if (!countRow || countRow.c === 0) return Response.json({ ok: true, allowed: true, restricted: false });
    const row = await env.DB.prepare("SELECT 1 FROM authorized_categories WHERE mobile=? AND category=?").bind(mobile, category).first();
    return Response.json({ ok: true, allowed: !!row, restricted: true });
  }

  if (action === "get_owner") {
    if (!(await verifyAdminToken(env, url.searchParams.get("token")))) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const row = await env.DB.prepare("SELECT mobile, name FROM app_owner WHERE id=1").first();
    return Response.json({ ok: true, owner: row || null });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}

/* POST action=add / action=remove - admin-only (token required), adds or
   removes a mobile number from the allowlist. Matching at login time is by
   mobile number only (not name), per the owner's decision - a name typo or
   spelling difference should never lock out someone whose number IS allowed.
   POST action=add_category / action=remove_category - admin-only: grants or
   revokes one specific business category for one mobile number. */
export async function onRequestPost({ request, env }) {
  await ensureCategoryTable(env);
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ ok: false, error: "bad_json" }, { status: 400 }); }

  if (!(await verifyAdminToken(env, body.token))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (body.action === "add") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB
      .prepare("INSERT OR REPLACE INTO authorized_users (mobile, name, added_at) VALUES (?,?,?)")
      .bind(mobile, body.name || "", new Date().toISOString())
      .run();
    return Response.json({ ok: true });
  }

  /* The big switch: ON = only numbers on this list can be business owners; OFF = open registration. */
  if (body.action === "set_mode") {
    await setFlag(env, "require_allowlist", !!body.on);
    return Response.json({ ok: true, require_allowlist: !!body.on });
  }

  /* One tap: put every number that already owns a business on the list (existing entries and their categories are left untouched). */
  if (body.action === "add_all_owners") {
    const { results } = await env.DB.prepare("SELECT mobile1, MIN(owner_name) AS n FROM travel_partners WHERE mobile1 IS NOT NULL AND mobile1<>'' GROUP BY mobile1").all();
    const now = new Date().toISOString();
    let added = 0;
    for (const r of results) {
      const ex = await env.DB.prepare("SELECT 1 AS x FROM authorized_users WHERE mobile=?").bind(r.mobile1).first();
      if (ex) continue;
      await env.DB.prepare("INSERT INTO authorized_users (mobile, name, added_at) VALUES (?,?,?)").bind(r.mobile1, r.n || "", now).run();
      added++;
    }
    return Response.json({ ok: true, added });
  }

  /* Admin confirms: lock ONE number to the categories it has registered (only when the admin taps). */
  if (body.action === "confirm_registered") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    const { results } = await env.DB.prepare("SELECT DISTINCT business_type FROM travel_partners WHERE mobile1=? AND business_type IS NOT NULL").bind(mobile).all();
    const now = new Date().toISOString();
    for (const r of results) {
      await env.DB.prepare("INSERT OR REPLACE INTO authorized_categories (mobile, category, added_at) VALUES (?,?,?)").bind(mobile, r.business_type, now).run();
    }
    return Response.json({ ok: true, added: results.length });
  }

  /* Admin confirms: lock every listed number that has NO category yet to what it has registered. Numbers that already have categories are untouched. */
  if (body.action === "confirm_all_registered") {
    const { results } = await env.DB.prepare(
      "SELECT DISTINCT p.mobile1 AS mobile, p.business_type AS bt FROM travel_partners p WHERE p.business_type IS NOT NULL AND p.mobile1 IN (SELECT mobile FROM authorized_users) AND p.mobile1 NOT IN (SELECT mobile FROM authorized_categories)"
    ).all();
    const now = new Date().toISOString();
    let numbers = new Set();
    for (const r of results) {
      await env.DB.prepare("INSERT OR REPLACE INTO authorized_categories (mobile, category, added_at) VALUES (?,?,?)").bind(r.mobile, r.bt, now).run();
      numbers.add(r.mobile);
    }
    return Response.json({ ok: true, numbers: numbers.size });
  }

  if (body.action === "remove") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB.prepare("DELETE FROM authorized_users WHERE mobile=?").bind(mobile).run();
    await env.DB.prepare("DELETE FROM authorized_categories WHERE mobile=?").bind(mobile).run();
    return Response.json({ ok: true });
  }

  if (body.action === "add_category") {
    const mobile = (body.mobile || "").trim();
    const category = (body.category || "").trim();
    if (!mobile || !category) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    await env.DB
      .prepare("INSERT OR REPLACE INTO authorized_categories (mobile, category, added_at) VALUES (?,?,?)")
      .bind(mobile, category, new Date().toISOString())
      .run();
    return Response.json({ ok: true });
  }

  if (body.action === "remove_category") {
    const mobile = (body.mobile || "").trim();
    const category = (body.category || "").trim();
    if (!mobile || !category) return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
    await env.DB.prepare("DELETE FROM authorized_categories WHERE mobile=? AND category=?").bind(mobile, category).run();
    return Response.json({ ok: true });
  }

  if (body.action === "set_owner") {
    const mobile = (body.mobile || "").trim();
    if (!mobile) return Response.json({ ok: false, error: "missing_mobile" }, { status: 400 });
    await env.DB
      .prepare("INSERT INTO app_owner (id, mobile, name) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET mobile=excluded.mobile, name=excluded.name")
      .bind(mobile, body.name || "")
      .run();
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "unknown_action" });
}
