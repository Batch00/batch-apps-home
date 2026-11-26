// Checks the built site (dist/) for private data. Run after a build: npm run check:privacy.
//
//   1. No built file carries the synthetic private sample (its marker text or names), so the
//      development-only fallback and its fixture never ship.
//   2. The home page bundle (what index.html loads up front, followed through static imports)
//      carries no wrap code and no private key names.
//   3. The share pages (index.html, wrap.html) carry no private words.
//
// The lazy wrap chunk does name the private keys (it reads data.private for the signed-in owner);
// it never carries private values, which only arrive from /api/wrap-private at runtime.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import process from "node:process";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const sample = JSON.parse(readFileSync(join(ROOT, "src/wrap/fixtures/private/sample.json"), "utf8"));

const failures = [];
const fail = (message) => failures.push(message);

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else out.push(path);
  }
  return out;
}

try {
  statSync(DIST);
} catch {
  console.error("dist/ is missing: run npm run build first.");
  process.exit(1);
}

const files = filesUnder(DIST);
const textFiles = files.filter((f) => /\.(html|js|css|json|txt|map)$/.test(f));

// 1. The sample's marker and its made-up names, which appear nowhere else.
const SAMPLE_MARKERS = [
  sample._comment.slice(0, 40),
  ...sample.private.travel_private.trips.map((t) => t.name),
  ...sample.private.travel_private.trips.flatMap((t) => t.stops.map((s) => s.city)),
  "fixtures/private",
];
for (const file of textFiles) {
  const text = readFileSync(file, "utf8");
  for (const marker of SAMPLE_MARKERS) {
    if (text.includes(marker)) fail(`${relative(ROOT, file)} contains the private sample (${marker})`);
  }
}

// 2. The home page bundle: scripts and modulepreloads in index.html, plus their static imports.
const PRIVATE_NAMES = ["travel_private", "fitness_private", "trip_spend_share", "savings_rate_pct", "wrap-private", "Private view"];
const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
const queue = [...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => join(DIST, m[1]));
const seen = new Set();
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const code = readFileSync(file, "utf8");
  for (const name of PRIVATE_NAMES) {
    if (code.includes(name)) fail(`home bundle ${relative(ROOT, file)} contains "${name}"`);
  }
  // Wrap-only class names and engine code (the lazy chunk's file name may appear, its code may not).
  if (/wrap-chapter|wrap-reveal|beatStops/.test(code)) fail(`home bundle ${relative(ROOT, file)} contains wrap code`);
  // Static imports only: import "x" and import {..} from "x". Dynamic import() chunks are lazy.
  for (const m of code.matchAll(/(?:^|[;\s}])import\s*(?:[^"'()]*?\sfrom\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g)) {
    queue.push(join(dirname(file), m[1]));
  }
}
if (!seen.size) fail("index.html loads no script: the home bundle check did not run");

// 3. Share pages.
for (const page of ["index.html", "wrap.html"]) {
  const html = readFileSync(join(DIST, page), "utf8");
  if (/private|savings|net worth|spend/i.test(html)) fail(`${page} mentions private data`);
}

if (failures.length) {
  console.error(`Privacy check failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`Privacy check passed: ${textFiles.length} built files, ${seen.size} in the home bundle.`);
