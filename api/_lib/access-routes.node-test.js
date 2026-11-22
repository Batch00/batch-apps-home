// node --test (npm run test:access). Handlers run against mock req and res
// with a stubbed global fetch, so nothing reaches the network.
import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import { signAccess } from "./access-token.js";
import approveHandler from "../approve-request.js";
import denyHandler from "../deny-request.js";
import requestAccessHandler from "../request-access.js";

Object.assign(process.env, {
  APPROVAL_SECRET: "test-secret-for-access-routes",
  ADMIN_EMAIL: "admin@example.test",
  RESEND_API_KEY: "test-resend-key",
  SUPABASE_URL: "https://supabase.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
});
delete process.env.VERCEL_ENV;
delete process.env.VERCEL_URL;

const EMAIL = "ada@example.com";
const NAME = "Ada <Lovelace>";

let fetchCalls;
const realFetch = globalThis.fetch;

beforeEach(() => {
  fetchCalls = [];
  globalThis.fetch = async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return { ok: true, status: 200, text: async () => "" };
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

function linkFields(action, { email = EMAIL, name = NAME, exp = Math.floor(Date.now() / 1000) + 14 * 86400 } = {}) {
  return { email, name, exp: String(exp), token: signAccess(action, email, name, exp) };
}

function getReq(query) {
  return { method: "GET", query, headers: {} };
}

function postReq(fields) {
  return {
    method: "POST",
    query: {},
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  };
}

function assertNoStore(res) {
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["referrer-policy"], "no-referrer");
}

test("a valid approve GET shows the confirmation page and calls nothing", async () => {
  const fields = linkFields("approve");
  const res = mockRes();
  await approveHandler(getReq(fields), res);

  assert.equal(res.statusCode, 200);
  assert.equal(fetchCalls.length, 0);
  assertNoStore(res);
  assert.match(res.body, /Approve access for Ada &lt;Lovelace&gt; \(ada@example\.com\)\?/);
  assert.match(res.body, /<form method="post" action="\/api\/approve-request">/);
  assert.match(res.body, new RegExp(`name="token" value="${fields.token}"`));
  assert.match(res.body, new RegExp(`name="exp" value="${fields.exp}"`));
  assert.match(res.body, /name="name" value="Ada &lt;Lovelace&gt;"/);
  assert.equal((res.body.match(/<button/g) ?? []).length, 1);
  assert.ok(!res.body.includes("<Lovelace>"));
});

test("a valid approve POST sends the invite and the email", async () => {
  const res = mockRes();
  await approveHandler(postReq(linkFields("approve")), res);

  assert.equal(res.statusCode, 200);
  assertNoStore(res);
  assert.deepEqual(
    fetchCalls.map((call) => call.url),
    ["https://supabase.example.test/auth/v1/invite", "https://api.resend.com/emails"],
  );
  assert.equal(JSON.parse(fetchCalls[0].init.body).email, EMAIL);
  assert.equal(JSON.parse(fetchCalls[1].init.body).to, EMAIL);
});

test("a valid deny POST emails the applicant with the ADMIN_EMAIL contact", async () => {
  const res = mockRes();
  await denyHandler(postReq(linkFields("deny")), res);

  assert.equal(res.statusCode, 200);
  assert.equal(fetchCalls.length, 1);
  const sent = JSON.parse(fetchCalls[0].init.body);
  assert.equal(sent.to, EMAIL);
  assert.match(sent.text, /admin@example\.test/);
});

test("a deny token used on approve-request is a 400 with no fetch", async () => {
  const fields = linkFields("deny");
  for (const req of [getReq(fields), postReq(fields)]) {
    const res = mockRes();
    await approveHandler(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /This link is invalid or has expired\./);
    assertNoStore(res);
  }
  assert.equal(fetchCalls.length, 0);
});

test("an old-format link is a 400 with no fetch", async () => {
  const oldToken = crypto.createHmac("sha256", process.env.APPROVAL_SECRET).update(EMAIL).digest("hex");
  const query = { email: EMAIL, name: NAME, token: oldToken };
  for (const handler of [approveHandler, denyHandler]) {
    const res = mockRes();
    await handler(getReq(query), res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body, /This link is invalid or has expired\./);
  }
  const res = mockRes();
  await approveHandler(postReq(query), res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCalls.length, 0);
});

test("an expired link is a 400 with no fetch", async () => {
  const fields = linkFields("approve", { exp: Math.floor(Date.now() / 1000) - 60 });
  const res = mockRes();
  await approveHandler(postReq(fields), res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCalls.length, 0);
});

test("a POST without a form body is refused with no fetch", async () => {
  const res = mockRes();
  await approveHandler({ ...postReq(linkFields("approve")), headers: { "content-type": "application/json" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCalls.length, 0);
});

test("other methods are a 405", async () => {
  const res = mockRes();
  await approveHandler({ method: "PUT", query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET, POST");
  assertNoStore(res);
});

function accessReq(ip, body) {
  return { method: "POST", headers: { "x-forwarded-for": `${ip}, 10.0.0.1` }, body };
}

test("request-access emails links that carry exp and an action-specific token", async () => {
  const res = mockRes();
  await requestAccessHandler(accessReq("198.51.100.1", { name: "Ada", email: EMAIL, message: "hi" }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(fetchCalls.length, 1);
  const html = JSON.parse(fetchCalls[0].init.body).html;
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => new URL(m[1].replaceAll("&amp;", "&")));
  assert.deepEqual(
    links.map((url) => url.origin + url.pathname),
    ["https://www.batch-apps.com/api/approve-request", "https://www.batch-apps.com/api/deny-request"],
  );
  const [approve, deny] = links.map((url) => Object.fromEntries(url.searchParams));
  assert.equal(approve.exp, deny.exp);
  assert.notEqual(approve.token, deny.token);
  const days = (Number(approve.exp) - Date.now() / 1000) / 86400;
  assert.ok(days > 13.9 && days <= 14, `exp is ${days} days out`);
});

test("a preview deployment links to itself", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_URL = "batch-apps-home-git-x.vercel.app";
  try {
    const res = mockRes();
    await requestAccessHandler(accessReq("198.51.100.2", { name: "Ada", email: EMAIL }), res);
    const html = JSON.parse(fetchCalls[0].init.body).html;
    assert.match(html, /href="https:\/\/batch-apps-home-git-x\.vercel\.app\/api\/approve-request\?/);
  } finally {
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  }
});

test("a filled honeypot returns 200 and sends nothing", async () => {
  const res = mockRes();
  await requestAccessHandler(
    accessReq("198.51.100.3", { name: "Bot", email: "bot@example.com", website: "https://spam.example" }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true });
  assert.equal(fetchCalls.length, 0);
});

test("the 6th request from one IP within an hour is a 429", async () => {
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const res = mockRes();
    await requestAccessHandler(accessReq("203.0.113.9", { name: "Ada", email: EMAIL }), res);
    statuses.push(res.statusCode);
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal(fetchCalls.length, 5);

  const other = mockRes();
  await requestAccessHandler(accessReq("203.0.113.10", { name: "Ada", email: EMAIL }), other);
  assert.equal(other.statusCode, 200);
});
