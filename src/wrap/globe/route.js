// Timing shared by the globe and the travel chapter's text, so a city name in the text lands
// at the same moment its arc reaches the city on the globe. Small and dependency free: it ships
// in the wrap chunk, while the globe renderer and its map data load separately.

// How long one arc takes to draw once triggered.
export const ARC_MS = 1100;

// Camera keyframes, as the travel chapter's pinned progress (p):
//   0 to TURN_END            the whole globe turns slowly (follows the scroll)
//   TURN_END to ZOOM_IN_END  rotates and zooms into the route
//   ZOOM_OUT_START to 1      eases back out to the whole globe
export const TURN_END = 0.26;
export const ZOOM_IN_END = 0.44;
export const ZOOM_OUT_START = 0.86;

const FIRST_STOP_AT = 0.47;
const LAST_STOP_BY = 0.8;
const MAX_STEP = 0.08;

// Flattens trips (each in visiting order) into the order the globe draws them.
// Each stop gets `at`, the pinned progress that triggers it, and `from`, the previous stop of
// the same trip (its arc starts there), or null for a trip's first stop, which simply appears.
// No home origin: every trip starts at its own first stop.
export function routeSchedule(trips) {
  const stops = [];
  (trips ?? []).forEach((trip, tripIndex) => {
    let previous = null;
    (trip.stops ?? []).forEach((stop, stopIndex) => {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return;
      stops.push({ ...stop, tripIndex, stopIndex, from: previous });
      previous = stop;
    });
  });
  const step = stops.length > 1 ? Math.min(MAX_STEP, (LAST_STOP_BY - FIRST_STOP_AT) / (stops.length - 1)) : 0;
  return stops.map((stop, i) => ({ ...stop, at: FIRST_STOP_AT + i * step }));
}
