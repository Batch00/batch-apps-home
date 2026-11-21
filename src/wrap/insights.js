// Narrative lines for the wrap, written by rules in the browser (plan decision 3).
//
// Each rule has a chapter, an eligibility check and a line. A rule only speaks when the payload
// gives it enough to say something true and worth saying; otherwise it stays quiet, and the
// chapter shows what it has. Rules read the public payload only, so every line is as public as
// the numbers behind it: counts, months, titles and places, never money or exact dates.
//
// Chapter gates live here too, so "too thin to show" is decided in one place and tested with
// the rules.

import { countryName, listOf, newPlaces, stateName } from "../lib/regions.js";
import { formatNumber, monthName, plural } from "./format.js";

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

// Every rule's line that is eligible for this payload, optionally for one chapter.
export function insights(data, chapter) {
  if (!data?.totals) return [];
  return RULES.filter((rule) => !chapter || rule.chapter === chapter)
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
};

export function isChapterEligible(id, data) {
  const gate = CHAPTER_GATES[id];
  return Boolean(data?.totals) && (gate ? gate(data) : true);
}
