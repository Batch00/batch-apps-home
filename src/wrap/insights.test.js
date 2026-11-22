import { describe, expect, it } from "vitest";
import fixture from "./fixtures/2026.json";
import fixture2025 from "./fixtures/2025.json";
import { RULES, count, insight, insights, isChapterEligible, longestWeekStreak } from "./insights.js";

const clone = () => structuredClone(fixture);

// A year with almost nothing logged: every gated chapter should hide and no rule should speak.
const thin = {
  year: 2026,
  as_of: "2026-01-04",
  is_partial: true,
  version: 1,
  totals: { workouts: 2, titles: 1, trips: 0, countries: 0, data_points: 0 },
  monthly: [{ month: 1, workouts: 2, active_hours: 1, miles_run: 3, titles: 1, days_traveled: 0 }],
  weekly: [{ week: 1, workouts: 2 }],
  fitness: { by_type: [], races: [] },
  media: { top_titles: [], genres: [], rating_dist: [] },
  travel: { trips: [], lifetime: { countries: [], us_states: [], stops: [] } },
};

describe("insights on the 2026 fixture", () => {
  it("writes every line from the data", () => {
    expect(Object.fromEntries(insights(fixture).map((l) => [l.id, l.text]))).toEqual({
      "data-rate": "About 3.4 a day, every day of the year so far.",
      "trip-shape": "One trip, four cities, all in September.",
      "new-regions": "Greece, Hungary and Czechia for the first time, plus Arizona and Montana.",
      "top-activity": "Ultimate Frisbee took the most time: 93.7 hours over 37 sessions, 70% of all active time.",
      "week-streak": "The longest streak: 20 weeks in a row with at least one workout.",
      "busiest-workout-month": "November was the busiest month, with 23 workouts.",
      races: "Two races, both of them PRs.",
      "run-peak": "March was the biggest running month: 42.9 miles.",
      "busiest-watch-month": "March was the biggest watching month, with 15 titles.",
      "rating-habit": "4 stars was the usual verdict: 55 of 116 ratings.",
      "top-genre": "Drama led the genres with 41 titles, just ahead of Action with 38.",
      "oldest-favorite": "The oldest favorite dates to 1991: The Silence of the Lambs.",
      "hours-vs-workouts": "Active hours peaked in August (22.9), workouts in November (23).",
      "travel-month-dip": "September, the month on the road, had the fewest workouts: 6.",
      "no-empty-months": "Every month so far had at least one workout and one title: eleven for eleven.",
    });
  });

  it("groups lines by chapter", () => {
    expect(insights(fixture, "travel").map((l) => l.id)).toEqual(["trip-shape", "new-regions"]);
    expect(insights(fixture, "patterns")).toHaveLength(3);
    expect(insight(fixture, "races")).toBe("Two races, both of them PRs.");
    expect(insight(fixture, "not-a-rule")).toBeNull();
  });

  it("keeps every line within the public data rule and the copy rules", () => {
    for (const { text } of insights(fixture)) {
      // No money, no em dash, no full dates.
      expect(text).not.toMatch(/\$|\d{4}-\d{2}-\d{2}/);
      expect(text.includes(String.fromCharCode(0x2014))).toBe(false);
      expect(text).toMatch(/^[A-Z0-9].*\.$/);
    }
  });

  it("shows every chapter", () => {
    for (const id of ["opening", "travel", "fitness", "film-tv", "patterns", "closing"]) {
      expect(isChapterEligible(id, fixture)).toBe(true);
    }
  });
});

describe("thin data", () => {
  it("keeps every rule quiet", () => {
    expect(insights(thin)).toEqual([]);
  });

  it("hides the chapters it cannot fill", () => {
    expect(isChapterEligible("opening", thin)).toBe(true);
    expect(isChapterEligible("closing", thin)).toBe(true);
    for (const id of ["travel", "fitness", "film-tv", "patterns"]) expect(isChapterEligible(id, thin)).toBe(false);
  });

  it("survives a payload with sections missing", () => {
    const bare = { year: 2026, version: 1, totals: {} };
    expect(() => insights(bare)).not.toThrow();
    expect(insights(bare)).toEqual([]);
    expect(insights(null)).toEqual([]);
  });

  it("checks every rule's eligibility against thin data without throwing", () => {
    for (const rule of RULES) expect(() => rule.eligible(thin)).not.toThrow();
  });
});

describe("rule edges", () => {
  it("uses the whole year once the year is final", () => {
    const final = { ...clone(), is_partial: false };
    expect(insight(final, "data-rate")).toBe("About 3.1 a day, every day of the year.");
    expect(insight(final, "no-empty-months")).toBe("Every month had at least one workout and one title: eleven for eleven.");
  });

  it("words the race verdict for each case", () => {
    const d = clone();
    d.totals.races = 3;
    d.totals.race_prs = 1;
    expect(insight(d, "races")).toBe("Three races, one of them a PR.");
    d.totals.race_prs = 0;
    expect(insight(d, "races")).toBe("Three races, no PRs this time.");
    d.totals.races = 1;
    d.totals.race_prs = 1;
    expect(insight(d, "races")).toBe("One race, and it was a PR.");
    d.totals.races = 0;
    expect(insight(d, "races")).toBeNull();
  });

  it("names new places, and falls back to counts for payloads without the lists", () => {
    const d = clone();
    d.travel.new_us_states = [];
    expect(insight(d, "new-regions")).toBe("Greece, Hungary and Czechia for the first time.");
    d.travel.new_countries = [];
    d.travel.new_us_states = ["NY", "AZ"];
    expect(insight(d, "new-regions")).toBe("Arizona and New York for the first time.");
    d.travel.new_us_states = ["AZ", "MT", "NY", "WA", "IA"];
    expect(insight(d, "new-regions")).toBe("Five new US states.");
    delete d.travel.new_countries;
    delete d.travel.new_us_states;
    expect(insight(d, "new-regions")).toBe("Three of them for the first time, plus two new US states.");
  });

  it("says every country was a first when they all were", () => {
    const d = clone();
    d.travel.new_countries = ["GR", "HU", "CZ", "DE"];
    d.travel.new_us_states = [];
    expect(insight(d, "new-regions")).toBe("Every one of them a first.");
  });

  it("shortens a long list of new countries", () => {
    const d = clone();
    d.totals.countries = 9;
    d.travel.new_countries = ["GR", "HU", "CZ", "DE", "AT", "SK"];
    d.travel.new_us_states = [];
    expect(insight(d, "new-regions")).toBe(
      "Six of them for the first time, among them Greece, Hungary and Czechia.",
    );
  });

  it("lists the months of several trips", () => {
    const d = clone();
    d.travel.trips = [
      { month: 3, stops: [{ city: "Lisbon" }, { city: "Porto" }] },
      { month: 9, stops: [{ city: "Athens" }] },
    ];
    expect(insight(d, "trip-shape")).toBe("Two trips, three cities, in March and September.");
  });

  it("only flags the travel month when workouts really dipped", () => {
    const d = clone();
    d.monthly.find((m) => m.month === 9).workouts = 14;
    expect(insight(d, "travel-month-dip")).toBeNull();
  });

  it("finds the longest run of active weeks", () => {
    expect(longestWeekStreak(fixture.weekly)).toBe(20);
    expect(longestWeekStreak([{ week: 1, workouts: 1 }, { week: 3, workouts: 1 }])).toBe(1);
    expect(longestWeekStreak([])).toBe(0);
  });

  it("spells small counts and keeps large ones as numbers", () => {
    expect(count(2)).toBe("two");
    expect(count(12)).toBe("twelve");
    expect(count(13)).toBe("13");
    expect(count(1114)).toBe("1,114");
  });
});

describe("2025, a finished year", () => {
  it("speaks in the past tense and names every first", () => {
    expect(Object.fromEntries(insights(fixture2025).map((l) => [l.id, l.text]))).toEqual({
      "data-rate": "About 0.6 a day, every day of the year.",
      "trip-shape": "Two trips, 13 cities, in May and September.",
      "new-regions": "Every one of them a first, plus Iowa, New York and Washington.",
      "top-activity": "Run took the most time: 8.8 hours over 18 sessions, 40% of all active time.",
      "week-streak": "The longest streak: ten weeks in a row with at least one workout.",
      "busiest-workout-month": "December was the busiest month, with 19 workouts.",
      "run-peak": "November was the biggest running month: 28.2 miles.",
      "busiest-watch-month": "July was the biggest watching month, with 8 titles.",
      "rating-habit": "4 stars was the usual verdict: 27 of 55 ratings.",
      "top-genre": "Drama led the genres with 32 titles, ahead of Action with 13.",
      "oldest-favorite": "The oldest favorite dates to 1943: Casablanca.",
    });
  });

  it("never says so far", () => {
    for (const { text } of insights(fixture2025)) expect(text).not.toMatch(/so far/i);
  });

  it("hides patterns, which has nothing to say for a year with months of no logging", () => {
    expect(isChapterEligible("patterns", fixture2025)).toBe(false);
    for (const id of ["opening", "travel", "fitness", "film-tv", "closing"]) expect(isChapterEligible(id, fixture2025)).toBe(true);
  });
});
