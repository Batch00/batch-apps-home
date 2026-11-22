// Which atlas shapes count as "visited" for the payload's lifetime lists. Used by the globe and
// by scripts/build-dot-map.mjs, and tested on the fixtures, so both maps light the same places.
//
// Two rules keep a map honest:
// - Countries and US states are separate lists with separate keys. Several USPS codes are also
//   ISO country codes (CA is California and Canada, MN Minnesota and Mongolia, LA Louisiana and
//   Laos, GA Georgia and Gabon), so a state is never looked up as a country, or the other way.
// - Only a country's home territory lights up. Parts of a country far from its main landmass
//   (French Guiana for France) stay unlit: they are not where the trips went.

import { geoArea, geoCentroid, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import { stateKey } from "../../lib/regions.js";
import { COUNTRY_ID, COUNTRY_NAME_FALLBACK, STATE_FIPS } from "./codes.js";

const EARTH_KM = 6371;
// Measured from the main landmass's nearest edge: Corsica, Svalbard, Alaska and Kaliningrad stay
// home; French Guiana (about 7,000 km out) does not.
export const OVERSEAS_KM = 2500;

// The key a US state uses wherever it shares a namespace with countries (the dot map grid).
export { stateKey };

// Splits a (Multi)Polygon into home and overseas polygon lists, by distance from the largest part's
// outline (not its center, which would cut off the edges of very large countries).
export function homeParts(geometry) {
  if (!geometry) return { home: [], overseas: [] };
  if (geometry.type === "Polygon") return { home: [geometry.coordinates], overseas: [] };
  if (geometry.type !== "MultiPolygon") return { home: [], overseas: [] };
  const parts = geometry.coordinates.map((coordinates) => ({ coordinates, area: geoArea({ type: "Polygon", coordinates }) }));
  const main = parts.reduce((best, part) => (part.area > best.area ? part : best));
  const outline = main.coordinates[0];
  const home = [];
  const overseas = [];
  for (const part of parts) {
    if (part === main) {
      home.push(part.coordinates);
      continue;
    }
    const center = geoCentroid({ type: "Polygon", coordinates: part.coordinates });
    let nearest = Infinity;
    for (const point of outline) nearest = Math.min(nearest, geoDistance(center, point));
    (nearest * EARTH_KM > OVERSEAS_KM ? overseas : home).push(part.coordinates);
  }
  return { home, overseas };
}

// Feature collections of the visited countries (home territory only) and US states, each feature
// tagged with its payload code in properties.code.
export function visitedRegions(travel, world, usStates) {
  const wanted = new Set(travel?.lifetime?.countries ?? []);
  const countryFeatures = feature(world, world.objects.countries).features.flatMap((f) => {
    const code = f.id
      ? [...COUNTRY_ID].find(([, id]) => id === f.id)?.[0]
      : [...COUNTRY_NAME_FALLBACK].find(([, name]) => name === f.properties?.name)?.[0];
    if (!code || !wanted.has(code)) return [];
    const { home } = homeParts(f.geometry);
    return [{ type: "Feature", properties: { code }, geometry: { type: "MultiPolygon", coordinates: home } }];
  });

  const wantedStates = new Set(travel?.lifetime?.us_states ?? []);
  const fipsToCode = new Map([...STATE_FIPS].map(([code, fips]) => [fips, code]));
  const stateFeatures = feature(usStates, usStates.objects.states).features.flatMap((f) => {
    const code = fipsToCode.get(f.id);
    return code && wantedStates.has(code) ? [{ ...f, properties: { ...f.properties, code } }] : [];
  });

  return {
    countries: { type: "FeatureCollection", features: countryFeatures },
    states: { type: "FeatureCollection", features: stateFeatures },
  };
}
