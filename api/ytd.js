import process from "node:process";
import { openReader } from "./_lib/pg.js";
import { FIRST_YEAR, yearFromQuery } from "./_lib/years.js";
import { toPublicYtd } from "./_lib/ytd-payload.js";

// GET /api/ytd?year=YYYY returns the public year in review for one year.
// Reads brain.public_ytd (a materialized view BatchBrain refreshes hourly) as site_reader, the
// role that can read that view and nothing else, through the Supabase transaction pooler.

const CACHE_OK = "public, s-maxage=3600, stale-while-revalidate=86400";

let sql;

function getSql() {
  if (sql) return sql;
  const url = process.env.YTD_DATABASE_URL;
  if (!url) return null;
  sql = openReader(url, "batch-apps-home-ytd");
  return sql;
}

function fail(res, status, message) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return fail(res, 405, "Method not allowed");
  }

  const year = yearFromQuery(req.query);
  if (year === null) {
    return fail(res, 400, `year must be ${FIRST_YEAR} through the current year`);
  }

  const db = getSql();
  if (!db) {
    console.error("YTD is not configured: YTD_DATABASE_URL is missing");
    return fail(res, 500, "Internal server error");
  }

  try {
    const rows = await db`select payload from brain.public_ytd where year = ${year}`;
    const raw = rows[0]?.payload;
    const payload = toPublicYtd(typeof raw === "string" ? JSON.parse(raw) : raw);
    if (!payload) {
      return fail(res, 404, "No data for that year");
    }
    res.setHeader("Cache-Control", CACHE_OK);
    return res.status(200).json(payload);
  } catch (err) {
    // Log the code only: postgres.js errors can carry connection details.
    console.error("YTD query failed:", err?.code ?? err?.name ?? "unknown");
    return fail(res, 500, "Internal server error");
  }
}
