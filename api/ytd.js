import process from "node:process";
import postgres from "postgres";
import { toPublicYtd } from "./_lib/ytd-payload.js";

// GET /api/ytd?year=YYYY returns the public year in review for one year.
// Reads brain.public_ytd (a materialized view BatchBrain refreshes hourly) as site_reader, the
// role that can read that view and nothing else, through the Supabase transaction pooler.

const FIRST_YEAR = 2025;
const TIME_ZONE = "America/Chicago";
const CACHE_OK = "public, s-maxage=3600, stale-while-revalidate=86400";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

let sql;

function getSql() {
  if (sql) return sql;
  const url = process.env.YTD_DATABASE_URL;
  if (!url) return null;

  const options = {
    // The transaction pooler hands each transaction to any backend, so no named prepared statements.
    prepare: false,
    // The one column read is jsonb, which postgres.js parses without the type lookup query.
    fetch_types: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "batch-apps-home-ytd" },
    onnotice: () => {},
  };
  // TLS for anything but a local database, unless the URL sets sslmode itself.
  const parsed = new URL(url);
  if (!parsed.searchParams.has("sslmode")) {
    options.ssl = LOCAL_HOSTS.has(parsed.hostname) ? false : "require";
  }
  sql = postgres(url, options);
  return sql;
}

function currentYear() {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()));
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

  const rawYear = typeof req.query?.year === "string" ? req.query.year : "";
  const year = /^\d{4}$/.test(rawYear) ? Number(rawYear) : NaN;
  if (!(year >= FIRST_YEAR && year <= currentYear())) {
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
