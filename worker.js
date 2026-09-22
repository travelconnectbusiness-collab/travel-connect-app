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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
      newRes.headers.set("Cache-Control", "no-cache, must-revalidate");
      return newRes;
    }
    return res;
  },
};
