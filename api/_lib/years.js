// The years a wrap exists for: 2025 through the current year in America/Chicago.
// Shared by /api/ytd and /api/wrap-private so both accept exactly the same years.

export const FIRST_YEAR = 2025;
const TIME_ZONE = "America/Chicago";

export function currentYear() {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric" }).format(new Date()));
}

// The year from ?year=YYYY, or null when it is missing, malformed or out of range.
export function yearFromQuery(query) {
  const raw = typeof query?.year === "string" ? query.year : "";
  const year = /^\d{4}$/.test(raw) ? Number(raw) : NaN;
  return year >= FIRST_YEAR && year <= currentYear() ? year : null;
}
