// Shared by the home page YTD section and the lazy /<year> wrap page.
// Keep this module small: it ships in the home page bundle.

export const TIME_ZONE = "America/Chicago";
export const FIRST_WRAP_YEAR = 2025;

export function currentYear() {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()));
}

// Returns the year when the path is /<year> (optionally with a trailing slash)
// and the year has a wrap, else null.
export function wrapYearFromPath(pathname) {
  const match = /^\/(\d{4})\/?$/.exec(pathname ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  return year >= FIRST_WRAP_YEAR && year <= currentYear() ? year : null;
}

// /wrap (optionally with a trailing slash) always means the current year's wrap, in Chicago
// time, so links and the app shortcut never need a yearly edit. Returns that /<year> path, else null.
export function wrapAliasTarget(pathname) {
  return /^\/wrap\/?$/.test(pathname ?? "") ? `/${currentYear()}` : null;
}

// as_of is the refresh date (YYYY-MM-DD); format it without a time zone shift.
export function formatAsOf(asOf) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf ?? "");
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

export async function loadYtd(year, signal) {
  try {
    const res = await fetch(`/api/ytd?year=${year}`, { signal });
    if (!res.ok) throw new Error(`YTD request failed with ${res.status}`);
    return await res.json();
  } catch (err) {
    // The Vite dev server has no /api, so local development falls back to that year's fixture.
    // This branch is removed from production builds, fixtures included.
    if (import.meta.env.DEV && err.name !== "AbortError") {
      const fixtures = import.meta.glob("../wrap/fixtures/*.json", { import: "default" });
      const fixture = fixtures[`../wrap/fixtures/${year}.json`];
      if (fixture) {
        console.info(`YTD: using the local ${year} fixture in development`);
        return await fixture();
      }
    }
    throw err;
  }
}

export function isUsable(data) {
  return Boolean(data && data.version === 1 && data.totals && typeof data.totals === "object");
}
