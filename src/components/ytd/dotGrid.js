import { newPlaces, stateKey } from "../../lib/regions";

// Which dots of the home page's dot map light up, kept apart from the canvas code so it can be
// tested against the atlases (dotGrid.test.js).

export const TILE_ASPECT = 2.6;
const PAD_COLS = 8;
const PAD_ROWS = 4;

// Grid keys to light: countries by ISO code, states as "US-XX" (a bare USPS code would also
// match a country: CA is Canada, MN Mongolia, LA Laos). Overseas keys ("~FR") never match.
export function mapKeys(data) {
  const lifetime = data?.travel?.lifetime ?? {};
  const fresh = newPlaces(data);
  return {
    lifetime: new Set([...(lifetime.countries ?? []), ...(lifetime.us_states ?? []).map(stateKey)]),
    fresh: new Set([...fresh.countries, ...fresh.states.map(stateKey)]),
  };
}

export function toneOf(key, keys) {
  if (keys.fresh.has(key)) return "fresh";
  if (keys.lifetime.has(key)) return "lifetime";
  return "land";
}

// Grid position of a point, as fractional { row, col } (pins sit between cell centers).
export function gridPosition(grid, lon, lat) {
  return { row: (grid.top - lat) / grid.step - 0.5, col: (lon + 180) / grid.step - 0.5 };
}

// Every dot as { row, col, lon, lat, key, tone }: grid cells first, then pins (small regions
// drawn at a point inside them). With `onlyLit`, land dots are left out.
export function allDots(grid, keys, onlyLit = false) {
  const dots = [];
  grid.runs.forEach((runs, row) => {
    for (const [start, length, key] of runs) {
      const tone = toneOf(key, keys);
      if (onlyLit && tone === "land") continue;
      for (let col = start; col < start + length; col++) {
        const [lon, lat] = cellCenter(grid, row, col);
        dots.push({ row, col, lon, lat, key, tone });
      }
    }
  });
  for (const [lon, lat, key] of grid.pins ?? []) {
    const tone = toneOf(key, keys);
    if (onlyLit && tone === "land") continue;
    dots.push({ ...gridPosition(grid, lon, lat), lon, lat, key, tone, pin: true });
  }
  return dots;
}

export function litDots(grid, keys) {
  return allDots(grid, keys, true);
}

// The grid window to draw: every lit dot plus some context, never narrower than the tile.
export function cropFor(grid, keys, aspect = TILE_ASPECT) {
  let c0 = Infinity;
  let c1 = -Infinity;
  let r0 = Infinity;
  let r1 = -Infinity;
  for (const { row, col } of litDots(grid, keys)) {
    c0 = Math.min(c0, Math.floor(col));
    c1 = Math.max(c1, Math.ceil(col));
    r0 = Math.min(r0, Math.floor(row));
    r1 = Math.max(r1, Math.ceil(row));
  }
  if (c0 === Infinity) return { c0: 0, c1: grid.cols - 1, r0: 0, r1: grid.rows - 1 };
  c0 = Math.max(0, c0 - PAD_COLS);
  c1 = Math.min(grid.cols - 1, c1 + PAD_COLS);
  r0 = Math.max(0, r0 - PAD_ROWS);
  r1 = Math.min(grid.rows - 1, r1 + PAD_ROWS);
  // Widen a tall crop so it fills the tile instead of floating in the middle of it.
  const minCols = Math.ceil((r1 - r0 + 1) * aspect);
  while (c1 - c0 + 1 < minCols && (c0 > 0 || c1 < grid.cols - 1)) {
    if (c0 > 0) c0--;
    if (c1 - c0 + 1 < minCols && c1 < grid.cols - 1) c1++;
  }
  return { c0, c1, r0, r1 };
}

// Center of a grid cell, as [lon, lat].
export function cellCenter(grid, row, col) {
  return [-180 + (col + 0.5) * grid.step, grid.top - (row + 0.5) * grid.step];
}
