import { bearerToken } from "./owner-auth.js";
import { toPrivateWrap } from "./wrap-private-payload.js";
import { FIRST_YEAR, yearFromQuery } from "./years.js";

// The handler behind GET /api/wrap-private?year=YYYY, built from its two outside calls so the
// tests can stand in for Supabase and the database:
//   getUser(token)     resolves { id } for a valid Supabase access token, null for a refused one
//   readPayload(year)  resolves the raw brain.private_wrap payload for the year, or undefined
//   ownerId()          the owner's auth.users id (OWNER_USER_ID)
//
// Order: no token is 401, a token Supabase refuses is 401, any user but the owner is 403, and
// only then is the year checked and the payload read. Every response is private, no-store, so
// no browser, proxy or Vercel's CDN keeps a copy. Logs carry error codes only, never a token or
// a payload.

const NO_STORE = "private, no-store, max-age=0";

function send(res, status, body) {
  return res.status(status).json(body);
}

export function createWrapPrivateHandler({ getUser, readPayload, ownerId }) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", NO_STORE);
    res.setHeader("Vary", "Authorization");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return send(res, 405, { error: "Method not allowed" });
    }

    // The Authorization header is the only place a token is read from. A token in the URL
    // (?access_token=, ?token=) is ignored, so it can never work and never gets built on.
    const token = bearerToken(req.headers);
    if (!token) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="wrap-private"');
      return send(res, 401, { error: "Sign in required" });
    }

    const owner = ownerId();
    if (typeof owner !== "string" || !owner) {
      console.error("Private wrap is not configured: OWNER_USER_ID is missing");
      return send(res, 500, { error: "Internal server error" });
    }

    let user;
    try {
      user = await getUser(token);
    } catch (err) {
      console.error("Private wrap auth check failed:", err?.code ?? err?.name ?? "unknown");
      return send(res, 500, { error: "Internal server error" });
    }
    if (!user) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="wrap-private", error="invalid_token"');
      return send(res, 401, { error: "Sign in required" });
    }
    if (user.id !== owner) {
      return send(res, 403, { error: "This view is for the owner only" });
    }

    const year = yearFromQuery(req.query);
    if (year === null) {
      return send(res, 400, { error: `year must be ${FIRST_YEAR} through the current year` });
    }

    try {
      const raw = await readPayload(year);
      const payload = toPrivateWrap(typeof raw === "string" ? JSON.parse(raw) : raw);
      if (!payload || payload.year !== year) {
        return send(res, 404, { error: "No data for that year" });
      }
      return send(res, 200, payload);
    } catch (err) {
      // Log the code only: postgres.js errors can carry connection details.
      console.error("Private wrap query failed:", err?.code ?? err?.name ?? "unknown");
      return send(res, 500, { error: "Internal server error" });
    }
  };
}
