import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The owner sign-in path, with Supabase and fetch stood in: nothing here reaches the network.
// Regression: on the Vercel preview, the private request went out without the site's cookies,
// Vercel's deployment protection answered instead of the API, and the page signed the owner out.

const auth = {
  signInWithPassword: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
};
vi.mock("../../lib/supabase.js", () => ({ supabase: { auth } }));

const { API_MARKER, SignInError, loadStoredSession, signInAndLoad } = await import("./session.js");

// Fake values shaped like a session; never real.
const FRESH_TOKEN = "fresh.header.signature";
const STORED_TOKEN = "stored.header.signature";
const BLOCK = { version: 1, money: {}, travel_private: {}, fitness_private: {}, timeline: [] };

function response(status, body, { fromApi = true } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (fromApi) headers.set(API_MARKER, "1");
  return new Response(JSON.stringify(body), { status, headers });
}

let fetchMock;

beforeEach(() => {
  // Production behavior: no development sample fallback.
  vi.stubEnv("DEV", false);
  auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: FRESH_TOKEN } }, error: null });
  auth.getSession.mockResolvedValue({ data: { session: { access_token: STORED_TOKEN } } });
  fetchMock = vi.fn(async () => response(200, { year: 2026, private: BLOCK }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("signInAndLoad", () => {
  it("sends the token from signInWithPassword straight to the API and keeps the session", async () => {
    const result = await signInAndLoad(2026, "owner@example.test", "pw");
    expect(result).toEqual({ status: "owner", block: BLOCK });
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/wrap-private?year=2026");
    expect(url).not.toContain(FRESH_TOKEN);
    expect(init.headers.Authorization).toBe(`Bearer ${FRESH_TOKEN}`);
    expect(init.cache).toBe("no-store");
    // Same-origin cookies reach Vercel's preview protection; redirects are never followed.
    expect(init.credentials).toBe("same-origin");
    expect(init.redirect).toBe("error");
  });

  it("keeps the session when something in front of the API answers 401 (preview protection)", async () => {
    fetchMock.mockResolvedValueOnce(response(401, { error: "Authentication Required" }, { fromApi: false }));
    expect(await signInAndLoad(2026, "owner@example.test", "pw")).toEqual({ status: "unavailable" });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("keeps the session when the protection redirect makes fetch fail", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await signInAndLoad(2026, "owner@example.test", "pw")).toEqual({ status: "unavailable" });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("keeps a fresh session even if the API refuses it, so a retry can load it", async () => {
    fetchMock.mockResolvedValueOnce(response(401, { error: "Sign in required" }));
    expect(await signInAndLoad(2026, "owner@example.test", "pw")).toEqual({ status: "unavailable" });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("signs out only when the API itself says the account is not the owner", async () => {
    fetchMock.mockResolvedValueOnce(response(403, { error: "This view is for the owner only" }));
    expect(await signInAndLoad(2026, "someone@example.test", "pw")).toEqual({ status: "forbidden" });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });

    auth.signOut.mockClear();
    fetchMock.mockResolvedValueOnce(response(403, { error: "Forbidden" }, { fromApi: false }));
    expect(await signInAndLoad(2026, "owner@example.test", "pw")).toEqual({ status: "unavailable" });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("never calls the API when the password sign-in fails", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { status: 400, message: "Invalid login credentials" } });
    await expect(signInAndLoad(2026, "owner@example.test", "wrong")).rejects.toMatchObject({ name: "SignInError", kind: "credentials" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(SignInError).toBeTypeOf("function");
  });

  it("never logs the token", async () => {
    const spies = ["log", "info", "warn", "error", "debug"].map((level) => vi.spyOn(console, level).mockImplementation(() => {}));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await signInAndLoad(2026, "owner@example.test", "pw");
    await signInAndLoad(2026, "owner@example.test", "pw");
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain(FRESH_TOKEN);
    expect(logged).not.toContain("pw");
  });
});

describe("loadStoredSession (after a reload)", () => {
  it("uses the stored session's token and keeps it", async () => {
    expect(await loadStoredSession(2026)).toEqual({ status: "owner", block: BLOCK });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${STORED_TOKEN}`);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("stays public without a session and never calls the API or logout", async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    expect(await loadStoredSession(2026)).toEqual({ status: "idle" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("keeps the session on anything but the API's own 403", async () => {
    fetchMock.mockResolvedValueOnce(response(401, {}, { fromApi: false }));
    expect(await loadStoredSession(2026)).toEqual({ status: "unavailable" });
    fetchMock.mockResolvedValueOnce(response(500, { error: "Internal server error" }));
    expect(await loadStoredSession(2026)).toEqual({ status: "unavailable" });
    expect(auth.signOut).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(response(403, { error: "This view is for the owner only" }));
    expect(await loadStoredSession(2026)).toEqual({ status: "idle" });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
