// Rebuilds a brain.public_ytd payload from the version 1 contract, keeping only known keys.
//
// BatchBrain already builds the payload without money, trip names, race names, notes, journal
// text or dates finer than a month. This is a second gate on the public side: any key the
// contract does not name is dropped, months and weeks must be small integers, coordinates are
// rounded to 0.1 degree, and as_of (the refresh date) is the only full date that passes.
// A new field in BatchBrain stays private until it is added here on purpose.

const AS_OF_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CODE_PATTERN = /^[A-Z]{2}$/;
const MEDIA_TYPES = new Set(["movie", "tv"]);
// A TMDB image path such as "/a1B2c3.jpg": one segment, no host, no query. The page prefixes
// TMDB's image host itself, so nothing here can point a public image anywhere else.
const POSTER_PATTERN = /^\/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$/;

const TOTAL_KEYS = [
  "workouts",
  "active_hours",
  "miles_run",
  "races",
  "race_prs",
  "titles",
  "movies",
  "shows",
  "avg_rating",
  "countries",
  "new_countries",
  "new_us_states",
  "trips",
  "days_traveled",
  "places_visited",
  "data_points",
];

const MONTHLY_KEYS = ["workouts", "active_hours", "miles_run", "titles", "days_traveled"];

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function int(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function text(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function posterPath(value) {
  return typeof value === "string" && POSTER_PATTERN.test(value) ? value : null;
}

function code(value) {
  return typeof value === "string" && CODE_PATTERN.test(value) ? value : null;
}

function coord(value, limit) {
  const n = num(value);
  if (n === null || Math.abs(n) > limit) return null;
  return Math.round(n * 10) / 10;
}

// Two-letter region codes only, each once, in a stable order.
function codeSet(value) {
  return [...new Set(list(value).filter((c) => code(c) !== null))].sort();
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function obj(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pick(source, keys) {
  const out = {};
  for (const key of keys) out[key] = num(source[key]);
  return out;
}

// Keeps the items whose required field passed; mapper returns null to drop an item.
function mapList(value, mapper) {
  return list(value).map((item) => mapper(obj(item))).filter(Boolean);
}

export function toPublicYtd(raw) {
  const payload = obj(raw);
  const year = int(payload.year, 2000, 2100);
  if (year === null || payload.version !== 1) return null;

  const fitness = obj(payload.fitness);
  const media = obj(payload.media);
  const travel = obj(payload.travel);
  const lifetime = obj(travel.lifetime);

  return {
    year,
    as_of: typeof payload.as_of === "string" && AS_OF_PATTERN.test(payload.as_of) ? payload.as_of : null,
    is_partial: payload.is_partial === true,
    version: 1,
    totals: pick(obj(payload.totals), TOTAL_KEYS),
    monthly: mapList(payload.monthly, (m) => {
      const month = int(m.month, 1, 12);
      return month === null ? null : { month, ...pick(m, MONTHLY_KEYS) };
    }),
    weekly: mapList(payload.weekly, (w) => {
      const week = int(w.week, 1, 53);
      return week === null ? null : { week, workouts: num(w.workouts) };
    }),
    fitness: {
      by_type: mapList(fitness.by_type, (t) => {
        const type = text(t.type, 60);
        return type === null ? null : { type, sessions: num(t.sessions), hours: num(t.hours) };
      }),
      races: mapList(fitness.races, (r) => {
        const label = text(r.label, 40);
        return label === null
          ? null
          : {
              label,
              distance_miles: num(r.distance_miles),
              is_pr: r.is_pr === true,
              month: int(r.month, 1, 12),
            };
      }),
    },
    media: {
      top_titles: mapList(media.top_titles, (t) => {
        const title = text(t.title, 200);
        return title === null
          ? null
          : {
              title,
              media_type: MEDIA_TYPES.has(t.media_type) ? t.media_type : null,
              release_year: int(t.release_year, 1870, 2100),
              rating: num(t.rating),
              tmdb_id: int(t.tmdb_id, 1, Number.MAX_SAFE_INTEGER),
              poster_path: posterPath(t.poster_path),
            };
      }),
      genres: mapList(media.genres, (g) => {
        const genre = text(g.genre, 60);
        return genre === null ? null : { genre, count: num(g.count) };
      }),
      rating_dist: mapList(media.rating_dist, (r) => {
        const stars = num(r.stars);
        return stars === null ? null : { stars, count: num(r.count) };
      }),
    },
    travel: {
      trips: mapList(travel.trips, (t) => ({
        month: int(t.month, 1, 12),
        stops: mapList(t.stops, (s) => {
          const city = text(s.city, 100);
          return city === null
            ? null
            : {
                city,
                country_code: code(s.country_code),
                lat: coord(s.lat, 90),
                lon: coord(s.lon, 180),
                mode_in: text(s.mode_in, 20),
              };
        }),
      })),
      // Regions first visited this year (BatchBrain migration 0015), by code only.
      new_countries: codeSet(travel.new_countries),
      new_us_states: codeSet(travel.new_us_states),
      lifetime: {
        countries: list(lifetime.countries).filter((c) => code(c) !== null),
        us_states: list(lifetime.us_states).filter((c) => code(c) !== null),
        stops: mapList(lifetime.stops, (s) => {
          const lat = coord(s.lat, 90);
          const lon = coord(s.lon, 180);
          return lat === null || lon === null ? null : { lat, lon };
        }),
      },
    },
  };
}
