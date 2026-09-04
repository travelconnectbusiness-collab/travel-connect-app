import { onRequestGet as configGet, onRequestPost as configPost } from "./functions/api/config.js";
import { onRequestGet as authGet, onRequestPost as authPost } from "./functions/api/auth.js";

/* This project deploys as a Cloudflare Worker (not Pages), so file-based routing under
   functions/api/ doesn't happen automatically — this router does it by hand:
   requests to /api/config and /api/auth go to our functions, everything else
   (app.js, index.html, app.css, images...) falls through to the static assets. */
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

    return env.ASSETS.fetch(request);
  },
};
