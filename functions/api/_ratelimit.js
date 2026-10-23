/* functions/api/_ratelimit.js  (helper module, NOT a route)
   Tiny fixed-window limiter kept in D1: allowed(env, "fb:<ip>", 5, 3600) -> true while the caller has used fewer than 5 calls in the
   current hour. Only a hash-free key (like "fb:1.2.3.4") and a counter are stored; old rows are cleaned now and then.
   It never blocks because of its own failure (a database error = allowed). */
let ready = false;
export async function allowed(env, key, max, windowSec) {
  try {
    if (!ready) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, win_start INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0)").run();
      ready = true;
    }
    const now = Date.now(), span = windowSec * 1000;
    const row = await env.DB.prepare("SELECT win_start, n FROM rate_limits WHERE k=?").bind(key).first();
    if (!row || now - row.win_start >= span) {
      await env.DB.prepare("INSERT OR REPLACE INTO rate_limits (k, win_start, n) VALUES (?,?,1)").bind(key, now).run();
      if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM rate_limits WHERE win_start<?").bind(now - 86400000).run();
      return true;
    }
    if (row.n >= max) return false;
    await env.DB.prepare("UPDATE rate_limits SET n=n+1 WHERE k=?").bind(key).run();
    return true;
  } catch (e) { return true; }
}
