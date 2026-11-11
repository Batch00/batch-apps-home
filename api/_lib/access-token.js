import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

// HMAC-SHA256 tokens that authenticate the Approve and Deny links in the admin
// notification email. The token binds an applicant's email to APPROVAL_SECRET,
// so only someone holding the secret (the email we sent) can approve or deny.
// Ported from BatchPort src/lib/access-token.ts.
//
// Server only. Files under api/_lib are not deployed as functions by Vercel.

function getSecret() {
  const secret = process.env.APPROVAL_SECRET;
  if (!secret) {
    throw new Error("APPROVAL_SECRET is not set");
  }
  return secret;
}

// Lowercase and trim so the same address always yields the same token
// regardless of how the applicant typed it.
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function generateAccessToken(email) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(normalizeEmail(email))
    .digest("hex");
}

// Timing-safe comparison of a presented token against the expected one. Guards
// against non-string input, length mismatches (timingSafeEqual throws on
// unequal lengths) and non-hex input.
export function verifyAccessToken(email, token) {
  if (typeof email !== "string" || typeof token !== "string") {
    return false;
  }
  const expected = generateAccessToken(email);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(token, "hex");
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
