import process from "node:process";
import { createAccessRoute } from "./_lib/access-route.js";

// GET shows a confirmation page for a verified link; only the POST from its
// button invites the applicant (see api/_lib/access-route.js).
async function approve(email, name) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Approve is not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
    return { status: 500, message: "Internal server error." };
  }

  // Invite user via Supabase Admin API
  const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, redirect_to: "https://www.batch-apps.com/setup-password" }),
  });

  if (!inviteRes.ok) {
    const error = await inviteRes.text();
    console.error("Supabase invite error:", error);
    return { status: 500, message: "Failed to invite user. Check the server logs." };
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
    return { status: 500, message: "Invite sent but confirmation email failed. Check the server logs." };
  }

  return {
    status: 200,
    message: `Access approved. ${email} has been invited and will receive a setup email.`,
    color: "green",
  };
}

export default createAccessRoute({
  action: "approve",
  label: "Approve",
  buttonColor: "#16a34a",
  perform: approve,
});
