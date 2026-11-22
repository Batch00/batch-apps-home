import process from "node:process";
import { signAccess } from "./_lib/access-token.js";
import { escapeHtml } from "./_lib/escape-html.js";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_LIFETIME_SECONDS = 14 * 24 * 60 * 60;

// Per-IP speed bump: 5 requests per rolling hour. The map lives in this
// function instance's memory only, so it resets on cold starts and is not
// shared between instances. It slows a casual flood; it is not a real limit.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const recentRequests = new Map();

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "").split(",")[0].trim();
  return first || req.socket?.remoteAddress || "unknown";
}

// Records this request and returns the seconds to wait when the IP is over
// the limit, or 0 when it may proceed.
function rateLimitWait(ip, now = Date.now()) {
  const windowStart = now - RATE_WINDOW_MS;
  if (recentRequests.size > 10000) {
    for (const [key, times] of recentRequests) {
      if (times[times.length - 1] <= windowStart) recentRequests.delete(key);
    }
  }
  const times = (recentRequests.get(ip) ?? []).filter((t) => t > windowStart);
  if (times.length >= RATE_LIMIT) {
    recentRequests.set(ip, times);
    return Math.ceil((times[0] + RATE_WINDOW_MS - now) / 1000);
  }
  times.push(now);
  recentRequests.set(ip, times);
  return 0;
}

// A preview deployment sends its links to itself, so testing a preview never
// approves anyone through production.
function linkBase() {
  const previewHost = process.env.VERCEL_URL;
  if (process.env.VERCEL_ENV === "preview" && previewHost) {
    return `https://${previewHost}`;
  }
  return "https://www.batch-apps.com";
}

function accessLink(action, email, name, exp) {
  const query = new URLSearchParams({
    email,
    name,
    exp: String(exp),
    token: signAccess(action, email, name, exp),
  });
  return `${linkBase()}/api/${action}-request?${query}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const wait = rateLimitWait(clientIp(req));
  if (wait > 0) {
    res.setHeader("Retry-After", String(wait));
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};

  // Honeypot: the form's hidden "website" field is empty for people. Answer
  // a filled one as if it worked and send nothing.
  if (typeof body.website === "string" && body.website !== "") {
    return res.status(200).json({ success: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = body.message;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: "Name is too long" });
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Email is not valid" });
  }
  if (message != null && typeof message !== "string") {
    return res.status(400).json({ error: "Message must be text" });
  }
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: "Message is too long" });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.APPROVAL_SECRET) {
    console.error("Request access is not configured: ADMIN_EMAIL or APPROVAL_SECRET is missing");
    return res.status(500).json({ error: "Internal server error" });
  }

  // Each link carries the email, name, expiry and a token signed for its own
  // action, so a link cannot be forged, reused for the other action, or used
  // after it expires. Opening a link only shows a confirmation page.
  const exp = Math.floor(Date.now() / 1000) + LINK_LIFETIME_SECONDS;
  const approveUrl = accessLink("approve", email, name, exp);
  const denyUrl = accessLink("deny", email, name, exp);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
      <h2 style="margin-bottom: 4px;">New Access Request - Batch Apps</h2>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 20px;" />

      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong><br/>${message ? escapeHtml(message).replace(/\n/g, "<br/>") : "(none)"}</p>

      <div style="margin-top: 32px; display: flex; gap: 12px;">
        <a href="${escapeHtml(approveUrl)}"
           style="display: inline-block; padding: 12px 28px; background-color: #16a34a; color: #fff;
                  text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">
          Approve
        </a>
        <a href="${escapeHtml(denyUrl)}"
           style="display: inline-block; padding: 12px 28px; background-color: #dc2626; color: #fff;
                  text-decoration: none; border-radius: 6px; font-weight: 600;">
          Deny
        </a>
      </div>
      <p style="margin-top: 16px; color: #888; font-size: 13px;">These links expire in 14 days.</p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@batch-apps.com",
        to: adminEmail,
        subject: "New Access Request - Batch Apps",
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
