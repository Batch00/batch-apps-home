import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "../../src/wrap/fixtures/private/sample.json";
import publicFixture from "../../src/wrap/fixtures/2026.json";
import { bearerToken } from "./owner-auth.js";
import { createWrapPrivateHandler } from "./wrap-private-route.js";
import { currentYear } from "./years.js";
import realHandler from "../wrap-private.js";

// The auth check and the database are stand-ins: nothing here reaches Supabase or Postgres.

const OWNER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
// Shaped like a JWT; the fake getUser below decides who it belongs to.
const OWNER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.b3duZXI.c2lnbmF0dXJl";
const OTHER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.b3RoZXI.c2lnbmF0dXJl";
const BAD_TOKEN = "eyJhbGciOiJIUzI1NiJ9.ZXhwaXJlZA.c2lnbmF0dXJl";
const YEAR = 2026;

// The sample's private block on the public 2026 fixture: a private_wrap row as BatchBrain stores it.
const ROW = { ...publicFixture, private: sample.private };

function mockRes() {
  return {
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
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function setup({ readPayload = async () => ROW } = {}) {
  const getUser = vi.fn(async (token) => {
    if (token === OWNER_TOKEN) return { id: OWNER };
    if (token === OTHER_TOKEN) return { id: OTHER };
    return null;
  });
  const read = vi.fn(readPayload);
  const handler = createWrapPrivateHandler({ getUser, readPayload: read, ownerId: () => OWNER });
  return { handler, getUser, read };
}

async function call(handler, { token, year = String(YEAR), method = "GET", query, headers } = {}) {
  const req = {
    method,
    query: query ?? { year },
    headers: headers ?? (token ? { authorization: `Bearer ${token}` } : {}),
  };
  const res = mockRes();
  await handler(req, res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/wrap-private", () => {
  it("returns 401 without a token and never asks Supabase or the database", async () => {
    const { handler, getUser, read } = setup();
    const res = await call(handler);
    expect(res.statusCode).toBe(401);
    expect(res.headers["www-authenticate"]).toMatch(/^Bearer/);
    expect(getUser).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("returns 401 for a token Supabase refuses", async () => {
    const { handler, read } = setup();
    const res = await call(handler, { token: BAD_TOKEN });
    expect(res.statusCode).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });

  it("returns 403 for a signed-in user who is not the owner", async () => {
    const { handler, read } = setup();
    const res = await call(handler, { token: OTHER_TOKEN });
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "This view is for the owner only" });
    expect(read).not.toHaveBeenCalled();
  });

  it("returns 200 with the public payload and the private block for the owner", async () => {
    const { handler, read } = setup();
    const res = await call(handler, { token: OWNER_TOKEN });
    expect(res.statusCode).toBe(200);
    expect(read).toHaveBeenCalledWith(YEAR);
    expect(res.body.year).toBe(YEAR);
    expect(res.body.totals).toEqual(publicFixture.totals);
    expect(res.body.private).toEqual(sample.private);
  });

  it("never accepts the token in the URL", async () => {
    const { handler, getUser } = setup();
    for (const key of ["access_token", "token", "jwt", "authorization"]) {
      const res = await call(handler, { query: { year: String(YEAR), [key]: OWNER_TOKEN } });
      expect(res.statusCode).toBe(401);
    }
    expect(getUser).not.toHaveBeenCalled();
  });

  it("accepts only a well-formed Bearer header", async () => {
    const { handler } = setup();
    for (const authorization of [OWNER_TOKEN, `Basic ${OWNER_TOKEN}`, "Bearer ", "Bearer not-a-jwt", `Bearer ${OWNER_TOKEN} extra`]) {
      const res = await call(handler, { headers: { authorization } });
      expect(res.statusCode).toBe(401);
    }
    expect((await call(handler, { headers: { authorization: `bearer ${OWNER_TOKEN}` } })).statusCode).toBe(200);
  });

  it("marks every response private and no-store", async () => {
    const { handler } = setup();
    for (const token of [undefined, BAD_TOKEN, OTHER_TOKEN, OWNER_TOKEN]) {
      const res = await call(handler, { token });
      expect(res.headers["cache-control"]).toBe("private, no-store, max-age=0");
      expect(res.headers.vary).toBe("Authorization");
    }
  });

  it("checks the year only for the owner, with the same rule as /api/ytd", async () => {
    const { handler } = setup();
    for (const year of ["2024", String(currentYear() + 1), "26", "2026a", ""]) {
      expect((await call(handler, { token: OWNER_TOKEN, year })).statusCode).toBe(400);
      expect((await call(handler, { token: OTHER_TOKEN, year })).statusCode).toBe(403);
      expect((await call(handler, { year })).statusCode).toBe(401);
    }
    expect((await call(handler, { token: OWNER_TOKEN, year: "2025" })).statusCode).not.toBe(400);
  });

  it("refuses other methods", async () => {
    const { handler } = setup();
    const res = await call(handler, { token: OWNER_TOKEN, method: "POST" });
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("GET");
  });

  it("returns 404 when the year has no row or the private block is unusable", async () => {
    const missing = setup({ readPayload: async () => undefined });
    expect((await call(missing.handler, { token: OWNER_TOKEN })).statusCode).toBe(404);
    const noPrivate = setup({ readPayload: async () => publicFixture });
    expect((await call(noPrivate.handler, { token: OWNER_TOKEN })).statusCode).toBe(404);
    const wrongYear = setup({ readPayload: async () => ({ ...ROW, year: 2025 }) });
    expect((await call(wrongYear.handler, { token: OWNER_TOKEN })).statusCode).toBe(404);
  });

  it("logs error codes only, never a token or a payload", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = setup({
      readPayload: async () => {
        const err = new Error(`connection to postgres://user:secret@host failed for ${OWNER_TOKEN}`);
        err.code = "ECONNREFUSED";
        throw err;
      },
    });
    const res = await call(failing.handler, { token: OWNER_TOKEN });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
    const logged = JSON.stringify(errors.mock.calls);
    expect(logged).toContain("ECONNREFUSED");
    expect(logged).not.toContain("secret");
    expect(logged).not.toContain(OWNER_TOKEN);
  });

  it("returns 500, not 401, when Supabase cannot be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = createWrapPrivateHandler({
      getUser: async () => {
        throw Object.assign(new Error("fetch failed"), { name: "AuthRetryableFetchError" });
      },
      readPayload: async () => ROW,
      ownerId: () => OWNER,
    });
    expect((await call(handler, { token: OWNER_TOKEN })).statusCode).toBe(500);
  });

  it("fails closed when OWNER_USER_ID is not set", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const getUser = vi.fn(async () => ({ id: OWNER }));
    const handler = createWrapPrivateHandler({ getUser, readPayload: async () => ROW, ownerId: () => undefined });
    expect((await call(handler, { token: OWNER_TOKEN })).statusCode).toBe(500);
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe("the deployed handler (api/wrap-private.js)", () => {
  it("returns 401 without a token, before touching Supabase or the database", async () => {
    const res = await call(realHandler);
    expect(res.statusCode).toBe(401);
    expect(res.headers["cache-control"]).toBe("private, no-store, max-age=0");
  });
});

describe("bearerToken", () => {
  it("reads the Authorization header only", () => {
    expect(bearerToken({ authorization: `Bearer ${OWNER_TOKEN}` })).toBe(OWNER_TOKEN);
    expect(bearerToken({})).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken({ authorization: ["Bearer", OWNER_TOKEN] })).toBeNull();
    expect(bearerToken({ authorization: `Bearer ${"a".repeat(9000)}.b.c` })).toBeNull();
  });
});
