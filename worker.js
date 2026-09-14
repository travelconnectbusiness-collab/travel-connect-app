import { onRequestGet as configGet, onRequestPost as configPost } from "./functions/api/config.js";
import { onRequestGet as authGet, onRequestPost as authPost } from "./functions/api/auth.js";
import { onRequestGet as partnersGet, onRequestPost as partnersPost } from "./functions/api/partners.js";
import { onRequestGet as vehiclesGet, onRequestPost as vehiclesPost } from "./functions/api/vehicles.js";
import { onRequestGet as sosGet, onRequestPost as sosPost } from "./functions/api/sos.js";
import { onRequestGet as pushGet, onRequestPost as pushPost } from "./functions/api/push.js";
import { onRequestGet as authorizedGet, onRequestPost as authorizedPost } from "./functions/api/authorized.js";
import { onRequestGet as feedbackGet, onRequestPost as feedbackPost } from "./functions/api/feedback.js";
import { onRequestGet as partnerPlanGet, onRequestPost as partnerPlanPost } from "./functions/api/partner_plan.js";

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

    return env.ASSETS.fetch(request);
  },
};
