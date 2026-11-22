import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

// HMAC-SHA256 tokens that authenticate the Approve and Deny links in the admin
// notification email. Each token signs one action ("approve" or "deny"), the
// applicant's email and name, and an expiry in unix seconds, so a link cannot
// be reused for another action or address, and it stops working once expired.
//
// Server only. Files under api/_lib are not deployed as functions by Vercel.

const ACTIONS = new Set(["approve", "deny"]);
const MAX_AHEAD_SECONDS = 15 * 24 * 60 * 60;
const EXP_PATTERN = /^[1-9]\d{0,11}$/;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

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

export function signAccess(action, email, name, exp) {
  if (!ACTIONS.has(action)) {
    throw new Error(`Unknown access action: ${action}`);
  }
  const message = `v2|${action}|${normalizeEmail(email)}|${name.trim()}|${exp}`;
  return crypto.createHmac("sha256", getSecret()).update(message).digest("hex");
}

// True only for a well-formed, unexpired token signed for exactly this action,
// email, name and expiry. The cheap shape checks run before the HMAC, and the
// final compare is timing safe. Old links carry no exp, so they fail here.
export function verifyAccess(action, email, name, exp, token, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (
    typeof action !== "string" ||
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof exp !== "string" ||
    typeof token !== "string"
  ) {
    return false;
  }
  if (!ACTIONS.has(action) || !EXP_PATTERN.test(exp) || !TOKEN_PATTERN.test(token)) {
    return false;
  }
  const expSeconds = Number(exp);
  if (expSeconds < nowSeconds || expSeconds > nowSeconds + MAX_AHEAD_SECONDS) {
    return false;
  }
  const expected = Buffer.from(signAccess(action, email, name, exp), "hex");
  const provided = Buffer.from(token, "hex");
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}
