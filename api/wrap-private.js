import process from "node:process";
import { getSupabaseUser } from "./_lib/owner-auth.js";
import { openReader } from "./_lib/pg.js";
import { createWrapPrivateHandler } from "./_lib/wrap-private-route.js";

// GET /api/wrap-private?year=YYYY with "Authorization: Bearer <Supabase access token>" returns
// the private year in review: the public payload plus money, trip names and dates, strength
// routines, stretching and the cross-app timeline. Owner only (OWNER_USER_ID): 401 without a
// valid token, 403 for anyone else. Never cached (private, no-store).
//
// Reads brain.private_wrap (materialized, refreshed hourly with public_ytd) as
// wrap_owner_reader, the role that can read that view and nothing else, through the pooler.
// The rules live in api/_lib/wrap-private-route.js and its tests.

let sql;

function getSql() {
  if (sql) return sql;
  const url = process.env.WRAP_PRIVATE_DATABASE_URL;
  if (!url) return null;
  sql = openReader(url, "batch-apps-home-wrap-private");
  return sql;
}

async function readPayload(year) {
  const db = getSql();
  if (!db) {
    const err = new Error("WRAP_PRIVATE_DATABASE_URL is missing");
    err.code = "WRAP_PRIVATE_NOT_CONFIGURED";
    throw err;
  }
  const rows = await db`select payload from brain.private_wrap where year = ${year}`;
  return rows[0]?.payload;
}

export default createWrapPrivateHandler({
  getUser: getSupabaseUser,
  readPayload,
  ownerId: () => process.env.OWNER_USER_ID,
});
