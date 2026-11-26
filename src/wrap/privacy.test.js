import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/2026.json";
import fixture2025 from "./fixtures/2025.json";
import sample from "./fixtures/private/sample.json";
import { CHAPTERS, chaptersFor } from "./chapters/index.js";

// The public side never carries private data: the public fixtures, the public chapter list, the
// share pages and the home page code. The built bundle is checked by scripts/check-privacy.mjs.

const ROOT = join(import.meta.dirname, "..", "..");

// Key names only the private block uses (BatchBrain 0018).
const PRIVATE_KEYS = [
  "private",
  "money",
  "travel_private",
  "fitness_private",
  "timeline",
  "spend",
  "planned",
  "income",
  "savings_rate_pct",
  "top_categories",
  "pct_of_plan",
  "net_worth",
  "trip_spend",
  "spend_per_day",
  "trip_spend_share",
  "start_date",
  "end_date",
  "arrival_date",
  "departure_date",
  "stretch_sessions",
  "stretch_minutes",
  "strength",
  "routine",
  "batchburn",
  "batchflix",
  "batchport",
];

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

function filesUnder(dir, test) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(path, test));
    else if (test(path)) out.push(path);
  }
  return out;
}

// Source files that ship (tests are not bundled).
const isShipped = (path) => /\.(js|jsx)$/.test(path) && !/\.test\.js$/.test(path);

const PUBLIC_IDS = ["opening", "travel", "fitness", "film-tv", "patterns", "closing"];
const PRIVATE_IDS = ["trips", "training", "money", "timeline"];

describe("public fixtures", () => {
  it("hold no private keys, at any depth", () => {
    for (const payload of [fixture, fixture2025]) {
      const keys = keysOf(payload);
      for (const key of PRIVATE_KEYS) expect(keys.has(key), `${payload.year} has ${key}`).toBe(false);
    }
  });

  it("hold no full dates but as_of, and no dollar signs", () => {
    for (const payload of [fixture, fixture2025]) {
      const { as_of: _asOf, ...rest } = payload;
      const text = JSON.stringify(rest);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(text).not.toContain("$");
    }
  });

  it("sit apart from the synthetic private sample, which the public fixture glob never reaches", () => {
    const publicFixtures = readdirSync(join(ROOT, "src/wrap/fixtures")).filter((name) => name.endsWith(".json"));
    expect(publicFixtures.sort()).toEqual(["2025.json", "2026.json"]);
    expect(sample._comment).toMatch(/synthetic/i);
  });
});

describe("the chapter list", () => {
  it("is exactly the public story without the private block", () => {
    expect(chaptersFor(fixture).map((c) => c.id)).toEqual(PUBLIC_IDS);
    expect(chaptersFor(fixture2025).map((c) => c.id)).toEqual(PUBLIC_IDS.filter((id) => id !== "patterns"));
  });

  it("adds the private chapters only with the private block", () => {
    const ids = chaptersFor({ ...fixture, private: sample.private }).map((c) => c.id);
    expect(ids).toEqual(["opening", "travel", "trips", "fitness", "training", "film-tv", "money", "patterns", "timeline", "closing"]);
  });

  it("marks exactly the private chapters as private", () => {
    expect(CHAPTERS.filter((c) => c.private).map((c) => c.id).sort()).toEqual([...PRIVATE_IDS].sort());
  });
});

describe("share pages and the home page", () => {
  it("keep private words out of index.html and wrap.html", () => {
    for (const page of ["index.html", "wrap.html"]) {
      const html = readFileSync(join(ROOT, page), "utf8");
      expect(html).not.toMatch(/private|savings|net worth|spend/i);
    }
  });

  it("never import the wrap, the private endpoint or the private sample from home page code", () => {
    const homeFiles = [
      join(ROOT, "src/main.jsx"),
      join(ROOT, "src/App.jsx"),
      ...filesUnder(join(ROOT, "src/components"), isShipped),
      ...filesUnder(join(ROOT, "src/lib"), isShipped),
      ...filesUnder(join(ROOT, "src/hooks"), isShipped),
    ];
    for (const file of homeFiles) {
      const code = readFileSync(file, "utf8");
      const name = relative(ROOT, file);
      expect(code, name).not.toMatch(/wrap-private|fixtures\/private|travel_private|fitness_private/);
      // Only WrapRoute.jsx (lazy) may reach into src/wrap; the YTD fallback globs public fixtures.
      expect(code.replace(/import\.meta\.glob\("\.\.\/wrap\/fixtures\/\*\.json"/g, ""), name).not.toMatch(/from ["'][./]*wrap\//);
    }
  });

  it("keep the public endpoint on public_ytd and its own role", () => {
    const code = readFileSync(join(ROOT, "api/ytd.js"), "utf8");
    expect(code).toContain("brain.public_ytd");
    expect(code).not.toMatch(/private_wrap|WRAP_PRIVATE_DATABASE_URL|wrap-private-payload/);
  });
});
