/* functions/api/partner_media.js  (helper module - used by partners.js, NOT a route of its own)
   Extra "shop window" for a business, depending on its plan:
     Plus and above (shop / store only) : ONE shop photo
     Premium (every category)           : TWO small ad posts (picture + short text) and social links
                                          (Instagram, Facebook, YouTube, Google)
   No video files are stored: a video is simply a YouTube / Instagram / Facebook link.
   Zero cost design: pictures are shrunk on the phone first (tc-img.js), limited to 3 MB here, a replaced or removed
   picture is DELETED from the storage at once, deleting a business removes them too, and every picture is served
   with a long browser cache (the address changes when the picture changes).
   Plan rule is checked on every save AND every view, so a lapsed plan simply hides the extras (nothing is lost). */

import { deviceCheck } from "./_devauth.js";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_CAPTION = 120;
const KINDS = ["photo", "post1", "post2"];
const LINK_HOSTS = {
  instagram: ["instagram.com", "instagr.am"],
  facebook: ["facebook.com", "fb.com", "fb.me", "fb.watch"],
  youtube: ["youtube.com", "youtu.be"],
  google: ["google.com", "goo.gl", "g.page", "g.co", "share.google", "page.link"],
};
const j = (o, s) => Response.json(o, s ? { status: s } : undefined);

let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS partner_media (
      partner_id INTEGER PRIMARY KEY,
      photo_key TEXT, post1_key TEXT, post1_text TEXT, post2_key TEXT, post2_text TEXT,
      instagram TEXT, facebook TEXT, youtube TEXT, google TEXT,
      updated_at TEXT
    )`
  ).run();
  ready = true;
}

/* 0 = Free, 1 = Plus, 2 = Premium (same rules as the rest of the app; a lapsed plan counts as Free) */
export function planLevel(p) {
  if (!p) return 0;
  const running = !p.plan_expires_at || new Date(p.plan_expires_at).getTime() > Date.now();
  if (p.plan === "owner_free") return 2;
  if (p.plan === "premium" && running) return 2;
  if (p.plan === "owner_plus") return 1;
  if (p.plan === "paid" && running) return 1;
  return 0;
}
const canPhoto = (p) => p && p.business_type === "shop" && planLevel(p) >= 1;
const canExtras = (p) => planLevel(p) >= 2;

function cleanLink(kind, v) {
  let s = String(v == null ? "" : v).trim();
  if (!s) return "";
  if (s.length > 300) return false;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch (e) { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();
  if (!LINK_HOSTS[kind].some((h) => host === h || host.endsWith("." + h))) return false;
  u.protocol = "https:";
  return u.toString();
}

async function owner(env, partnerId, mobile) {
  const p = await env.DB.prepare("SELECT id, business_type, plan, plan_expires_at, mobile1, mobile2 FROM travel_partners WHERE id=?").bind(partnerId).first();
  if (!p || !mobile || (p.mobile1 !== mobile && p.mobile2 !== mobile)) return null;
  return p;
}
async function rowOf(env, partnerId) {
  return (await env.DB.prepare("SELECT * FROM partner_media WHERE partner_id=?").bind(partnerId).first()) || {};
}
async function save(env, partnerId, fields) {
  await env.DB.prepare("INSERT OR IGNORE INTO partner_media (partner_id) VALUES (?)").bind(partnerId).run();
  const keys = Object.keys(fields);
  await env.DB
    .prepare(`UPDATE partner_media SET ${keys.map((k) => k + "=?").join(",")}, updated_at=? WHERE partner_id=?`)
    .bind(...keys.map((k) => fields[k]), new Date().toISOString(), partnerId)
    .run();
}
/* one storage call; only our own folder */
async function dropFiles(env, keys) {
  const list = (keys || []).filter((k) => k && String(k).startsWith("partners/"));
  if (list.length) { try { await env.FILES.delete(list); } catch (e) { /* harmless */ } }
}
const stamp = (r) => (r && r.updated_at ? Date.parse(r.updated_at) || 0 : 0);

/* ---------- GET: media_mine (owner) and media_image (public) ---------- */
export async function mediaGet(env, action, url, request) {
  if (action !== "media_mine" && action !== "media_image") return null;
  await ensure(env);
  if (action === "media_mine") {
    const partnerId = Number(url.searchParams.get("partner_id"));
    const p = await owner(env, partnerId, (url.searchParams.get("mobile") || "").trim());
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    if (request) { const deny = await deviceCheck(env, request, "media.mine", [(url.searchParams.get("mobile") || "").trim()]); if (deny) return deny; }
    const m = await rowOf(env, partnerId);
    return j({
      ok: true,
      level: planLevel(p),
      business_type: p.business_type,
      can_photo: !!canPhoto(p),
      can_extras: !!canExtras(p),
      v: stamp(m),
      photo: !!m.photo_key,
      posts: [1, 2].map((n) => ({ n, has: !!m["post" + n + "_key"], text: m["post" + n + "_text"] || "" })),
      links: { instagram: m.instagram || "", facebook: m.facebook || "", youtube: m.youtube || "", google: m.google || "" },
    });
  }
  const partnerId = Number(url.searchParams.get("partner_id"));
  const kind = url.searchParams.get("kind") === "post" ? "post" + (url.searchParams.get("n") === "2" ? "2" : "1") : "photo";
  if (!partnerId) return j({ ok: false, error: "missing_partner_id" }, 400);
  const row = await env.DB
    .prepare(
      `SELECT p.business_type, p.plan, p.plan_expires_at, m.photo_key, m.post1_key, m.post2_key
       FROM travel_partners p JOIN partner_media m ON m.partner_id=p.id WHERE p.id=?`
    )
    .bind(partnerId)
    .first();
  const key = row && row[kind + "_key"];
  const allowed = row && (kind === "photo" ? canPhoto(row) : canExtras(row));
  if (!key || !allowed) return j({ ok: false, error: "not_found" }, 404);
  const obj = await env.FILES.get(key);
  if (!obj) return j({ ok: false, error: "not_found" }, 404);
  return new Response(obj.body, {
    headers: { "content-type": (obj.httpMetadata && obj.httpMetadata.contentType) || "image/jpeg", "cache-control": "public, max-age=86400" },
  });
}

/* ---------- POST: media_upload (multipart), media_links / media_remove (JSON) ---------- */
export async function mediaPost(request, env, urlAction) {
  if (urlAction !== "media_upload" && urlAction !== "media_links" && urlAction !== "media_remove") return null;
  await ensure(env);

  if (urlAction === "media_upload") {
    let form;
    try { form = await request.formData(); } catch (e) { return j({ ok: false, error: "bad_form" }, 400); }
    const partnerId = Number(form.get("partner_id"));
    const kind = String(form.get("kind") || "");
    if (!KINDS.includes(kind)) return j({ ok: false, error: "bad_kind" }, 400);
    const p = await owner(env, partnerId, String(form.get("mobile") || "").trim());
    if (!p) return j({ ok: false, error: "unauthorized" }, 403);
    { const deny = await deviceCheck(env, request, "media.upload", [String(form.get("mobile") || "").trim()]); if (deny) return deny; }
    if (kind === "photo" ? !canPhoto(p) : !canExtras(p)) return j({ ok: false, error: kind === "photo" ? "not_plus" : "not_premium" }, 403);
    const old = await rowOf(env, partnerId);
    const fields = {};
    const file = form.get("media_image");
    let replaced = null;
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type || "")) return j({ ok: false, error: "not_image" }, 400);
      const buf = await file.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) return j({ ok: false, error: "too_big" }, 413);
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const key = `partners/${partnerId}/${kind}-${Date.now()}.${ext}`;
      await env.FILES.put(key, buf, { httpMetadata: { contentType: file.type } });
      fields[kind + "_key"] = key;
      replaced = old[kind + "_key"] || null;
    } else if (kind === "photo") {
      return j({ ok: false, error: "no_file" }, 400);
    }
    if (kind !== "photo" && form.has("caption")) fields[kind + "_text"] = String(form.get("caption") || "").trim().slice(0, MAX_CAPTION);
    if (!Object.keys(fields).length) return j({ ok: false, error: "nothing_to_save" }, 400);
    if (kind !== "photo" && !fields[kind + "_key"] && !old[kind + "_key"]) return j({ ok: false, error: "add_picture_first" }, 400);
    await save(env, partnerId, fields);
    if (replaced) await dropFiles(env, [replaced]); /* the replaced picture is deleted from the storage */
    return j({ ok: true });
  }

  let body;
  try { body = await request.json(); } catch (e) { return j({ ok: false, error: "invalid_json" }, 400); }
  const partnerId = Number(body.partner_id);
  const p = await owner(env, partnerId, String(body.mobile || "").trim());
  if (!p) return j({ ok: false, error: "unauthorized" }, 403);
  { const deny = await deviceCheck(env, request, "media.edit", [String(body.mobile || "").trim()]); if (deny) return deny; }

  if (urlAction === "media_links") {
    if (!canExtras(p)) return j({ ok: false, error: "not_premium" }, 403);
    const fields = {};
    for (const k of Object.keys(LINK_HOSTS)) {
      if (body[k] === undefined) continue;
      const c = cleanLink(k, body[k]);
      if (c === false) return j({ ok: false, error: "bad_link", field: k }, 400);
      fields[k] = c;
    }
    if (!Object.keys(fields).length) return j({ ok: false, error: "nothing_to_save" }, 400);
    await save(env, partnerId, fields);
    return j({ ok: true, links: fields });
  }

  /* media_remove */
  const kind = String(body.kind || "");
  if (!KINDS.includes(kind)) return j({ ok: false, error: "bad_kind" }, 400);
  const old = await rowOf(env, partnerId);
  if (!old.partner_id) return j({ ok: true });
  const fields = { [kind + "_key"]: null };
  if (kind !== "photo") fields[kind + "_text"] = null;
  await save(env, partnerId, fields);
  await dropFiles(env, [old[kind + "_key"]]);
  return j({ ok: true });
}

/* ---------- the public directory: attach what each business is allowed to show (ONE query) ---------- */
export async function attachMedia(env, partners) {
  try {
    await ensure(env);
    const { results } = await env.DB.prepare("SELECT * FROM partner_media").all();
    const byId = new Map((results || []).map((r) => [r.partner_id, r]));
    for (const p of partners) {
      const m = byId.get(p.id);
      if (!m) continue;
      const media = {};
      const v = stamp(m);
      if (m.photo_key && canPhoto(p)) media.photo = v || 1;
      if (canExtras(p)) {
        const posts = [1, 2].filter((n) => m["post" + n + "_key"]).map((n) => ({ n, text: m["post" + n + "_text"] || "", v: v || 1 }));
        if (posts.length) media.posts = posts;
        const links = {};
        for (const k of Object.keys(LINK_HOSTS)) if (m[k]) links[k] = m[k];
        if (Object.keys(links).length) media.links = links;
      }
      if (Object.keys(media).length) p.media = media;
    }
  } catch (e) { /* the directory must keep working even if this fails */ }
}

/* ---------- business deleted: hand back its files (and remove the row) so partners.js deletes them in ONE call ---------- */
export async function mediaPurge(env, partnerId) {
  try {
    await ensure(env);
    const m = await rowOf(env, partnerId);
    await env.DB.prepare("DELETE FROM partner_media WHERE partner_id=?").bind(partnerId).run();
    return [m.photo_key, m.post1_key, m.post2_key].filter(Boolean);
  } catch (e) { return []; }
}
