import process from "node:process";
import { createAccessRoute } from "./_lib/access-route.js";

// GET shows a confirmation page for a verified link; only the POST from its
// button emails the applicant (see api/_lib/access-route.js).
async function deny(email, name) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const contactLine = adminEmail
    ? ` Feel free to reach out at ${adminEmail} if you have any questions.`
    : "";

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
      text: `Hi ${name},\n\nThank you for your interest in Batch Apps. Unfortunately we are not accepting new users at this time.${contactLine}\n\n- Batch Apps`,
    }),
  });

  if (!emailRes.ok) {
    const error = await emailRes.text();
    console.error("Resend error:", error);
    return { status: 500, message: "Failed to send rejection email. Check the server logs." };
  }

  return {
    status: 200,
    message: `Request denied. A notification email has been sent to ${email}.`,
    color: "red",
  };
}

export default createAccessRoute({
  action: "deny",
  label: "Deny",
  buttonColor: "#dc2626",
  perform: deny,
});
