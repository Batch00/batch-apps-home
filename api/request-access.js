import process from "node:process";
import { generateAccessToken } from "./_lib/access-token.js";
import { escapeHtml } from "./_lib/escape-html.js";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
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

  // The Approve and Deny links carry the email and an HMAC token tying that
  // email to APPROVAL_SECRET, so the links cannot be forged for another address.
  const token = generateAccessToken(email);
  const query = `email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&token=${token}`;
  const approveUrl = `https://www.batch-apps.com/api/approve-request?${query}`;
  const denyUrl = `https://www.batch-apps.com/api/deny-request?${query}`;

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
