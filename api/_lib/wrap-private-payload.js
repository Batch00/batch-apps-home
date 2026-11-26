// Rebuilds a brain.private_wrap payload: the public part through toPublicYtd, plus the private
// block (version 1, BatchBrain migration 0018) rebuilt from its known shape.
//
// The private block carries money, trip names, exact trip and stop dates and routine names, so
// it is served only to the signed-in owner (api/wrap-private.js) and never cached. This gate
// still matters there: any key the shape below does not name is dropped, numbers must be finite
// and in range, dates must be bare YYYY-MM-DD, so a new BatchBrain field never reaches the page
// until it is added here on purpose.
//
// Spending rule: budget_spend is the spending number. trip_spend appears per trip and as
// trip_spend_share, a ratio to budget_spend, and the page never adds the two.

import { code, int, list, mapList, num, obj, text } from "./allowlist.js";
import { toPublicYtd } from "./ytd-payload.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TRIP_STATUSES = new Set(["completed", "ongoing"]);
// Generous bounds that still reject nonsense: amounts in USD, percents, a ratio.
const MAX_AMOUNT = 1e9;
const MAX_PCT = 1e5;
const MAX_TOP_CATEGORIES = 20;
const MAX_TRIPS = 100;
const MAX_STOPS = 200;

function amount(value) {
  const n = num(value);
  return n !== null && Math.abs(n) <= MAX_AMOUNT ? Math.round(n * 100) / 100 : null;
}

function pct(value) {
  const n = num(value);
  return n !== null && Math.abs(n) <= MAX_PCT ? Math.round(n * 10) / 10 : null;
}

function ratio(value) {
  const n = num(value);
  return n !== null && n >= 0 && n <= 1000 ? Math.round(n * 10000) / 10000 : null;
}

function date(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d ? value : null;
}

function count(value) {
  return int(value, 0, 1e7);
}

function month(value) {
  return int(value, 1, 12);
}

function money(raw) {
  const m = obj(raw);
  const totals = obj(m.totals);
  const netWorth = obj(m.net_worth);
  const out = {
    monthly: mapList(m.monthly, (row) => {
      const key = month(row.month);
      return key === null
        ? null
        : {
            month: key,
            spend: amount(row.spend),
            planned: amount(row.planned),
            income: amount(row.income),
            savings_rate_pct: pct(row.savings_rate_pct),
          };
    }),
    top_categories: mapList(m.top_categories, (row) => {
      const category = text(row.category, 80);
      if (category === null) return null;
      const out = { category, spend: amount(row.spend), planned: amount(row.planned), pct_of_plan: pct(row.pct_of_plan) };
      // Optional (brain.config.fixed_bill_categories): a bill paid in one go. Kept only as a boolean.
      if (typeof row.is_fixed_bill === "boolean") out.is_fixed_bill = row.is_fixed_bill;
      return out;
    }).slice(0, MAX_TOP_CATEGORIES),
    totals: {
      spend: amount(totals.spend),
      income: amount(totals.income),
      savings_rate_pct: pct(totals.savings_rate_pct),
    },
    net_worth: {
      start: amount(netWorth.start),
      latest: amount(netWorth.latest),
      change: amount(netWorth.change),
      monthly: mapList(netWorth.monthly, (row) => {
        const key = month(row.month);
        return key === null ? null : { month: key, value: amount(row.value) };
      }),
    },
  };
  // Optional: the date of the year's first net worth snapshot, when BatchBrain sends it.
  const startDate = date(netWorth.start_date);
  if (startDate) out.net_worth.start_date = startDate;
  // The fixed-bill category names (BatchBrain 0019, from brain.config). Names only.
  if (Array.isArray(m.fixed_bill_categories)) {
    out.fixed_bill_categories = m.fixed_bill_categories
      .map((name) => text(name, 80))
      .filter(Boolean)
      .slice(0, MAX_TOP_CATEGORIES);
  }
  return out;
}

function travelPrivate(raw) {
  const t = obj(raw);
  return {
    trips: mapList(t.trips, (trip) => {
      const start = date(trip.start_date);
      return start === null
        ? null
        : {
            name: text(trip.name, 120),
            status: TRIP_STATUSES.has(trip.status) ? trip.status : null,
            start_date: start,
            end_date: date(trip.end_date),
            days: int(trip.days, 0, 1000),
            trip_spend: amount(trip.trip_spend),
            spend_per_day: amount(trip.spend_per_day),
            countries: list(trip.countries)
              .map((name) => text(name, 80))
              .filter(Boolean)
              .slice(0, MAX_STOPS),
            stops: mapList(trip.stops, (stop) => {
              const city = text(stop.city, 100);
              return city === null
                ? null
                : {
                    city,
                    country_code: code(stop.country_code),
                    arrival_date: date(stop.arrival_date),
                    departure_date: date(stop.departure_date),
                  };
            }).slice(0, MAX_STOPS),
          };
    }).slice(0, MAX_TRIPS),
    trip_spend_share: ratio(t.trip_spend_share),
  };
}

function fitnessPrivate(raw) {
  const f = obj(raw);
  return {
    stretch_sessions: count(f.stretch_sessions),
    stretch_minutes: amount(f.stretch_minutes),
    // A routine is the workout's note, so it may be null (an unnamed Strength session).
    strength: mapList(f.strength, (row) => {
      const sessions = count(row.sessions);
      return sessions === null
        ? null
        : { routine: text(row.routine, 80), sessions, minutes: amount(row.minutes) };
    }),
  };
}

function timeline(raw) {
  return mapList(raw, (row) => {
    const key = month(row.month);
    return key === null
      ? null
      : { month: key, batchburn: count(row.batchburn), batchflix: count(row.batchflix), batchport: count(row.batchport) };
  });
}

// The private block alone, or null when it is missing or not version 1.
export function toPrivateBlock(raw) {
  const p = obj(raw);
  if (p.version !== 1) return null;
  return {
    version: 1,
    money: money(p.money),
    travel_private: travelPrivate(p.travel_private),
    fitness_private: fitnessPrivate(p.fitness_private),
    timeline: timeline(p.timeline),
  };
}

// The whole private_wrap payload, or null when either part is unusable.
export function toPrivateWrap(raw) {
  const publicPart = toPublicYtd(raw);
  const privatePart = toPrivateBlock(obj(raw).private);
  if (!publicPart || !privatePart) return null;
  return { ...publicPart, private: privatePart };
}
