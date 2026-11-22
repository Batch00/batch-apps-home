// Builds src/lib/dotMap.js: a coarse dot grid of the world for the home page's mini map.
//
// The home page must not load the atlases or d3-geo, so this runs once at development time and
// commits a few kilobytes of run-length data instead. Each 2.5 degree cell whose center falls on
// land is tagged with a region key:
//   "FR"      a country's home territory (ISO alpha-2)
//   "US-CA"   a US state, never a bare USPS code: CA would collide with Canada, MN with Mongolia
//   "~FR"     a country's far-off overseas part (French Guiana, Svalbard for Norway), drawn as land
//             but never lit
// Regions too small to own a cell center get a pin: one dot at a point inside the region.
// The rules come from src/wrap/globe/visited.js, the same module the globe uses.
//
// Run: node scripts/build-dot-map.mjs   (only needed if the atlases or the grid change)

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoArea, geoBounds, geoCentroid, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { COUNTRY_ID, COUNTRY_NAME_FALLBACK, STATE_FIPS } from "../src/wrap/globe/codes.js";
import { homeParts, stateKey } from "../src/wrap/globe/visited.js";

const require = createRequire(import.meta.url);
const world = require("world-atlas/countries-110m.json");
const us = require("us-atlas/states-10m.json");

const STEP = 2.5;
const TOP = 80; // northern edge (Antarctica and the far north add nothing here)
const BOTTOM = -57.5;
const COLS = 360 / STEP;
const ROWS = (TOP - BOTTOM) / STEP;

const alpha2ByNumeric = new Map([...COUNTRY_ID].map(([alpha2, numeric]) => [numeric, alpha2]));
const alpha2ByName = new Map([...COUNTRY_NAME_FALLBACK].map(([alpha2, name]) => [name, alpha2]));
const uspsByFips = new Map([...STATE_FIPS].map(([usps, fips]) => [fips, usps]));

function withBounds(features, codeOf) {
  return features
    .map((f) => ({ f, code: codeOf(f), bounds: geoBounds(f) }))
    .filter((x) => x.code);
}

// Each country becomes its home territory, plus (when it has any) an overseas region.
const countryFeatures = feature(world, world.objects.countries).features.flatMap((f) => {
  const code = f.id ? alpha2ByNumeric.get(f.id) : alpha2ByName.get(f.properties?.name);
  if (!code || code === "AQ") return [];
  const { home, overseas } = homeParts(f.geometry, code);
  const out = [{ ...f, properties: { key: code }, geometry: { type: "MultiPolygon", coordinates: home } }];
  if (overseas.length) out.push({ ...f, properties: { key: `~${code}` }, geometry: { type: "MultiPolygon", coordinates: overseas } });
  return out;
});
const countries = withBounds(countryFeatures, (f) => f.properties.key);
const states = withBounds(feature(us, us.objects.states).features, (f) => {
  const usps = uspsByFips.get(f.id);
  return usps ? stateKey(usps) : null;
});

function inBounds(lon, lat, [[x0, y0], [x1, y1]]) {
  if (lat < y0 || lat > y1) return false;
  return x0 <= x1 ? lon >= x0 && lon <= x1 : lon >= x0 || lon <= x1; // bounds may cross the antimeridian
}

function regionAt(lon, lat) {
  const point = [lon, lat];
  const country = countries.find((c) => inBounds(lon, lat, c.bounds) && geoContains(c.f, point));
  if (!country) return null;
  if (country.code === "US" || country.code === "~US") {
    const state = states.find((s) => inBounds(lon, lat, s.bounds) && geoContains(s.f, point));
    return state?.code ?? "US";
  }
  return country.code;
}

const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
const cellOf = (lon, lat) => [
  Math.min(ROWS - 1, Math.max(0, Math.floor((TOP - lat) / STEP))),
  Math.min(COLS - 1, Math.max(0, Math.floor((lon + 180) / STEP))),
];

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    grid[row][col] = regionAt(-180 + (col + 0.5) * STEP, TOP - (row + 0.5) * STEP);
  }
}

// Small countries and states that own no cell center get a pin instead: one dot drawn at a point
// inside the region itself, on top of the grid. Borrowing a neighbor's cell would put the dot in
// another country (a 2.5 degree cell center near Czechia lies in Austria).
const present = new Set(grid.flat().filter(Boolean));
const pins = [];
const round = (v) => Math.round(v * 10) / 10;
for (const region of [...countries, ...states]) {
  if (present.has(region.code) || region.code === "US" || region.code.startsWith("~")) continue;
  const polygons = region.f.geometry.type === "MultiPolygon" ? region.f.geometry.coordinates : [region.f.geometry.coordinates];
  const largest = polygons.reduce((best, p) => (geoArea({ type: "Polygon", coordinates: p }) > geoArea({ type: "Polygon", coordinates: best }) ? p : best));
  const centers = [geoCentroid(region.f), geoCentroid({ type: "Polygon", coordinates: largest })];
  // The centroid, else the nearest inside point on a 0.1 degree lattice around it (narrow or
  // hooked shapes can have their centroid outside).
  const candidates = centers.map(([lon, lat]) => [round(lon), round(lat)]);
  for (let r = 1; r <= 15; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) candidates.push([round(candidates[1][0] + dx / 10), round(candidates[1][1] + dy / 10)]);
      }
    }
  }
  const point = candidates.find((p) => geoContains(region.f, p));
  if (!point) {
    console.warn(`no inside point for ${region.code}; left without a dot`);
    continue;
  }
  if (point[1] > TOP || point[1] < BOTTOM) continue;
  pins.push([point[0], point[1], region.code]);
  present.add(region.code);
}

// Run-length encode each row as [startCol, length, code] triples.
const runs = grid.map((cells) => {
  const out = [];
  for (let col = 0; col < COLS; col++) {
    const code = cells[col];
    if (!code) continue;
    const last = out[out.length - 1];
    if (last && last[2] === code && last[0] + last[1] === col) last[1]++;
    else out.push([col, 1, code]);
  }
  return out;
});

const body = `// Generated by scripts/build-dot-map.mjs from world-atlas 110m and us-atlas 10m. Do not edit.
// A ${STEP} degree dot grid, ${COLS} columns from 180W and ${ROWS} rows from ${TOP}N. Each row lists
// [startColumn, length, key] runs. Keys: "FR" a country's home territory, "US-CA" a US state,
// "~FR" a country's far-off overseas part (never lit), "US" US land outside any state shape.
// pins: [lon, lat, key] for regions too small to own a cell center, drawn at that exact point.
export const DOT_MAP = {
  step: ${STEP},
  top: ${TOP},
  cols: ${COLS},
  rows: ${ROWS},
  runs: ${JSON.stringify(runs)},
  pins: ${JSON.stringify(pins)},
};
`;
writeFileSync(new URL("../src/lib/dotMap.js", import.meta.url), body);
const dots = runs.flat().reduce((n, r) => n + r[1], 0);
console.log(`dotMap.js: ${dots} land dots, ${pins.length} pins, ${present.size} regions, ${body.length} bytes`);
