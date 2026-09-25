import { onRequestGet as configGet, onRequestPost as configPost } from "./functions/api/config.js";
import { onRequestGet as authGet, onRequestPost as authPost } from "./functions/api/auth.js";
import { onRequestGet as partnersGet, onRequestPost as partnersPost } from "./functions/api/partners.js";
import { onRequestGet as vehiclesGet, onRequestPost as vehiclesPost } from "./functions/api/vehicles.js";
import { onRequestGet as sosGet, onRequestPost as sosPost } from "./functions/api/sos.js";
import { onRequestGet as pushGet, onRequestPost as pushPost } from "./functions/api/push.js";
import { onRequestGet as authorizedGet, onRequestPost as authorizedPost } from "./functions/api/authorized.js";
import { onRequestGet as feedbackGet, onRequestPost as feedbackPost } from "./functions/api/feedback.js";
import { onRequestGet as partnerPlanGet, onRequestPost as partnerPlanPost } from "./functions/api/partner_plan.js";
import { onRequestGet as emergencyGet, onRequestPost as emergencyPost } from "./functions/api/emergency.js";
import { onRequestGet as placesGet, onRequestPost as placesPost } from "./functions/api/places.js";
import { onRequestGet as callsGet, onRequestPost as callsPost } from "./functions/api/calls.js";

/* All /api/* routing lives here, separate from the top-level fetch handler,
   so the CORS wrapper in fetch() can capture whatever Response this
   produces and attach the Access-Control-Allow-Origin header to it in one
   place, rather than repeating that on every individual route. */
async function handleApi(request, env, url) {
  if (url.pathname === "/api/config") {
    if (request.method === "GET") return configGet({ request, env });
    if (request.method === "POST") return configPost({ request, env });
  }

  if (url.pathname === "/api/auth") {
    if (request.method === "GET") return authGet({ request, env });
    if (request.method === "POST") return authPost({ request, env });
  }

  if (url.pathname === "/api/partners") {
    if (request.method === "GET") return partnersGet({ request, env });
    if (request.method === "POST") return partnersPost({ request, env });
  }

  if (url.pathname === "/api/vehicles") {
    if (request.method === "GET") return vehiclesGet({ request, env });
    if (request.method === "POST") return vehiclesPost({ request, env });
  }

  if (url.pathname === "/api/sos") {
    if (request.method === "GET") return sosGet({ request, env });
    if (request.method === "POST") return sosPost({ request, env });
  }

  if (url.pathname === "/api/push") {
    if (request.method === "GET") return pushGet({ request, env });
    if (request.method === "POST") return pushPost({ request, env });
  }

  if (url.pathname === "/api/authorized") {
    if (request.method === "GET") return authorizedGet({ request, env });
    if (request.method === "POST") return authorizedPost({ request, env });
  }

  if (url.pathname === "/api/feedback") {
    if (request.method === "GET") return feedbackGet({ request, env });
    if (request.method === "POST") return feedbackPost({ request, env });
  }

  if (url.pathname === "/api/partner_plan") {
    if (request.method === "GET") return partnerPlanGet({ request, env });
    if (request.method === "POST") return partnerPlanPost({ request, env });
  }

  if (url.pathname === "/api/emergency") {
    if (request.method === "GET") return emergencyGet({ request, env });
    if (request.method === "POST") return emergencyPost({ request, env });
  }

  if (url.pathname === "/api/places") {
    if (request.method === "GET") return placesGet({ request, env });
    if (request.method === "POST") return placesPost({ request, env });
  }

  if (url.pathname === "/api/calls") {
    if (request.method === "GET") return callsGet({ request, env });
    if (request.method === "POST") return callsPost({ request, env });
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* CORS support for /api/* - needed because the Android app (built with
       Capacitor, wrapping this same web app) makes its API requests from a
       WebView context that the browser treats as cross-origin for POST
       requests specifically, even though the app's configured hostname
       matches this domain. A cross-origin POST with a JSON body triggers a
       CORS "preflight" OPTIONS request first; without an explicit response
       to that OPTIONS request (and without Access-Control-Allow-* headers
       on the real response), the browser blocks the POST before it's even
       sent - this is what caused login to fail with "Network error" in the
       Android app while GET-based lookups (which don't trigger a
       preflight) worked fine. The web app itself is unaffected by any of
       this, since its own requests are genuinely same-origin. */
    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      }
      const apiRes = await handleApi(request, env, url);
      if (apiRes) {
        const withCors = new Response(apiRes.body, apiRes);
        withCors.headers.set("Access-Control-Allow-Origin", "*");
        return withCors;
      }
    }

    /* Cloudflare's edge/CDN can cache static assets (JS/CSS/HTML) even when
       the browser itself asked for a fresh copy - this happened even after
       fixing the Service Worker's own caching, meaning the stale response
       was coming from Cloudflare's cache, not the browser's. Explicitly
       forcing "no-cache, must-revalidate" on the response for these file
       types makes both the browser AND any intermediate cache always
       re-check with the origin before using a cached copy - the standard
       fix for "I deployed a new version but people still see the old one"
       caused by CDN-level caching. */
    const res = await env.ASSETS.fetch(request);
    if (/\.(js|css|html)$/.test(url.pathname) || url.pathname === "/") {
      const newRes = new Response(res.body, res);
      newRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      newRes.headers.set("Pragma", "no-cache");
      newRes.headers.set("Expires", "0");
      return newRes;
    }
    return res;
  },
};
