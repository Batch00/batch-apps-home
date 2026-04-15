module.exports = async function handler(req, res) {
  const { email, name } = req.query;

  if (!email || !name) {
    return res.status(400).send(htmlPage("Missing required parameters: email and name."));
  }

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@batch-apps.com",
        to: email,
        subject: "Batch Apps Access Request",
        text: `Hi ${name},\n\nThank you for your interest in Batch Apps. Unfortunately we are not accepting new users at this time. Feel free to reach out at carsonb1723@gmail.com if you have any questions.\n\n— Batch Apps`,
      }),
    });

    if (!emailRes.ok) {
      const error = await emailRes.text();
      console.error("Resend error:", error);
      return res.status(500).send(htmlPage(`Failed to send rejection email: ${error}`));
    }

    return res.status(200).send(
      htmlPage(`Request denied. A notification email has been sent to ${email}.`, "red")
    );
  } catch (err) {
    console.error("Deny request error:", err);
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
    p { font-size: 1.1rem; color: ${color === "red" ? "#dc2626" : color === "green" ? "#16a34a" : "#222"};
        font-weight: 500; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <p>${message}</p>
  </div>
</body>
</html>`;
}
