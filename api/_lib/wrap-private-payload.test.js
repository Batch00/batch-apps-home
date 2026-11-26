import { describe, expect, it } from "vitest";
import sample from "../../src/wrap/fixtures/private/sample.json";
import publicFixture from "../../src/wrap/fixtures/2026.json";
import { toPrivateBlock, toPrivateWrap } from "./wrap-private-payload.js";
import { toPublicYtd } from "./ytd-payload.js";

const clone = () => structuredClone(sample.private);

// Every key name, at any depth.
function keysOf(value, out = new Set()) {
  if (Array.isArray(value)) for (const item of value) keysOf(item, out);
  else if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      out.add(key);
      keysOf(inner, out);
    }
  }
  return out;
}

describe("toPrivateBlock", () => {
  it("passes the synthetic sample through unchanged", () => {
    expect(toPrivateBlock(sample.private)).toEqual(sample.private);
  });

  it("drops keys the private shape does not name, at every level", () => {
    const raw = clone();
    raw.extra = "x";
    raw.money.account_number = "x";
    raw.money.monthly[0].memo = "x";
    raw.money.top_categories[0].payee = "x";
    raw.money.totals.balance = 1;
    raw.money.net_worth.accounts = [{ name: "x" }];
    raw.money.net_worth.monthly[0].note = "x";
    raw.travel_private.journal = "x";
    raw.travel_private.trips[0].notes = "x";
    raw.travel_private.trips[0].stops[0].lat = 1;
    raw.fitness_private.heart_rate = 1;
    raw.fitness_private.strength[0].notes = "x";
    raw.timeline[0].batchfolio = 1;
    const out = toPrivateBlock(raw);
    expect(out).toEqual(sample.private);
    for (const key of ["extra", "account_number", "memo", "payee", "balance", "accounts", "note", "journal", "notes", "lat", "heart_rate", "batchfolio"]) {
      expect(keysOf(out).has(key)).toBe(false);
    }
  });

  it("keeps fixed-bill info only as a boolean flag and a list of names", () => {
    const raw = clone();
    raw.money.fixed_bill_categories = ["Taxes", " Insurance ", 3, "", { name: "x" }];
    raw.money.top_categories[0].is_fixed_bill = true;
    raw.money.top_categories[1].is_fixed_bill = "yes";
    const out = toPrivateBlock(raw);
    expect(out.money.fixed_bill_categories).toEqual(["Taxes", "Insurance"]);
    expect(out.money.top_categories[0].is_fixed_bill).toBe(true);
    expect("is_fixed_bill" in out.money.top_categories[1]).toBe(false);
    // The sample mirrors 0019, which sends the list.
    expect(toPrivateBlock(sample.private).money.fixed_bill_categories).toEqual(["Insurance", "Taxes"]);
    // Absent upstream, absent here.
    const without = clone();
    delete without.money.fixed_bill_categories;
    expect("fixed_bill_categories" in toPrivateBlock(without).money).toBe(false);
  });

  it("keeps net_worth.start_date only as a valid YYYY-MM-DD", () => {
    const raw = clone();
    raw.money.net_worth.start_date = "2026-04-09";
    expect(toPrivateBlock(raw).money.net_worth.start_date).toBe("2026-04-09");
    for (const bad of ["2026-04-31", "April 9", "2026-04-09T00:00:00Z", 20260409]) {
      raw.money.net_worth.start_date = bad;
      expect("start_date" in toPrivateBlock(raw).money.net_worth).toBe(false);
    }
  });

  it("returns null without a version 1 block", () => {
    expect(toPrivateBlock(undefined)).toBeNull();
    expect(toPrivateBlock({ ...clone(), version: 2 })).toBeNull();
    expect(toPrivateBlock([])).toBeNull();
  });

  it("turns bad values into null and drops items without their key field", () => {
    const raw = clone();
    raw.money.monthly = [{ month: 13, spend: 1 }, { month: 2, spend: "12", planned: Infinity, income: 1e12, savings_rate_pct: 12.345 }];
    raw.money.top_categories = [{ category: "", spend: 1 }, { category: " Rent ", spend: 10.006 }];
    raw.travel_private.trips = [
      { name: "No start" },
      { name: "Bad start", start_date: "2026-02-30" },
      { name: "T", status: "planned", start_date: "2026-03-01", end_date: "2026-03-01T10:00", days: -1, countries: ["A", 3, ""], stops: [{ city: "C", country_code: "usa", arrival_date: "March 1" }, { country_code: "US" }] },
    ];
    raw.travel_private.trip_spend_share = -0.2;
    raw.fitness_private.stretch_sessions = 1.5;
    raw.fitness_private.strength = [{ routine: "R" }, { routine: "  ", sessions: 2, minutes: 30 }];
    raw.timeline = [{ month: 0 }, { month: 1, batchburn: -3, batchflix: null, batchport: 4 }];
    const out = toPrivateBlock(raw);
    expect(out.money.monthly).toEqual([{ month: 2, spend: null, planned: null, income: null, savings_rate_pct: 12.3 }]);
    expect(out.money.top_categories).toEqual([{ category: "Rent", spend: 10.01, planned: null, pct_of_plan: null }]);
    expect(out.travel_private.trips).toEqual([
      {
        name: "T",
        status: null,
        start_date: "2026-03-01",
        end_date: null,
        days: null,
        trip_spend: null,
        spend_per_day: null,
        countries: ["A"],
        stops: [{ city: "C", country_code: null, arrival_date: null, departure_date: null }],
      },
    ]);
    expect(out.travel_private.trip_spend_share).toBeNull();
    expect(out.fitness_private.stretch_sessions).toBeNull();
    expect(out.fitness_private.strength).toEqual([{ routine: null, sessions: 2, minutes: 30 }]);
    expect(out.timeline).toEqual([{ month: 1, batchburn: null, batchflix: null, batchport: 4 }]);
  });

  it("defaults every section when BatchBrain sends an empty block", () => {
    expect(toPrivateBlock({ version: 1 })).toEqual({
      version: 1,
      money: {
        monthly: [],
        top_categories: [],
        totals: { spend: null, income: null, savings_rate_pct: null },
        net_worth: { start: null, latest: null, change: null, monthly: [] },
      },
      travel_private: { trips: [], trip_spend_share: null },
      fitness_private: { stretch_sessions: null, stretch_minutes: null, strength: [] },
      timeline: [],
    });
  });
});

describe("toPrivateWrap", () => {
  it("keeps the public part exactly as /api/ytd serves it", () => {
    const out = toPrivateWrap({ ...publicFixture, private: sample.private });
    const { private: privatePart, ...rest } = out;
    expect(rest).toEqual(toPublicYtd(publicFixture));
    expect(privatePart).toEqual(sample.private);
  });

  it("needs both parts", () => {
    expect(toPrivateWrap(publicFixture)).toBeNull();
    expect(toPrivateWrap({ private: sample.private })).toBeNull();
  });
});

describe("the public allowlist never passes the private block", () => {
  it("drops private from a private_wrap row", () => {
    const out = toPublicYtd({ ...publicFixture, private: sample.private });
    expect("private" in out).toBe(false);
    expect(out).toEqual(toPublicYtd(publicFixture));
  });
});
