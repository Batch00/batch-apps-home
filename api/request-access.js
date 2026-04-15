module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const encodedEmail = encodeURIComponent(email);
  const encodedName = encodeURIComponent(name);
  const approveUrl = `https://batch-apps.com/api/approve-request?email=${encodedEmail}&name=${encodedName}`;
  const denyUrl = `https://batch-apps.com/api/deny-request?email=${encodedEmail}&name=${encodedName}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
      <h2 style="margin-bottom: 4px;">New Access Request — Batch Apps</h2>
      <hr style="border: none; border-top: 1px solid #ddd; margin-bottom: 20px;" />

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong><br/>${message ? message.replace(/\n/g, "<br/>") : "(none)"}</p>

      <div style="margin-top: 32px; display: flex; gap: 12px;">
        <a href="${approveUrl}"
           style="display: inline-block; padding: 12px 28px; background-color: #16a34a; color: #fff;
                  text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">
          Approve
        </a>
        <a href="${denyUrl}"
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
        to: "carsonb1723@gmail.com",
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
