import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clapperboard, Dumbbell, Plane, Star } from "lucide-react";
import { useFadeIn } from "../hooks/useFadeIn";
import { FIRST_WRAP_YEAR, currentYear, formatAsOf, isUsable, loadYtd } from "../lib/ytd";
import { countryName, newPlaces, stateName } from "../lib/regions";
import DotMap from "./ytd/DotMap";

const FETCH_TIMEOUT_MS = 8000;
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w342";

const fmt = (value, decimals = 0) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US", { maximumFractionDigits: decimals })
    : null;

const plural = (n, one, many = `${one}s`) => (n === 1 ? one : many);

function Tile({ className = "", children, ...rest }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border-subtle bg-surface p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

function Label({ icon: Icon, children }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted sm:text-xs">
      {Icon && <Icon size={15} className="flex-shrink-0 text-accent" aria-hidden="true" />}
      {children}
    </p>
  );
}

// A number with a short caption under it, for the stat rows inside tiles.
function Stat({ value, label }) {
  if (value == null) return null;
  return (
    <div>
      <p className="text-xl font-bold tabular-nums leading-none text-text-primary sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const WEEKS = 52;

// Week (0-based column) in which each month starts, for the month initials under the chart.
function monthColumns(year) {
  return MONTH_INITIALS.map((_, month) => {
    const day = (Date.UTC(year, month, 1) - Date.UTC(year, 0, 1)) / 86400000;
    return Math.min(WEEKS - 1, Math.floor(day / 7));
  });
}

// One bar per calendar week, the busiest weeks tallest, with month initials underneath. Hover (or
// tap, on a phone) shows the week and its workout count. Fills whatever height it gets.
function WeekChart({ weekly, year, className = "" }) {
  const byWeek = new Map((weekly ?? []).map((w) => [w.week, w.workouts ?? 0]));
  const last = Math.max(0, ...byWeek.keys());
  const max = Math.max(1, ...byWeek.values());
  const weeks = Array.from({ length: WEEKS }, (_, i) => i + 1);
  const [active, setActive] = useState(null);
  const hideTimer = useRef(0);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const weekAt = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const week = Math.min(WEEKS, Math.max(1, Math.floor(((event.clientX - box.left) / box.width) * WEEKS) + 1));
    return byWeek.has(week) && week <= last ? week : null;
  };
  const onPointerMove = (event) => {
    if (event.pointerType === "mouse") setActive(weekAt(event));
  };
  const onPointerDown = (event) => {
    if (event.pointerType === "mouse") return;
    setActive(weekAt(event));
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(null), 2500);
  };

  const count = active ? byWeek.get(active) : 0;
  const center = active ? ((active - 0.5) / WEEKS) * 100 : 0;
  const tipPosition =
    center < 15 ? { left: 0 } : center > 85 ? { right: 0 } : { left: `${center}%`, transform: "translateX(-50%)" };

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className="relative flex flex-1 touch-pan-y items-end gap-[2px]"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onPointerDown={onPointerDown}
      >
        {weeks.map((week) => {
          const value = byWeek.get(week);
          if (week > last || value == null) return <span key={week} aria-hidden="true" className="h-px flex-1 bg-border" />;
          return (
            <span
              key={week}
              aria-hidden="true"
              className={`flex-1 rounded-t-[1px] transition-colors ${
                week === active ? "bg-accent-hover" : value > 0 ? "bg-accent/70" : "bg-border"
              }`}
              style={{ height: `${value > 0 ? Math.max(6, (value / max) * 100) : 3}%` }}
            />
          );
        })}
        {active && (
          <p
            className="pointer-events-none absolute -top-1 whitespace-nowrap rounded-md border border-border bg-[#0a0a0a]/95 px-2 py-1 text-[11px] font-medium text-text-primary shadow-lg"
            style={tipPosition}
          >
            Week {active}: {count} {plural(count, "workout")}
          </p>
        )}
      </div>
      <div className="relative mt-1.5 h-3.5" aria-hidden="true">
        {monthColumns(year).map((column, month) => (
          <span
            key={month}
            className="absolute text-[10px] leading-none text-text-muted"
            style={{ left: `${(column / WEEKS) * 100}%` }}
          >
            {MONTH_INITIALS[month]}
          </span>
        ))}
      </div>
      <p className="sr-only">
        Workouts each week: {(weekly ?? []).map((w) => `week ${w.week}, ${w.workouts ?? 0}`).join("; ")}.
      </p>
    </div>
  );
}

function Poster({ title, featured }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(title.poster_path) && !failed;
  return (
    <li className={`relative overflow-hidden rounded-md bg-[#161616] ring-1 ring-inset ring-border ${featured ? "flex-[1.35]" : "flex-1"}`}>
      <div className="aspect-[2/3]">
        {showImage ? (
          <img
            src={`${TMDB_IMAGE}${title.poster_path}`}
            alt={title.title}
            width={342}
            height={513}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="flex h-full items-end p-1.5 text-[10px] font-semibold leading-tight text-text-primary sm:p-2 sm:text-xs">
            {title.title}
          </p>
        )}
      </div>
    </li>
  );
}

function WorkoutsTile({ data }) {
  const t = data.totals;
  return (
    <Tile className="flex flex-col md:order-1 md:col-span-7">
      <Label icon={Dumbbell}>Workouts</Label>
      {/* The stats share the big number's row, top right; on a narrow phone they drop to one
          compact row beneath it. Either way the chart below gets the height. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <p className="text-5xl font-extrabold tabular-nums leading-none text-text-primary sm:text-6xl">{fmt(t.workouts) ?? "0"}</p>
        <div className="flex gap-x-5 sm:gap-x-6 sm:text-right">
          <Stat value={fmt(t.active_hours, 1)} label="active hours" />
          <Stat value={fmt(t.miles_run, 1)} label="miles run" />
          {t.races > 0 && <Stat value={fmt(t.races)} label={plural(t.races, "race")} />}
        </div>
      </div>
      {/* Phones: a fixed height, twice the old strip. Desktop: the chart takes the rest of the tile. */}
      <WeekChart weekly={data.weekly} year={data.year} className="mt-5 h-28 md:h-auto md:min-h-24 md:flex-1" />
    </Tile>
  );
}

function FilmTile({ data }) {
  const t = data.totals;
  const titles = (data.media?.top_titles ?? []).slice(0, 5);
  const [top] = titles;
  return (
    <Tile className="flex flex-col md:order-4 md:col-span-7">
      <Label icon={Clapperboard}>Film and TV</Label>
      {titles.length > 0 && (
        <ol className="flex items-end gap-1.5 sm:gap-2" aria-label="Top rated this year">
          {titles.map((title, i) => (
            <Poster key={title.tmdb_id ?? title.title} title={title} featured={i === 0} />
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <Stat value={fmt(t.titles)} label={plural(t.titles, "title")} />
        <Stat
          value={`${fmt(t.movies) ?? 0} / ${fmt(t.shows) ?? 0}`}
          label={`${plural(t.movies, "movie")} / ${plural(t.shows, "show")}`}
        />
        {typeof t.avg_rating === "number" && (
          <div>
            <p className="flex items-center gap-1.5 text-xl font-bold tabular-nums leading-none text-text-primary sm:text-2xl">
              {t.avg_rating.toFixed(1)}
              <Star size={16} className="fill-accent text-accent" aria-hidden="true" />
            </p>
            <p className="mt-1 text-xs text-text-muted">average rating</p>
          </div>
        )}
        {top && (
          <p className="text-xs text-text-muted sm:ml-auto sm:text-right">
            Top rated: <span className="font-semibold text-text-primary">{top.title}</span>
          </p>
        )}
      </div>
    </Tile>
  );
}

function TravelTile({ data }) {
  const t = data.totals;
  const fresh = newPlaces(data);
  const chips = [...fresh.countries.map(countryName), ...fresh.states.map(stateName)];
  const lifetimeCountries = data.travel?.lifetime?.countries?.length ?? 0;
  const lifetimeStates = data.travel?.lifetime?.us_states?.length ?? 0;
  return (
    <Tile className="flex flex-col md:order-3 md:col-span-5">
      <Label icon={Plane}>Travel</Label>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Stat value={fmt(t.countries) ?? "0"} label={plural(t.countries, "country", "countries")} />
        <Stat value={fmt(t.days_traveled) ?? "0"} label={`${plural(t.days_traveled, "day")} away`} />
        {t.places_visited > 0 && <Stat value={fmt(t.places_visited)} label={plural(t.places_visited, "place")} />}
      </div>
      {/* Phones: a fixed-shape map. Desktop: the map takes the rest of the tile's height. */}
      <DotMap data={data} aspect={null} className="mt-4 aspect-[2.2] w-full md:aspect-auto md:min-h-28 md:flex-1" />
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {chips.length > 0 && (
          <>
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">New this year</span>
            <ul className="contents" aria-label="New this year">
              {chips.map((name) => (
                <li key={name} className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-text-primary">
                  {name}
                </li>
              ))}
            </ul>
          </>
        )}
        <span className="text-[11px] text-text-muted sm:ml-auto">
          Lifetime: {lifetimeCountries} {plural(lifetimeCountries, "country", "countries")}, {lifetimeStates} US{" "}
          {plural(lifetimeStates, "state")}
        </span>
      </div>
    </Tile>
  );
}

// The current year (always the main button, never a chip) and every earlier year with a wrap,
// newest first, from FIRST_WRAP_YEAR on.
function wrapYears(data) {
  const now = currentYear();
  const final = data.year === now && data.is_partial === false;
  const past = [];
  for (let year = now - 1; year >= FIRST_WRAP_YEAR; year--) past.push(year);
  return { current: { year: now, label: `${now} ${final ? "in review" : "so far"}` }, past };
}

// One primary button for the current year, then past years as one row of small chips, so the
// tile keeps the same height as years are added (the row only wraps once it runs out of room).
function YearPicker({ data }) {
  const { current, past } = wrapYears(data);
  return (
    <nav
      aria-label="BatchWrap years"
      className="flex flex-col rounded-xl border border-accent/40 bg-[radial-gradient(ellipse_at_100%_0%,rgba(59,130,246,0.22),transparent_65%)] p-5 sm:p-6 md:order-2 md:col-span-5"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-accent sm:text-xs">BatchWrap</p>
      <p className="text-2xl font-extrabold leading-tight text-text-primary">The year, as a story</p>
      <p className="mt-2 text-sm text-text-muted">
        {fmt(data.totals.data_points) ? `${fmt(data.totals.data_points)} data points, ` : ""}the trips, the workouts and
        every title, in one scroll.
      </p>
      <div className="mt-5 md:mt-auto md:pt-5">
        <a
          href={`/${current.year}`}
          className="group flex items-center justify-between gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {current.label}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </a>
        {past.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Past years</p>
            <ul className="flex flex-wrap gap-1.5">
              {past.map((year) => (
                <li key={year}>
                  <a
                    href={`/${year}`}
                    aria-label={`${year} in review`}
                    className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium tabular-nums text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {year}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}

function YtdBento({ data }) {
  const ref = useFadeIn();
  const asOf = formatAsOf(data.as_of);
  const top = data.media?.top_titles?.[0];
  const wrapLabel = data.is_partial ? `${data.year} so far` : `${data.year} in review`;

  return (
    <section id="ytd" aria-labelledby="ytd-title" className="border-t border-[#1f1f1f] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div ref={ref} className="fade-in-section">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">{wrapLabel}</p>
          <h2 id="ytd-title" className="mb-2 text-3xl font-extrabold text-text-primary md:text-4xl">
            The year in numbers
          </h2>
          {/* One line from md up; free to wrap on phones. */}
          <p className="mb-10 max-w-lg text-text-muted sm:mb-12 md:max-w-2xl">
            Pulled from the Batch Apps through BatchBrain. Real data, counts only.
          </p>

          {/* Bento: one column on phones (workouts, film, travel, then the year picker); from md a
              12-column grid, workouts (7) beside the picker (5), then travel (5) beside film (7).
              In each row the part that grows (the week bars, the map) takes any extra height. */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-12">
            <WorkoutsTile data={data} />
            <FilmTile data={data} />
            <TravelTile data={data} />
            <YearPicker data={data} />
          </div>

          <p className="mt-5 text-xs text-text-muted">
            {asOf ? `Updated ${asOf}. ` : ""}Trips appear two weeks after they end.
            {top?.poster_path ? " Posters from TMDB." : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function YtdSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    loadYtd(currentYear(), controller.signal)
      .then((json) => {
        if (isUsable(json)) setData(json);
      })
      .catch(() => {
        // Hidden on any error: the section simply does not render.
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (!data) return null;
  return <YtdBento data={data} />;
}
