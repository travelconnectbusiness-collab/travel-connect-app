/* Tiny on/off switches stored in D1 (table app_flags). */
let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT)").run();
  ready = true;
}
export async function getFlag(env, key, def = false) {
  try {
    await ensure(env);
    const r = await env.DB.prepare("SELECT value FROM app_flags WHERE key=?").bind(key).first();
    if (!r) return def;
    return r.value === "1";
  } catch (e) { return def; }
}
export async function setFlag(env, key, on) {
  await ensure(env);
  await env.DB.prepare("INSERT INTO app_flags (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .bind(key, on ? "1" : "0").run();
}
