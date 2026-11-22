import { Buffer } from "node:buffer";
import { verifyAccess } from "./access-token.js";
import { escapeHtml } from "./escape-html.js";

// Shared handler for the Approve and Deny links in the admin email. Opening a
// link (GET) only verifies it and shows a confirmation page, because mail
// scanners and link previews fetch links on their own. The page's single
// button POSTs the same fields back, and only a verified POST acts.
//
// Server only. Files under api/_lib are not deployed as functions by Vercel.

const INVALID_MESSAGE = "This link is invalid or has expired.";

const COLORS = { green: "#16a34a", red: "#dc2626", neutral: "#222222" };

// The pages load nothing and run no script; the form may only post back here.
const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

function sendPage(res, status, body) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(status).send(htmlPage(body));
}

function messagePage(message, color = "red") {
  return `<p class="message" style="color: ${COLORS[color] ?? COLORS.neutral};">${escapeHtml(message)}</p>`;
}

function confirmPage({ label, path, fields, buttonColor }) {
  const { email, name, exp, token } = fields;
  const hidden = Object.entries({ email, name, exp, token })
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}" />`)
    .join("\n      ");
  return `<p class="message">${escapeHtml(`${label} access for ${name} (${email})?`)}</p>
    <form method="post" action="${escapeHtml(path)}">
      ${hidden}
      <button type="submit" style="background: ${buttonColor};">${escapeHtml(label)}</button>
    </form>`;
}

// Vercel parses a urlencoded body into an object; a raw string or Buffer is
// parsed here. Any other content type is refused.
function readForm(req) {
  const type = String(req.headers?.["content-type"] ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (type !== "application/x-www-form-urlencoded") {
    return null;
  }
  const body = req.body;
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    return Object.fromEntries(new URLSearchParams(body.toString()));
  }
  return body && typeof body === "object" ? body : null;
}

function isValid(action, fields) {
  const { email, name, exp, token } = fields ?? {};
  if (typeof email !== "string" || typeof name !== "string" || !email.trim() || !name.trim()) {
    return false;
  }
  return verifyAccess(action, email, name, exp, token);
}

// perform(email, name) does the route's work and resolves to
// { status, message, color }.
export function createAccessRoute({ action, label, buttonColor, perform }) {
  const path = `/api/${action}-request`;

  return async function handler(req, res) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(key, value);
    }

    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return sendPage(res, 405, messagePage("Method not allowed."));
    }

    const fields = req.method === "GET" ? req.query : readForm(req);

    let valid;
    try {
      valid = isValid(action, fields);
    } catch (err) {
      console.error(`${label} link check failed:`, err);
      return sendPage(res, 500, messagePage("Internal server error."));
    }
    if (!valid) {
      return sendPage(res, 400, messagePage(INVALID_MESSAGE));
    }

    if (req.method === "GET") {
      return sendPage(res, 200, confirmPage({ label, path, fields, buttonColor }));
    }

    try {
      const { status, message, color } = await perform(fields.email, fields.name);
      return sendPage(res, status, messagePage(message, color));
    } catch (err) {
      console.error(`${label} request error:`, err);
      return sendPage(res, 500, messagePage("Internal server error."));
    }
  };
}

function htmlPage(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <title>Batch Apps - Access Request</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center;
           min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: #fff; padding: 40px 48px; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08);
            max-width: 480px; text-align: center; }
    .message { font-size: 1.1rem; color: #222; font-weight: 500; margin: 0; overflow-wrap: anywhere; }
    button { margin-top: 24px; padding: 12px 28px; border: 0; border-radius: 6px; color: #fff;
             font-size: 1rem; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`;
}
