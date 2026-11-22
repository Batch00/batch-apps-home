import { describe, expect, it } from "vitest";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import usStates from "us-atlas/states-10m.json";
import { DOT_MAP } from "../../lib/dotMap.js";
import { COUNTRY_ID, STATE_FIPS } from "../../wrap/globe/codes.js";
import { homeParts } from "../../wrap/globe/visited.js";
import fixture2026 from "../../wrap/fixtures/2026.json";
import fixture2025 from "../../wrap/fixtures/2025.json";
import { litDots, mapKeys } from "./dotGrid";

const countries = feature(world, world.objects.countries).features;
const states = feature(usStates, usStates.objects.states).features;
const alpha2ById = new Map([...COUNTRY_ID].map(([code, id]) => [id, code]));
const uspsByFips = new Map([...STATE_FIPS].map(([usps, fips]) => [fips, usps]));

// The shape a grid key stands for: a US state, or a country's home territory.
function shapeOf(key) {
  if (key.startsWith("US-")) return states.find((s) => uspsByFips.get(s.id) === key.slice(3));
  const country = countries.find((c) => alpha2ById.get(c.id) === key);
  return country && { type: "Feature", geometry: { type: "MultiPolygon", coordinates: homeParts(country.geometry).home } };
}

describe.each([
  ["2026", fixture2026],
  ["2025", fixture2025],
])("dot map for %s", (_, data) => {
  const keys = mapKeys(data);
  const listed = new Set([...keys.lifetime, ...keys.fresh]);
  const dots = litDots(DOT_MAP, keys);
  const listedCountries = new Set(data.travel.lifetime.countries);

  it("lights a dot only inside a listed country or state", () => {
    for (const dot of dots) {
      expect(listed.has(dot.key)).toBe(true);
      const shape = shapeOf(dot.key);
      expect(shape, dot.key).toBeTruthy();
      expect(geoContains(shape, [dot.lon, dot.lat]), `${dot.key} dot at ${dot.lon},${dot.lat}`).toBe(true);
    }
  });

  it("never lights a dot inside a country that is not listed", () => {
    for (const dot of dots) {
      const center = [dot.lon, dot.lat];
      for (const country of countries) {
        const code = alpha2ById.get(country.id);
        if (listedCountries.has(code)) continue;
        if (code === "US" && dot.key.startsWith("US-")) continue;
        expect(geoContains(country, center), `${dot.key} dot at ${center} is inside ${country.properties.name}`).toBe(false);
      }
    }
  });

  it("gives every listed region at least one dot", () => {
    const lit = new Set(dots.map((d) => d.key));
    for (const key of listed) expect(lit.has(key), key).toBe(true);
  });
});

describe("dot map regressions", () => {
  const keys = mapKeys(fixture2026);
  const centers = litDots(DOT_MAP, keys).map((d) => [d.lon, d.lat]);

  it("keys states apart from the countries that share their codes", () => {
    // CA California and Canada, MN Minnesota and Mongolia, LA Louisiana and Laos, GA Georgia and Gabon.
    expect(keys.lifetime.has("CA")).toBe(false);
    expect(keys.lifetime.has("US-CA")).toBe(true);
    for (const name of ["Canada", "Mongolia", "Laos", "Gabon", "Azerbaijan", "Tunisia", "Albania", "Brazil"]) {
      const country = countries.find((c) => c.properties.name === name);
      expect(centers.some((p) => geoContains(country, p)), name).toBe(false);
    }
  });

  it("leaves France's overseas territory (French Guiana) unlit", () => {
    expect(centers.some(([lon, lat]) => lon < -30 && lat < 20)).toBe(false);
  });

  it("lights only Europe and the US for the 2026 lists", () => {
    for (const [lon, lat] of centers) {
      const europe = lon > -25 && lon < 45 && lat > 34 && lat < 81;
      const us = lon > -170 && lon < -60 && lat > 18 && lat < 72;
      expect(europe || us, `${lon},${lat}`).toBe(true);
    }
  });
});
