// Narrative lines for the wrap, written by rules in the browser (plan decision 3).
//
// Each rule has a chapter, an eligibility check and a line. A rule only speaks when the payload
// gives it enough to say something true and worth saying; otherwise it stays quiet, and the
// chapter shows what it has. Public rules read the public payload only, so every line is as
// public as the numbers behind it: counts, months, titles and places, never money or exact dates.
//
// Private rules (PRIVATE_RULES, the money, trips, training and timeline chapters) read
// data.private, which only exists in the signed-in owner's private view (api/wrap-private.js).
// Each one is ineligible without it, so a public payload never produces a private line.
// Spending is budget_spend; trip spend is only ever compared with it as a share, never added.
//
// Chapter gates live here too, so "too thin to show" is decided in one place and tested with
// the rules.

import { countryName, listOf, newPlaces, stateName } from "../lib/regions.js";
import { formatMoney, formatNumber, formatPercent, monthName, plural } from "./format.js";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

// Small counts read better as words in a sentence: "two races", but "131 workouts".
export function count(n) {
  return Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : formatNumber(n);
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function months(d) {
  return (d.monthly ?? []).filter((m) => m && Number.isInteger(m.month));
}

// The month with the highest value (the earliest one on a tie), or null when all are zero.
function peak(list, key) {
  let best = null;
  for (const item of list) if (num(item[key]) > 0 && (!best || num(item[key]) > num(best[key]))) best = item;
  return best;
}

function sum(list, key) {
  return list.reduce((total, item) => total + num(item[key]), 0);
}

// The count-only line, for payloads from before the new-region lists existed.
function newRegionCounts(totals) {
  const { countries, new_countries: newCountries, new_us_states: newStates } = totals ?? {};
  const parts = [];
  if (num(newCountries) > 0) {
    parts.push(newCountries === countries ? "Every one of them a first" : `${capitalize(count(newCountries))} of them for the first time`);
  }
  if (num(newStates) > 0) parts.push(`${count(newStates)} new US ${plural(newStates, "state")}`);
  if (parts.length === 2) return `${parts[0]}, plus ${parts[1]}.`;
  return `${capitalize(parts[0])}.`;
}

// Longest run of consecutive calendar weeks with at least one workout.
export function longestWeekStreak(weekly) {
  const active = new Set((weekly ?? []).filter((w) => num(w.workouts) > 0).map((w) => w.week));
  let best = 0;
  let run = 0;
  for (let week = 1; week <= 53; week++) {
    run = active.has(week) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function dayOfYear(asOf) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf ?? "");
  if (!match) return null;
  const date = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.round((date - Date.UTC(Number(match[1]), 0, 1)) / 86400000) + 1;
}

function daysInYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

export const RULES = [
  {
    id: "data-rate",
    chapter: "opening",
    eligible: (d) => num(d.totals?.data_points) > 0 && (d.is_partial === false || dayOfYear(d.as_of) !== null),
    line: (d) => {
      const days = d.is_partial === false ? daysInYear(d.year) : dayOfYear(d.as_of);
      const rate = num(d.totals.data_points) / days;
      return `About ${formatNumber(rate, 1)} a day, every day of the year${d.is_partial === false ? "" : " so far"}.`;
    },
  },
  {
    id: "trip-shape",
    chapter: "travel",
    eligible: (d) => (d.travel?.trips ?? []).some((t) => (t.stops ?? []).length > 0),
    line: (d) => {
      const trips = (d.travel.trips ?? []).filter((t) => (t.stops ?? []).length > 0);
      const cities = new Set(trips.flatMap((t) => t.stops.map((s) => s.city))).size;
      const when = [...new Set(trips.map((t) => t.month).filter(Boolean))].sort((a, b) => a - b).map(monthName);
      const timing = when.length === 1 ? `, all in ${when[0]}` : when.length ? `, in ${listOf(when)}` : "";
      return `${capitalize(count(trips.length))} ${plural(trips.length, "trip")}, ${count(cities)} ${plural(cities, "city", "cities")}${timing}.`;
    },
  },
  {
    id: "new-regions",
    chapter: "travel",
    eligible: (d) => {
      const { countries, states } = newPlaces(d);
      return countries.length > 0 || states.length > 0 || num(d.totals?.new_countries) > 0 || num(d.totals?.new_us_states) > 0;
    },
    line: (d) => {
      const { countries, states } = newPlaces(d);
      // Older payloads carry counts only; say what the counts can.
      if (!countries.length && !states.length) return newRegionCounts(d.totals);

      let first = null;
      if (countries.length) {
        const names = countries.map(countryName);
        if (countries.length > 1 && countries.length === num(d.totals?.countries)) first = "Every one of them a first";
        else if (names.length <= 5) first = `${listOf(names)} for the first time`;
        else first = `${capitalize(count(names.length))} of them for the first time, among them ${listOf(names.slice(0, 3))}`;
      }
      const stateNames = states.map(stateName);
      const statePart = stateNames.length <= 4 ? listOf(stateNames) : `${count(stateNames.length)} new US states`;
      if (first && stateNames.length) return `${first}, plus ${statePart}.`;
      if (first) return `${first}.`;
      return stateNames.length <= 4 ? `${statePart} for the first time.` : `${capitalize(statePart)}.`;
    },
  },
  {
    id: "top-activity",
    chapter: "fitness",
    eligible: (d) => (d.fitness?.by_type ?? []).some((t) => num(t.hours) > 0),
    line: (d) => {
      const top = [...d.fitness.by_type].sort((a, b) => num(b.hours) - num(a.hours))[0];
      const share = Math.round((num(top.hours) / num(d.totals?.active_hours || sum(d.fitness.by_type, "hours"))) * 100);
      const shareText = share >= 40 && share <= 100 ? `, ${share}% of all active time` : "";
      return `${top.type} took the most time: ${formatNumber(top.hours, 1)} hours over ${formatNumber(top.sessions)} ${plural(top.sessions, "session")}${shareText}.`;
    },
  },
  {
    id: "week-streak",
    chapter: "fitness",
    eligible: (d) => longestWeekStreak(d.weekly) >= 4,
    line: (d) => `The longest streak: ${count(longestWeekStreak(d.weekly))} weeks in a row with at least one workout.`,
  },
  {
    id: "busiest-workout-month",
    chapter: "fitness",
    eligible: (d) => months(d).filter((m) => num(m.workouts) > 0).length >= 3,
    line: (d) => {
      const top = peak(months(d), "workouts");
      return `${monthName(top.month)} was the busiest month, with ${formatNumber(top.workouts)} workouts.`;
    },
  },
  {
    id: "races",
    chapter: "fitness",
    eligible: (d) => num(d.totals?.races) > 0,
    line: (d) => {
      const { races, race_prs: prs } = d.totals;
      const verdict =
        num(prs) === 0
          ? "no PRs this time"
          : prs === races
            ? races === 1
              ? "and it was a PR"
              : races === 2
                ? "both of them PRs"
                : "every one a PR"
            : `${count(prs)} of them ${plural(prs, "a PR", "PRs")}`;
      return `${capitalize(count(races))} ${plural(races, "race")}, ${verdict}.`;
    },
  },
  {
    id: "run-peak",
    chapter: "fitness",
    eligible: (d) => num(d.totals?.miles_run) >= 20 && peak(months(d), "miles_run") !== null,
    line: (d) => {
      const top = peak(months(d), "miles_run");
      return `${monthName(top.month)} was the biggest running month: ${formatNumber(top.miles_run, 1)} miles.`;
    },
  },
  {
    id: "busiest-watch-month",
    chapter: "film-tv",
    eligible: (d) => num(d.totals?.titles) >= 12 && months(d).filter((m) => num(m.titles) > 0).length >= 3,
    line: (d) => {
      const top = peak(months(d), "titles");
      return `${monthName(top.month)} was the biggest watching month, with ${formatNumber(top.titles)} titles.`;
    },
  },
  {
    id: "rating-habit",
    chapter: "film-tv",
    eligible: (d) => sum(d.media?.rating_dist ?? [], "count") >= 10,
    line: (d) => {
      const dist = d.media.rating_dist;
      const top = peak(dist, "count");
      const total = sum(dist, "count");
      return `${formatNumber(top.stars, 1)} stars was the usual verdict: ${formatNumber(top.count)} of ${formatNumber(total)} ratings.`;
    },
  },
  {
    id: "top-genre",
    chapter: "film-tv",
    eligible: (d) => (d.media?.genres ?? []).filter((g) => num(g.count) > 0).length >= 2,
    line: (d) => {
      const [first, second] = [...d.media.genres].sort((a, b) => num(b.count) - num(a.count));
      const close = num(first.count) - num(second.count) <= Math.max(2, num(first.count) * 0.1);
      return `${first.genre} led the genres with ${formatNumber(first.count)} titles, ${close ? "just " : ""}ahead of ${second.genre} with ${formatNumber(second.count)}.`;
    },
  },
  {
    id: "oldest-favorite",
    chapter: "film-tv",
    eligible: (d) => {
      const years = (d.media?.top_titles ?? []).map((t) => t.release_year).filter(Number.isInteger);
      return years.length >= 3 && Math.max(...years) - Math.min(...years) >= 20;
    },
    line: (d) => {
      const oldest = [...d.media.top_titles]
        .filter((t) => Number.isInteger(t.release_year))
        .sort((a, b) => a.release_year - b.release_year)[0];
      return `The oldest favorite dates to ${oldest.release_year}: ${oldest.title}.`;
    },
  },
  {
    id: "hours-vs-workouts",
    chapter: "patterns",
    eligible: (d) => {
      const list = months(d);
      const hours = peak(list, "active_hours");
      const workouts = peak(list, "workouts");
      return list.length >= 3 && hours !== null && workouts !== null && hours.month !== workouts.month;
    },
    line: (d) => {
      const hours = peak(months(d), "active_hours");
      const workouts = peak(months(d), "workouts");
      return `Active hours peaked in ${monthName(hours.month)} (${formatNumber(hours.active_hours, 1)}), workouts in ${monthName(workouts.month)} (${formatNumber(workouts.workouts)}).`;
    },
  },
  {
    id: "travel-month-dip",
    chapter: "patterns",
    eligible: (d) => {
      const list = months(d);
      const away = peak(list, "days_traveled");
      if (!away || list.length < 3) return false;
      const others = list.filter((m) => m.month !== away.month);
      const average = sum(others, "workouts") / others.length;
      return average > 0 && num(away.workouts) <= average * 0.75;
    },
    line: (d) => {
      const list = months(d);
      const away = peak(list, "days_traveled");
      const lowest = list.every((m) => num(m.workouts) >= num(away.workouts));
      return lowest
        ? `${monthName(away.month)}, the month on the road, had the fewest workouts: ${formatNumber(away.workouts)}.`
        : `Workouts dipped to ${formatNumber(away.workouts)} in ${monthName(away.month)}, the month on the road.`;
    },
  },
  {
    id: "no-empty-months",
    chapter: "patterns",
    eligible: (d) => {
      const list = months(d);
      return list.length >= 3 && list.every((m) => num(m.workouts) > 0 && num(m.titles) > 0);
    },
    line: (d) =>
      `Every month ${d.is_partial === false ? "" : "so far "}had at least one workout and one title: ${count(months(d).length)} for ${count(months(d).length)}.`,
  },
];

// Private view helpers. The private block, or an empty one, so rules can read it safely.
function priv(d) {
  return d?.private && typeof d.private === "object" ? d.private : null;
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Months that are over: every month of a final year, else the months before the refresh month,
// whose figures can still change.
function fullMonths(d, list) {
  if (d.is_partial === false) return list;
  const asOfMonth = Number(/^\d{4}-(\d{2})/.exec(d.as_of ?? "")?.[1]) || 13;
  return list.filter((m) => m.month < asOfMonth);
}

function spendMonths(d) {
  return (priv(d)?.money?.monthly ?? []).filter((m) => m && Number.isInteger(m.month) && isNum(m.spend));
}

function plannedMonths(d) {
  return spendMonths(d).filter((m) => num(m.planned) > 0);
}

function soFar(d) {
  return d.is_partial === false ? "" : " so far";
}

const APP_NAMES = { batchburn: "BatchBurn", batchflix: "BatchFlix", batchport: "BatchPort" };

// The cross-app timeline without episodes. BatchBrain's timeline counts BatchFlix's
// life_events, which are title_watched plus episode_watched; episode logging began in June 2026
// and was backfilled, so episodes would swamp the months they landed in. The public payload's
// monthly titles is life_monthly.titles_watched, the same count as title_watched events, so it
// stands in for BatchFlix here (null where the month has no BatchFlix data).
export function timelineWithoutEpisodes(d) {
  const titles = new Map(months(d).map((m) => [m.month, isNum(m.titles) ? m.titles : null]));
  return (priv(d)?.timeline ?? [])
    .filter((m) => m && Number.isInteger(m.month))
    .map((m) => ({ ...m, batchflix: titles.has(m.month) ? titles.get(m.month) : null }));
}

function timelineTotals(d) {
  return timelineWithoutEpisodes(d).map((m) => ({ month: m.month, total: num(m.batchburn) + num(m.batchflix) + num(m.batchport) }));
}

// Bills paid in one go (BatchBrain's fixed_bill_categories) reach 100% of plan early in the
// month, so they never lead the "where it went" line. The payload's own flag or list wins when
// present; otherwise these are the defaults.
export const DEFAULT_FIXED_BILLS = ["Taxes", "Insurance", "Student Loans"];

export function isFixedBill(d, category) {
  if (typeof category?.is_fixed_bill === "boolean") return category.is_fixed_bill;
  const list = priv(d)?.money?.fixed_bill_categories;
  const names = Array.isArray(list) ? list : DEFAULT_FIXED_BILLS;
  const name = String(category?.category ?? "").toLowerCase();
  return names.some((n) => String(n).toLowerCase() === name);
}

function topFlexibleCategory(d) {
  return (priv(d)?.money?.top_categories ?? []).find((c) => num(c.spend) > 0 && !isFixedBill(d, c)) ?? null;
}

function strengthSessions(d) {
  return sum(priv(d)?.fitness_private?.strength ?? [], "sessions");
}

// A share as a percent for copy: "about 10%", or "under 1%".
function sharePercent(ratio) {
  const pct = ratio * 100;
  return pct < 1 ? "under 1%" : `about ${formatPercent(Math.round(pct))}`;
}

export const PRIVATE_RULES = [
  {
    id: "spend-vs-plan",
    chapter: "money",
    // Completed months only: the month in progress has its full plan but only part of its spend,
    // so counting it would flatter the year to date.
    eligible: (d) => num(priv(d)?.money?.totals?.spend) > 0 && fullMonths(d, plannedMonths(d)).length > 0,
    line: (d) => {
      const done = fullMonths(d, plannedMonths(d));
      const plan = sum(done, "planned");
      const share = Math.round((sum(done, "spend") / plan) * 100);
      return d.is_partial === false
        ? `Spending ran at ${share}% of the ${formatMoney(plan)} plan.`
        : `Through ${count(done.length)} full ${plural(done.length, "month")}, spending ran at ${share}% of the ${formatMoney(plan)} plan.`;
    },
  },
  {
    id: "months-under-plan",
    chapter: "money",
    eligible: (d) => fullMonths(d, plannedMonths(d)).length >= 3,
    line: (d) => {
      const done = fullMonths(d, plannedMonths(d));
      const under = done.filter((m) => m.spend <= m.planned).length;
      const span = d.is_partial === false ? "" : " full";
      if (under === done.length) return `Every${span} month${soFar(d)} came in under plan.`;
      if (under === 0) return `No${span} month${soFar(d)} came in under plan.`;
      return `${capitalize(count(under))} of ${count(done.length)}${span} months came in under plan.`;
    },
  },
  {
    id: "top-category",
    chapter: "money",
    // Led by the biggest category that is not a fixed bill.
    eligible: (d) => topFlexibleCategory(d) !== null,
    line: (d) => {
      const top = topFlexibleCategory(d);
      const ofPlan = isNum(top.pct_of_plan) ? `, ${formatPercent(Math.round(top.pct_of_plan))} of its plan` : "";
      const anyFixed = priv(d).money.top_categories.some((c) => num(c.spend) > 0 && isFixedBill(d, c));
      return `${anyFixed ? "Outside fixed bills, " : ""}${top.category} led spending at ${formatMoney(top.spend)}${ofPlan}.`;
    },
  },
  {
    id: "over-plan-categories",
    chapter: "money",
    eligible: (d) => (priv(d)?.money?.top_categories ?? []).filter((c) => isNum(c.pct_of_plan)).length >= 2,
    line: (d) => {
      const over = priv(d)
        .money.top_categories.filter((c) => isNum(c.pct_of_plan) && Math.round(c.pct_of_plan) > 100)
        .sort((a, b) => b.pct_of_plan - a.pct_of_plan);
      const pct = (c) => formatPercent(Math.round(c.pct_of_plan));
      if (!over.length) return "Every top category stayed within its plan.";
      if (over.length === 1) return `Only ${over[0].category} ran over plan, at ${pct(over[0])}.`;
      if (over.length === 2) return `${over[0].category} (${pct(over[0])}) and ${over[1].category} (${pct(over[1])}) ran over plan.`;
      return `${capitalize(count(over.length))} categories ran over plan, led by ${over[0].category} at ${pct(over[0])}.`;
    },
  },
  {
    id: "savings-rate",
    chapter: "money",
    eligible: (d) => isNum(priv(d)?.money?.totals?.savings_rate_pct),
    line: (d) => {
      const rate = priv(d).money.totals.savings_rate_pct;
      if (rate < 0) return `Spending ran ahead of income${soFar(d)}: a savings rate of ${formatPercent(rate, 1)}.`;
      const rated = fullMonths(d, spendMonths(d).filter((m) => isNum(m.savings_rate_pct)));
      const best = rated.length >= 3 ? rated.reduce((a, b) => (b.savings_rate_pct > a.savings_rate_pct ? b : a)) : null;
      // The chapter shows the rate itself; the line adds the best month when there is one.
      return best && best.savings_rate_pct > rate
        ? `${monthName(best.month)} saved the most: ${formatPercent(best.savings_rate_pct, 1)} of its income.`
        : `${formatPercent(rate, 1)} of income saved${soFar(d)}.`;
    },
  },
  {
    id: "net-worth",
    chapter: "money",
    eligible: (d) => {
      const nw = priv(d)?.money?.net_worth;
      return isNum(nw?.start) && isNum(nw?.latest) && Math.round(nw.latest - nw.start) !== 0;
    },
    line: (d) => {
      const { start, latest } = priv(d).money.net_worth;
      const change = latest - start;
      const pct = start > 0 ? `, ${Math.round(Math.abs(change / start) * 100)}% ${change > 0 ? "higher" : "lower"}` : "";
      const verb = change > 0 ? "up" : "down";
      return d.is_partial === false
        ? `Net worth ended the year ${verb} ${formatMoney(Math.abs(change))}${pct}.`
        : `Net worth is ${verb} ${formatMoney(Math.abs(change))} so far this year${pct}.`;
    },
  },
  {
    id: "trip-share",
    chapter: "trips",
    eligible: (d) => isNum(priv(d)?.travel_private?.trip_spend_share) && priv(d).travel_private.trip_spend_share > 0,
    line: (d) =>
      `Trip spending came to ${sharePercent(priv(d).travel_private.trip_spend_share)} of budget spending. It is a share of the same purchases, never added on top.`,
  },
  {
    id: "trip-per-day",
    chapter: "trips",
    eligible: (d) => (priv(d)?.travel_private?.trips ?? []).some((t) => num(t.spend_per_day) > 0 && num(t.days) > 0),
    line: (d) => {
      const priced = priv(d).travel_private.trips.filter((t) => num(t.spend_per_day) > 0 && num(t.days) > 0);
      const top = priced.reduce((a, b) => (b.spend_per_day > a.spend_per_day ? b : a));
      const name = top.name ?? "The trip";
      const rate = `${formatMoney(top.spend_per_day)} a day over ${count(top.days)} ${plural(top.days, "day")}`;
      return priced.length === 1 ? `${name} ran ${rate}.` : `${name} was the priciest per day, at ${rate}.`;
    },
  },
  {
    id: "top-routine",
    chapter: "training",
    eligible: (d) => (priv(d)?.fitness_private?.strength ?? []).some((r) => r.routine && num(r.sessions) > 0),
    line: (d) => {
      const named = priv(d).fitness_private.strength.filter((r) => r.routine && num(r.sessions) > 0);
      const top = named.reduce((a, b) => (b.sessions > a.sessions ? b : a));
      const total = strengthSessions(d);
      return top.sessions === total
        ? `${top.routine} was the only routine: ${count(total)} strength ${plural(total, "session")}.`
        : `${top.routine} was the go-to routine: ${count(top.sessions)} of ${count(total)} strength sessions.`;
    },
  },
  {
    id: "stretching",
    chapter: "training",
    eligible: (d) => num(priv(d)?.fitness_private?.stretch_sessions) > 0,
    line: (d) => {
      const { stretch_sessions: sessions, stretch_minutes: minutes } = priv(d).fitness_private;
      const time =
        num(minutes) >= 120
          ? `, ${formatNumber(minutes / 60, 1)} hours`
          : num(minutes) > 0
            ? `, ${formatNumber(minutes)} minutes`
            : "";
      return `Stretching, kept apart from workouts: ${count(sessions)} ${plural(sessions, "session")}${time}.`;
    },
  },
  {
    id: "busiest-app-month",
    chapter: "timeline",
    eligible: (d) => timelineTotals(d).filter((m) => m.total > 0).length >= 3,
    line: (d) => {
      const top = peak(timelineTotals(d), "total");
      return `${monthName(top.month)} was the busiest month across the apps, with ${formatNumber(top.total)} logged events.`;
    },
  },
  {
    id: "top-app",
    chapter: "timeline",
    eligible: (d) => timelineTotals(d).some((m) => m.total > 0),
    line: (d) => {
      const list = timelineWithoutEpisodes(d);
      const totals = Object.keys(APP_NAMES).map((app) => ({ app, total: sum(list, app) }));
      const top = totals.reduce((a, b) => (b.total > a.total ? b : a));
      const all = sum(totals, "total");
      return `${APP_NAMES[top.app]} logged the most: ${formatNumber(top.total)} of ${formatNumber(all)} events${soFar(d)}.`;
    },
  },
];

const ALL_RULES = [...RULES, ...PRIVATE_RULES];

// Every rule's line that is eligible for this payload, optionally for one chapter.
export function insights(data, chapter) {
  if (!data?.totals) return [];
  return ALL_RULES.filter((rule) => !chapter || rule.chapter === chapter)
    .filter((rule) => {
      try {
        return rule.eligible(data);
      } catch {
        return false;
      }
    })
    .map((rule) => ({ id: rule.id, chapter: rule.chapter, text: rule.line(data) }));
}

// One rule's line, or null when it is not eligible.
export function insight(data, id) {
  return insights(data).find((line) => line.id === id)?.text ?? null;
}

// When a chapter has enough to show. Opening and closing always show.
export const CHAPTER_GATES = {
  opening: () => true,
  travel: (d) => num(d.totals?.trips) >= 1 && (d.travel?.trips ?? []).some((t) => (t.stops ?? []).length > 0),
  fitness: (d) => num(d.totals?.workouts) >= 10,
  "film-tv": (d) => num(d.totals?.titles) >= 10,
  patterns: (d) => months(d).length >= 3 && insights(d, "patterns").length > 0,
  closing: () => true,
  // Private chapters: only with data.private, which only the signed-in owner's view carries.
  money: (d) => num(priv(d)?.money?.totals?.spend) > 0 && spendMonths(d).length > 0,
  trips: (d) => (priv(d)?.travel_private?.trips ?? []).length > 0,
  training: (d) => strengthSessions(d) > 0 || num(priv(d)?.fitness_private?.stretch_sessions) > 0,
  timeline: (d) => timelineTotals(d).filter((m) => m.total > 0).length >= 2,
};

export function isChapterEligible(id, data) {
  const gate = CHAPTER_GATES[id];
  return Boolean(data?.totals) && (gate ? gate(data) : true);
}
