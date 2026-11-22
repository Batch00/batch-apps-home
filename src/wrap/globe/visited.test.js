import { describe, expect, it } from "vitest";
import { geoBounds, geoCentroid, geoContains } from "d3-geo";
import world from "world-atlas/countries-110m.json";
import usStates from "us-atlas/states-10m.json";
import fixture2026 from "../fixtures/2026.json";
import fixture2025 from "../fixtures/2025.json";
import { visitedRegions } from "./visited.js";

// The globe shades exactly the features visitedRegions returns, so checking them checks the globe.
describe.each([
  ["2026", fixture2026],
  ["2025", fixture2025],
])("globe regions for %s", (_, data) => {
  const { countries, states } = visitedRegions(data.travel, world, usStates);

  it("shades exactly the listed countries and states, matched in separate lists", () => {
    expect(countries.features.map((f) => f.properties.code).sort()).toEqual([...data.travel.lifetime.countries].sort());
    expect(states.features.map((f) => f.properties.code).sort()).toEqual([...data.travel.lifetime.us_states].sort());
  });

  it("uses longitude and latitude state shapes, not the Albers projected ones", () => {
    for (const state of states.features) {
      const [[west, south], [east, north]] = geoBounds(state);
      expect(west, state.properties.name).toBeGreaterThan(-180);
      expect(east, state.properties.name).toBeLessThan(-60);
      expect(south, state.properties.name).toBeGreaterThan(15);
      expect(north, state.properties.name).toBeLessThan(72);
    }
  });

  it("keeps each visited country to its home territory", () => {
    for (const country of countries.features) {
      for (const polygon of country.geometry.coordinates) {
        const [lon, lat] = geoCentroid({ type: "Polygon", coordinates: polygon });
        // Every lifetime country here is European: no part of one may sit in the Americas.
        expect(lon > -30 || lat > 60, `${country.properties.code} part at ${lon},${lat}`).toBe(true);
      }
    }
  });
});

describe("globe region spot checks", () => {
  const { countries, states } = visitedRegions(fixture2026.travel, world, usStates);

  it("puts California in California and France in France", () => {
    const california = states.features.find((f) => f.properties.code === "CA");
    expect(geoContains(california, [-119.4, 36.8])).toBe(true);
    expect(geoContains(california, [-106, 56])).toBe(false); // Canada
    const france = countries.features.find((f) => f.properties.code === "FR");
    expect(geoContains(france, [2.35, 48.86])).toBe(true); // Paris
    expect(geoContains(france, [-53, 4])).toBe(false); // French Guiana
  });
});
