export default async function handler(req, res) {
  const { email, name } = req.query;

  if (!email || !name) {
    return res.status(400).send(htmlPage("Missing required parameters: email and name."));
  }

  try {
    // Invite user via Supabase Admin API
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!inviteRes.ok) {
      const error = await inviteRes.text();
      console.error("Supabase invite error:", error);
      return res.status(500).send(htmlPage(`Failed to invite user: ${error}`));
    }

    // Send confirmation email to requester via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@batch-apps.com",
        to: email,
        subject: "You have been granted access to Batch Apps",
        text: `Hi ${name},\n\nYour access request has been approved. Check your inbox for a separate email with a link to set up your password. Once set, you can log in at any Batch Apps product using the same account.\n\n- Batch Apps`,
      }),
    });

    if (!emailRes.ok) {
      const error = await emailRes.text();
      console.error("Resend error:", error);
      return res.status(500).send(htmlPage(`Invite sent but confirmation email failed: ${error}`));
    }

    return res.status(200).send(
      htmlPage(`Access approved. ${email} has been invited and will receive a setup email.`, "green")
    );
  } catch (err) {
    console.error("Approve request error:", err);
    return res.status(500).send(htmlPage(`Internal server error: ${err.message}`));
  }
}

function htmlPage(message, color = "black") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Batch Apps — Access Request</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center;
           min-height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: #fff; padding: 40px 48px; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08);
            max-width: 480px; text-align: center; }
    p { font-size: 1.1rem; color: ${color === "green" ? "#16a34a" : "#dc2626"}; font-weight: 500; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <p>${message}</p>
  </div>
</body>
</html>`;
}
