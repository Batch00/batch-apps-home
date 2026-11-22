// node --test (npm run test:access). No network.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import { signAccess, verifyAccess } from "./access-token.js";

process.env.APPROVAL_SECRET = "test-secret-for-access-tokens";

const NOW = 1_800_000_000;
const DAY = 24 * 60 * 60;
const EMAIL = "Ada@Example.com";
const NAME = "Ada Lovelace";
const EXP = String(NOW + 14 * DAY);

test("a signed token verifies for the same fields", () => {
  const token = signAccess("approve", EMAIL, NAME, EXP);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, token, NOW), true);
  const denyToken = signAccess("deny", EMAIL, NAME, Number(EXP));
  assert.equal(verifyAccess("deny", EMAIL, NAME, EXP, denyToken, NOW), true);
});

test("the token is bound to its action", () => {
  const token = signAccess("deny", EMAIL, NAME, EXP);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, token, NOW), false);
  assert.equal(verifyAccess("other", EMAIL, NAME, EXP, token, NOW), false);
});

test("changing the email, name or exp breaks the token", () => {
  const token = signAccess("approve", EMAIL, NAME, EXP);
  assert.equal(verifyAccess("approve", "eve@example.com", NAME, EXP, token, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, "Eve", EXP, token, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, String(Number(EXP) + 1), token, NOW), false);
});

test("email case and surrounding whitespace do not matter", () => {
  const token = signAccess("approve", EMAIL, NAME, EXP);
  assert.equal(verifyAccess("approve", "  ada@example.COM ", NAME, EXP, token, NOW), true);
});

test("an expired token fails", () => {
  const exp = String(NOW - 1);
  const token = signAccess("approve", EMAIL, NAME, exp);
  assert.equal(verifyAccess("approve", EMAIL, NAME, exp, token, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, signAccess("approve", EMAIL, NAME, EXP), NOW + 15 * DAY), false);
});

test("an exp more than 15 days ahead fails", () => {
  const atLimit = String(NOW + 15 * DAY);
  assert.equal(verifyAccess("approve", EMAIL, NAME, atLimit, signAccess("approve", EMAIL, NAME, atLimit), NOW), true);
  const beyond = String(NOW + 15 * DAY + 1);
  assert.equal(verifyAccess("approve", EMAIL, NAME, beyond, signAccess("approve", EMAIL, NAME, beyond), NOW), false);
});

test("an old-format token (HMAC of the email alone) fails", () => {
  const oldToken = crypto
    .createHmac("sha256", process.env.APPROVAL_SECRET)
    .update(EMAIL.trim().toLowerCase())
    .digest("hex");
  assert.equal(verifyAccess("approve", EMAIL, NAME, undefined, oldToken, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, oldToken, NOW), false);
});

test("malformed input fails", () => {
  const token = signAccess("approve", EMAIL, NAME, EXP);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, "z".repeat(64), NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, token.slice(0, 62), NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, `${token}00`, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, `${EXP}.5`, token, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, Number(EXP), token, NOW), false);
  assert.equal(verifyAccess("approve", [EMAIL], NAME, EXP, token, NOW), false);
  assert.equal(verifyAccess("approve", EMAIL, NAME, EXP, [token], NOW), false);
});
