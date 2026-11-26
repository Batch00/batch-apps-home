import process from "node:process";
import { createClient } from "@supabase/supabase-js";

// Server-side check of a Supabase access token for the private wrap.
//
// The token comes from the Authorization header only (bearerToken). getSupabaseUser asks
// Supabase Auth who it belongs to (auth.getUser, which calls GET /auth/v1/user with the token),
// so an expired, revoked or forged token never passes. The caller then compares the user id
// with OWNER_USER_ID. The anon key is enough for this; the service role key is never used here.

const AUTH_TIMEOUT_MS = 5000;
// A JWT: three base64url segments. Anything else is not worth sending to Supabase.
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 8192;

export class AuthConfigError extends Error {
  constructor() {
    super("Supabase auth is not configured");
    this.name = "AuthConfigError";
    this.code = "AUTH_NOT_CONFIGURED";
  }
}

// The bearer token from "Authorization: Bearer <token>", or null.
export function bearerToken(headers) {
  const value = headers?.authorization;
  if (typeof value !== "string") return null;
  const match = /^Bearer[ ]+(\S+)$/i.exec(value.trim());
  if (!match) return null;
  const token = match[1];
  return token.length <= MAX_TOKEN_LENGTH && JWT_PATTERN.test(token) ? token : null;
}

let client;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new AuthConfigError();
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) }) },
  });
  return client;
}

// Resolves to { id } for a valid token, null for one Supabase rejects (expired, revoked,
// malformed, unknown user). Throws when Supabase cannot be reached or auth is not configured.
export async function getSupabaseUser(token) {
  const { data, error } = await getClient().auth.getUser(token);
  if (error) {
    // 4xx: the token itself was refused. Anything else (network, 5xx) is our failure, not theirs.
    if (typeof error.status === "number" && error.status >= 400 && error.status < 500) return null;
    throw error;
  }
  const id = data?.user?.id;
  return typeof id === "string" && id ? { id } : null;
}
