import { useEffect, useState } from "react";
import { ArrowRight, Clapperboard, Dumbbell, Plane, Star } from "lucide-react";
import { useFadeIn } from "../hooks/useFadeIn";
import { currentYear, formatAsOf, isUsable, loadYtd } from "../lib/ytd";
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

// One thin bar per calendar week, the busiest weeks tallest.
function WeekStrip({ weekly }) {
  const byWeek = new Map((weekly ?? []).map((w) => [w.week, w.workouts ?? 0]));
  const last = Math.max(0, ...byWeek.keys());
  const max = Math.max(1, ...byWeek.values());
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  return (
    <div className="mt-6 flex h-14 items-end gap-[2px] sm:h-16 md:h-auto md:min-h-16 md:flex-1" aria-hidden="true">
      {weeks.map((week) => {
        const value = byWeek.get(week);
        if (week > last || value == null) return <span key={week} className="h-px flex-1 bg-border" />;
        return (
          <span
            key={week}
            className={`flex-1 rounded-t-[1px] ${value > 0 ? "bg-accent/70" : "bg-border"}`}
            style={{ height: `${value > 0 ? Math.max(8, (value / max) * 100) : 4}%` }}
          />
        );
      })}
    </div>
  );
}

function PosterTile({ title }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(title.poster_path) && !failed;
  return (
    <Tile className="flex flex-col p-0 sm:p-0">
      <div className="relative aspect-[2/3] w-full bg-[#161616]">
        {showImage ? (
          <img
            src={`${TMDB_IMAGE}${title.poster_path}`}
            alt={`Poster for ${title.title}`}
            width={342}
            height={513}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-4">
            <p className="text-lg font-bold leading-tight text-text-primary">{title.title}</p>
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <Label icon={Star}>Top rated</Label>
        <p className="text-sm font-semibold leading-snug text-text-primary sm:text-base">{title.title}</p>
        <p className="mt-1 text-xs text-text-muted">
          {[title.media_type === "tv" ? "TV" : "Film", title.release_year].filter(Boolean).join(" · ")}
          {typeof title.rating === "number" && (
            <span className="text-accent"> · {fmt(title.rating, 1)} stars</span>
          )}
        </p>
      </div>
    </Tile>
  );
}

function YtdBento({ data }) {
  const ref = useFadeIn();
  const t = data.totals;
  const year = data.year;
  const asOf = formatAsOf(data.as_of);
  const top = data.media?.top_titles?.[0];
  const fresh = newPlaces(data);
  const chips = [...fresh.countries.map(countryName), ...fresh.states.map(stateName)];
  const lifetimeCountries = data.travel?.lifetime?.countries ?? [];
  const lifetimeStates = data.travel?.lifetime?.us_states ?? [];
  const lifetime = [...lifetimeCountries, ...lifetimeStates];
  const freshCodes = [...fresh.countries, ...fresh.states];
  const wrapLabel = data.is_partial ? `${year} so far` : `${year} in review`;

  return (
    <section id="ytd" aria-labelledby="ytd-title" className="border-t border-[#1f1f1f] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div ref={ref} className="fade-in-section">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">{wrapLabel}</p>
          <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="ytd-title" className="mb-2 text-3xl font-extrabold text-text-primary md:text-4xl">
                The year in numbers
              </h2>
              <p className="max-w-lg text-text-muted">Pulled from the Batch Apps through BatchBrain. Real data, counts only.</p>
            </div>
            <a
              href={`/${year}`}
              className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Open the full story
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>

          {/* Bento: phones 2 columns, desktop 3. Workouts and the map are wide, the poster is tall. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            <Tile className="col-span-2 flex flex-col">
              <Label icon={Dumbbell}>Workouts</Label>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-5xl font-extrabold tabular-nums leading-none text-text-primary sm:text-6xl">
                  {fmt(t.workouts) ?? "0"}
                </span>
                {fmt(t.active_hours, 1) && (
                  <span className="text-sm text-text-muted sm:text-base">{fmt(t.active_hours, 1)} active hours</span>
                )}
              </p>
              <WeekStrip weekly={data.weekly} />
              <p className="mt-2 text-[11px] text-text-muted">Each bar is one week.</p>
            </Tile>

            {top ? (
              <div className="row-span-2">
                <PosterTile title={top} />
              </div>
            ) : (
              <Tile className="row-span-2">
                <Label icon={Clapperboard}>Titles</Label>
                <p className="text-4xl font-extrabold tabular-nums text-text-primary">{fmt(t.titles) ?? "0"}</p>
              </Tile>
            )}

            <Tile className="flex flex-col justify-between">
              <Label icon={Clapperboard}>Watched</Label>
              <div>
                <p className="text-3xl font-extrabold tabular-nums leading-none text-text-primary md:text-5xl">{fmt(t.titles) ?? "0"}</p>
                <p className="mt-2 text-xs text-text-muted sm:text-sm">
                  {fmt(t.movies) ?? 0} {plural(t.movies, "movie")}, {fmt(t.shows) ?? 0} {plural(t.shows, "show")}
                </p>
                {fmt(t.avg_rating, 1) && (
                  <p className="mt-3 hidden items-center gap-1.5 text-sm text-text-muted md:flex">
                    <Star size={14} className="fill-accent text-accent" aria-hidden="true" />
                    {t.avg_rating.toFixed(1)} average rating
                  </p>
                )}
              </div>
            </Tile>

            <Tile className="flex flex-col justify-between">
              <Label icon={Plane}>Travel</Label>
              <div>
                <p className="text-3xl font-extrabold tabular-nums leading-none text-text-primary md:text-5xl">{fmt(t.countries) ?? "0"}</p>
                <p className="mt-2 text-xs text-text-muted sm:text-sm">
                  {plural(t.countries, "country", "countries")}, {fmt(t.days_traveled) ?? 0} {plural(t.days_traveled, "day")} away
                </p>
                {fmt(t.places_visited) && (
                  <p className="mt-3 hidden text-sm text-text-muted md:block">
                    {fmt(t.places_visited)} {plural(t.places_visited, "place")} visited
                  </p>
                )}
              </div>
            </Tile>

            <Tile className="col-span-2">
              <Label>
                Lifetime: {lifetimeCountries.length} {plural(lifetimeCountries.length, "country", "countries")},{" "}
                {lifetimeStates.length} US {plural(lifetimeStates.length, "state")}
              </Label>
              {/* The grid behind this map loads only when the tile nears the screen. */}
              <DotMap lifetime={lifetime} fresh={freshCodes} />
              {chips.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">New this year</p>
                  <ul className="flex flex-wrap gap-1.5" aria-label="New this year">
                    {chips.map((name) => (
                      <li key={name} className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-text-primary">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Tile>

            {/* The trailer's call to action. */}
            <a
              href={`/${year}`}
              className="group col-span-2 flex flex-col justify-between rounded-xl border border-accent/40 bg-[radial-gradient(ellipse_at_100%_0%,rgba(59,130,246,0.22),transparent_65%)] p-5 transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:p-6 md:col-span-1"
            >
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-accent sm:text-xs">BatchWrap</p>
                <p className="text-2xl font-extrabold leading-tight text-text-primary">
                  {data.is_partial ? `Watch ${year} unfold` : `Relive ${year}`}
                </p>
                <p className="mt-2 text-sm text-text-muted">
                  {fmt(t.data_points) ? `${fmt(t.data_points)} data points, ` : ""}one scroll: the trips, the
                  workouts and every title.
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:text-accent-hover">
                Open {wrapLabel}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
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
