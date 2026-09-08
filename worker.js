import { onRequestGet as configGet, onRequestPost as configPost } from "./functions/api/config.js";
import { onRequestGet as authGet, onRequestPost as authPost } from "./functions/api/auth.js";
import { onRequestGet as partnersGet, onRequestPost as partnersPost } from "./functions/api/partners.js";
import { onRequestGet as vehiclesGet, onRequestPost as vehiclesPost } from "./functions/api/vehicles.js";

/* This project deploys as a Cloudflare Worker (not Pages), so file-based routing under
   functions/api/ doesn't happen automatically — this router does it by hand:
   requests to /api/config, /api/auth, /api/partners, /api/vehicles go to our functions,
   everything else (app.js, index.html, app.css, images...) falls through to the static assets. */
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

    return env.ASSETS.fetch(request);
  },
};
