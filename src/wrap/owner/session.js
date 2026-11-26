// Owner sign-in for the private view of the wrap (/<year> only).
//
// Supabase (src/lib/supabase.js) is loaded only when it is needed: when this device already has
// a stored Supabase session, or when someone opens the sign-in form. Public visitors never
// download it. The private payload lives in memory only: it is never written to localStorage,
// sessionStorage or any cache, and the request asks for no-store as well.

const VIEW_KEY = "batchwrap:view";
// supabase-js v2 stores its session under sb-<project ref>-auth-token.
const SESSION_KEY = /^sb-.+-auth-token$/;

function loadClient() {
  return import("../../lib/supabase.js").then((m) => m.supabase);
}

// Whether this device remembers a Supabase session, without loading Supabase.
export function hasStoredSession() {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      if (SESSION_KEY.test(window.localStorage.key(i) ?? "")) return true;
    }
  } catch {
    // Storage blocked (private mode, a strict browser): treat as signed out.
  }
  return false;
}

// "public" when the owner last chose the public view on this device, else "private".
export function readViewPref() {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "public" ? "public" : "private";
  } catch {
    return "private";
  }
}

export function writeViewPref(view) {
  try {
    window.localStorage.setItem(VIEW_KEY, view === "public" ? "public" : "private");
  } catch {
    // Not remembered on this device; the toggle still works for this visit.
  }
}

// The current access token (refreshed by supabase-js when it has expired), or null.
export async function currentToken() {
  const supabase = await loadClient();
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

export class SignInError extends Error {
  constructor(kind) {
    super(kind);
    this.name = "SignInError";
    this.kind = kind;
  }
}

// Signs in with email and password and resolves the access token.
export async function signIn(email, password) {
  const supabase = await loadClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const kind = error.status === 400 || /invalid/i.test(error.message ?? "") ? "credentials" : error.status === 429 ? "rate" : "network";
    throw new SignInError(kind);
  }
  const token = data?.session?.access_token;
  if (!token) throw new SignInError("network");
  return token;
}

// Clears this device's session. Never throws: signing out must always leave the page public.
export async function signOut() {
  try {
    const supabase = await loadClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The session is gone from this page's state either way.
  }
}

// Development only: the Vite dev server has no /api, so local work uses the synthetic sample.
// The sample is fake data (src/wrap/fixtures/private/sample.json); this branch and the file are
// left out of production builds.
async function devSample() {
  if (import.meta.env.DEV) {
    const sample = await import("../fixtures/private/sample.json");
    console.info("Private wrap: using the synthetic sample in development");
    return sample.default.private;
  }
  return null;
}

// ?private=sample in development skips sign-in and shows the sample, to work on the chapters.
export function devSampleRequested() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).get("private") === "sample";
}

export function loadDevSample() {
  return devSample();
}

// Fetches the private block for the year with the token in the Authorization header (never in
// the URL). Resolves { status: "owner", block }, { status: "forbidden" } (signed in, not the
// owner) or { status: "unauthorized" } (token refused). Throws on any other failure.
export async function fetchPrivateWrap(year, token, signal) {
  let res;
  try {
    res = await fetch(`/api/wrap-private?year=${year}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal,
    });
  } catch (err) {
    if (err?.name !== "AbortError") {
      const sample = await devSample();
      if (sample) return { status: "owner", block: sample };
    }
    throw err;
  }
  if (res.status === 401) return { status: "unauthorized" };
  if (res.status === 403) return { status: "forbidden" };
  if (!res.ok) {
    const sample = res.status === 404 ? await devSample() : null;
    if (sample) return { status: "owner", block: sample };
    throw new Error(`Private wrap request failed with ${res.status}`);
  }
  let json;
  try {
    json = await res.json();
  } catch (err) {
    const sample = await devSample();
    if (sample) return { status: "owner", block: sample };
    throw err;
  }
  if (json?.year !== year || !json.private || json.private.version !== 1) throw new Error("Private wrap payload is not usable");
  return { status: "owner", block: json.private };
}
