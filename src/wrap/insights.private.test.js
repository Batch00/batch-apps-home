import { describe, expect, it } from "vitest";
import fixture from "./fixtures/2026.json";
import fixture2025 from "./fixtures/2025.json";
import sample from "./fixtures/private/sample.json";
import {
  DEFAULT_FIXED_BILLS,
  PRIVATE_RULES,
  insight,
  insights,
  isChapterEligible,
  isFixedBill,
  netWorthSince,
  timelineWithoutEpisodes,
} from "./insights.js";

// The private view's lines, pinned against the synthetic sample (fake numbers) on the public
// 2026 fixture, the way the page puts them together for the signed-in owner.
const withPrivate = (base = fixture, block = sample.private) => ({ ...structuredClone(base), private: structuredClone(block) });
const PRIVATE_CHAPTERS = ["trips", "training", "money", "timeline"];
const privateIds = new Set(PRIVATE_RULES.map((rule) => rule.id));
const privateLines = (d) => insights(d).filter((line) => privateIds.has(line.id));

describe("private lines on the sample", () => {
  it("writes every line from the data", () => {
    expect(Object.fromEntries(privateLines(withPrivate()).map((l) => [l.id, l.text]))).toEqual({
      "spend-vs-plan": "Through ten full months, spending ran at 99% of the $22,000 plan.",
      "months-under-plan": "Eight of ten full months came in under plan.",
      "top-category": "Outside fixed bills, Groceries led spending at $3,300, 110% of its plan.",
      "over-plan-categories": "Three categories ran over plan, led by Dining at 133%.",
      "savings-rate": "March saved the most: 36.7% of its income.",
      "net-worth": "Net worth is up $9,000 so far this year, 23% higher.",
      "trip-share": "Trip spending came to about 10% of budget spending. It is a share of the same purchases, never added on top.",
      "trip-per-day": "Sample Trip One was the priciest per day, at $150 a day over twelve days.",
      "top-routine": "Routine A was the go-to routine: 20 of 38 strength sessions.",
      stretching: "Stretching, kept apart from workouts: twelve sessions, 3 hours.",
      "busiest-app-month": "September was the busiest month across the apps, with 51 logged events.",
      "top-app": "BatchBurn logged the most: 220 of 374 events so far.",
    });
  });

  it("keeps the copy rules", () => {
    for (const { text } of privateLines(withPrivate())) {
      expect(text.includes(String.fromCharCode(0x2014))).toBe(false);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(text).toMatch(/^[A-Z0-9].*\.$/);
    }
  });

  it("shows every private chapter", () => {
    for (const id of PRIVATE_CHAPTERS) expect(isChapterEligible(id, withPrivate())).toBe(true);
  });
});

describe("private lines stay quiet without the private block", () => {
  it("speaks no private line and shows no private chapter on either public fixture", () => {
    for (const base of [fixture, fixture2025]) {
      expect(privateLines(base)).toEqual([]);
      for (const id of PRIVATE_CHAPTERS) expect(isChapterEligible(id, base)).toBe(false);
    }
  });

  it("checks every private rule against a bare payload without throwing", () => {
    const bare = { year: 2026, version: 1, totals: {}, private: { version: 1 } };
    for (const rule of PRIVATE_RULES) expect(() => rule.eligible(bare)).not.toThrow();
    expect(privateLines(bare)).toEqual([]);
    for (const id of PRIVATE_CHAPTERS) expect(isChapterEligible(id, bare)).toBe(false);
  });
});

describe("money rule edges", () => {
  it("speaks in the past tense for a finished year", () => {
    const d = withPrivate(fixture2025);
    expect(insight(d, "spend-vs-plan")).toBe("Spending ran at 97% of the $24,200 plan.");
    expect(insight(d, "months-under-plan")).toBe("Nine of eleven months came in under plan.");
    expect(insight(d, "net-worth")).toBe("Net worth ended the year up $9,000, 23% higher.");
    expect(insight(d, "top-app")).toBe("BatchBurn logged the most: 220 of 308 events.");
    for (const { text } of privateLines(d)) expect(text).not.toMatch(/so far/i);
  });

  it("counts every month under plan, or none", () => {
    const d = withPrivate();
    for (const m of d.private.money.monthly) m.spend = 1000;
    expect(insight(d, "months-under-plan")).toBe("Every full month so far came in under plan.");
    for (const m of d.private.money.monthly) m.spend = 3000;
    expect(insight(d, "months-under-plan")).toBe("No full month so far came in under plan.");
  });

  it("leaves the open month out of the under-plan count", () => {
    const d = withPrivate();
    d.private.money.monthly = d.private.money.monthly.slice(0, 3);
    d.as_of = "2026-03-15";
    expect(insight(d, "months-under-plan")).toBeNull();
  });

  it("names one or two categories over plan, and says when none are", () => {
    const d = withPrivate();
    const cats = d.private.money.top_categories;
    for (const c of cats) c.pct_of_plan = 90;
    expect(insight(d, "over-plan-categories")).toBe("Every top category stayed within its plan.");
    cats[2].pct_of_plan = 132.4;
    expect(insight(d, "over-plan-categories")).toBe("Only Dining ran over plan, at 132%.");
    cats[4].pct_of_plan = 140;
    expect(insight(d, "over-plan-categories")).toBe("Travel (140%) and Dining (132%) ran over plan.");
    // 100.4 rounds to 100: on plan, not over it.
    cats[0].pct_of_plan = 100.4;
    expect(insight(d, "over-plan-categories")).toBe("Travel (140%) and Dining (132%) ran over plan.");
  });

  it("leaves the plan out of the top category line when there is none", () => {
    const d = withPrivate();
    d.private.money.top_categories[1].pct_of_plan = null;
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Groceries led spending at $3,300.");
  });

  it("compares completed months only, never the month in progress against its full plan", () => {
    const d = withPrivate();
    // November (as_of 2026-11-22) is in progress: its spend can move freely without changing the line.
    const november = d.private.money.monthly.find((m) => m.month === 11);
    for (const spend of [0, 1800, 9999]) {
      november.spend = spend;
      expect(insight(d, "spend-vs-plan")).toBe("Through ten full months, spending ran at 99% of the $22,000 plan.");
    }
    d.as_of = "2026-03-10";
    expect(insight(d, "spend-vs-plan")).toBe("Through two full months, spending ran at 93% of the $4,400 plan.");
    d.as_of = "2026-02-03";
    expect(insight(d, "spend-vs-plan")).toBe("Through one full month, spending ran at 91% of the $2,200 plan.");
    // In January no month is complete yet, so the line stays quiet.
    d.as_of = "2026-01-20";
    expect(insight(d, "spend-vs-plan")).toBeNull();
  });

  it("words a negative savings rate and a falling net worth", () => {
    const d = withPrivate();
    d.private.money.totals.savings_rate_pct = -4.5;
    expect(insight(d, "savings-rate")).toBe("Spending ran ahead of income so far: a savings rate of -4.5%.");
    d.private.money.net_worth = { start: 40000, latest: 38000, change: -2000, monthly: [] };
    expect(insight(d, "net-worth")).toBe("Net worth is down $2,000 so far this year, 5% lower.");
    d.private.money.net_worth = { start: 40000, latest: 40000.2, change: 0.2, monthly: [] };
    expect(insight(d, "net-worth")).toBeNull();
  });

  it("drops the best month from the savings line with fewer than three full months", () => {
    const d = withPrivate();
    d.as_of = "2026-03-10";
    expect(insight(d, "savings-rate")).toBe("28.8% of income saved so far.");
  });

  it("goes quiet when there is no spending", () => {
    const d = withPrivate();
    d.private.money.totals.spend = 0;
    expect(insight(d, "spend-vs-plan")).toBeNull();
    expect(isChapterEligible("money", d)).toBe(false);
  });
});

describe("trip and training rule edges", () => {
  it("states the travel share as a share, never as a sum with budget spend", () => {
    const d = withPrivate();
    const line = insight(d, "trip-share");
    expect(line).toMatch(/% of budget spending/);
    expect(line).not.toMatch(/\$/);
    d.private.travel_private.trip_spend_share = 0.004;
    expect(insight(d, "trip-share")).toBe(
      "Trip spending came to under 1% of budget spending. It is a share of the same purchases, never added on top.",
    );
    d.private.travel_private.trip_spend_share = null;
    expect(insight(d, "trip-share")).toBeNull();
  });

  it("words the day rate for a single trip", () => {
    const d = withPrivate();
    d.private.travel_private.trips = d.private.travel_private.trips.slice(0, 1);
    expect(insight(d, "trip-per-day")).toBe("Sample Trip One ran $150 a day over twelve days.");
  });

  it("handles a single routine and short stretching", () => {
    const d = withPrivate();
    d.private.fitness_private.strength = [{ routine: "Routine A", sessions: 9, minutes: 400 }];
    d.private.fitness_private.stretch_minutes = 45;
    expect(insight(d, "top-routine")).toBe("Routine A was the only routine: nine strength sessions.");
    expect(insight(d, "stretching")).toBe("Stretching, kept apart from workouts: twelve sessions, 45 minutes.");
  });

  it("shows training with stretching alone, and hides it with neither", () => {
    const d = withPrivate();
    d.private.fitness_private.strength = [];
    expect(isChapterEligible("training", d)).toBe(true);
    expect(insight(d, "top-routine")).toBeNull();
    d.private.fitness_private.stretch_sessions = null;
    expect(isChapterEligible("training", d)).toBe(false);
  });
});

describe("fixed bills in \"where it went\"", () => {
  it("uses the list BatchBrain sends (0019: Insurance and Taxes)", () => {
    const d = withPrivate();
    expect(d.private.money.fixed_bill_categories).toEqual(["Insurance", "Taxes"]);
    expect(d.private.money.top_categories[0].category).toBe("Insurance");
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Groceries led spending at $3,300, 110% of its plan.");
  });

  it("falls back to Insurance and Taxes when no list is sent, and never treats Student Loans as fixed", () => {
    const d = withPrivate();
    delete d.private.money.fixed_bill_categories;
    expect(DEFAULT_FIXED_BILLS).toEqual(["Insurance", "Taxes"]);
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Groceries led spending at $3,300, 110% of its plan.");
    d.private.money.top_categories[0].category = "Student Loans";
    expect(isFixedBill(d, d.private.money.top_categories[0])).toBe(false);
    expect(insight(d, "top-category")).toBe("Student Loans led spending at $11,000, 100% of its plan.");
    d.private.money.top_categories[0].category = "Taxes";
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Groceries led spending at $3,300, 110% of its plan.");
  });

  it("drops the prefix when no listed category is a fixed bill", () => {
    const d = withPrivate();
    d.private.money.top_categories[0].category = "Rent";
    expect(insight(d, "top-category")).toBe("Rent led spending at $11,000, 100% of its plan.");
    d.private.money.fixed_bill_categories = [];
    d.private.money.top_categories[0].category = "Insurance";
    expect(insight(d, "top-category")).toBe("Insurance led spending at $11,000, 100% of its plan.");
  });

  it("matches the sent list without regard to case", () => {
    const d = withPrivate();
    d.private.money.top_categories[0].category = "Rent";
    expect(insight(d, "top-category")).toBe("Rent led spending at $11,000, 100% of its plan.");
  });

  it("follows the payload's fixed-bill list over the defaults", () => {
    const d = withPrivate();
    d.private.money.fixed_bill_categories = ["Groceries"];
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Insurance led spending at $11,000, 100% of its plan.");
    d.private.money.fixed_bill_categories = ["insurance", "GROCERIES"];
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Dining led spending at $2,200, 133% of its plan.");
  });

  it("follows a per-category flag over everything else", () => {
    const d = withPrivate();
    d.private.money.fixed_bill_categories = ["Groceries"];
    d.private.money.top_categories[0].is_fixed_bill = false;
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Insurance led spending at $11,000, 100% of its plan.");
    d.private.money.top_categories[0].is_fixed_bill = true;
    d.private.money.top_categories[1].is_fixed_bill = false;
    expect(insight(d, "top-category")).toBe("Outside fixed bills, Groceries led spending at $3,300, 110% of its plan.");
    expect(isFixedBill(d, d.private.money.top_categories[0])).toBe(true);
    expect(isFixedBill(d, d.private.money.top_categories[1])).toBe(false);
  });

  it("stays quiet when every category is a fixed bill", () => {
    const d = withPrivate();
    d.private.money.top_categories = [{ category: "Taxes", spend: 500, planned: 500, pct_of_plan: 100 }];
    expect(insight(d, "top-category")).toBeNull();
  });
});

describe("timeline without episodes", () => {
  it("counts BatchFlix as finished titles, so a backfill of episodes cannot skew the busiest month", () => {
    const d = withPrivate();
    // A backfill lands hundreds of episodes in June in BatchBrain's batchflix count.
    d.private.timeline.find((m) => m.month === 6).batchflix = 600;
    expect(insight(d, "busiest-app-month")).toBe("September was the busiest month across the apps, with 51 logged events.");
    expect(insight(d, "top-app")).toBe("BatchBurn logged the most: 220 of 374 events so far.");
  });

  it("takes BatchFlix from the public monthly titles, null where that month has no media data", () => {
    const d = withPrivate();
    d.monthly = d.monthly.filter((m) => m.month !== 2);
    const rows = timelineWithoutEpisodes(d);
    expect(rows.find((m) => m.month === 1)).toEqual({ month: 1, batchburn: 20, batchflix: 9, batchport: 0 });
    expect(rows.find((m) => m.month === 2).batchflix).toBeNull();
    expect(rows.find((m) => m.month === 9)).toEqual({ month: 9, batchburn: 10, batchflix: 11, batchport: 30 });
  });
});

describe("net worth when tracking started after January 1", () => {
  // BatchFolio's first 2026 snapshot is April 9: no value before April, and start is that snapshot.
  const fromApril = (base = fixture, extra = {}) => {
    const d = withPrivate(base);
    const nw = d.private.money.net_worth;
    nw.monthly = nw.monthly.map((m) => (m.month < 4 ? { ...m, value: null } : m));
    Object.assign(nw, { start: 42000, latest: 48000, change: 6000 }, extra);
    return d;
  };

  it("names the day from net_worth.start_date", () => {
    const d = fromApril(fixture, { start_date: "2026-04-09" });
    expect(netWorthSince(d)).toBe("April 9");
    expect(insight(d, "net-worth")).toBe("Net worth is up $6,000 since April 9, when tracking started: 14% higher.");
    const final = fromApril(fixture2025, { start_date: "2025-04-09" });
    expect(insight(final, "net-worth")).toBe("Net worth ended the year up $6,000 since April 9, when tracking started: 14% higher.");
  });

  it("names the first month with a value when no start date is sent", () => {
    const d = fromApril();
    expect(netWorthSince(d)).toBe("April");
    expect(insight(d, "net-worth")).toBe("Net worth is up $6,000 since April, when tracking started: 14% higher.");
  });

  it("says this year when tracking covers January 1", () => {
    const d = withPrivate();
    expect(netWorthSince(d)).toBeNull();
    expect(insight(d, "net-worth")).toBe("Net worth is up $9,000 so far this year, 23% higher.");
    d.private.money.net_worth.start_date = "2026-01-01";
    expect(netWorthSince(d)).toBeNull();
    // A start date in an earlier year means tracking began before this one.
    d.private.money.net_worth.start_date = "2025-06-01";
    expect(netWorthSince(d)).toBeNull();
  });

  it("words a fall since tracking started", () => {
    const d = fromApril(fixture, { start_date: "2026-04-09", latest: 40000, change: -2000 });
    expect(insight(d, "net-worth")).toBe("Net worth is down $2,000 since April 9, when tracking started: 5% lower.");
  });
});
