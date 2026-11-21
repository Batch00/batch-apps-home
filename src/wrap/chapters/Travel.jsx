import { Fragment, useMemo } from "react";
import { Bus, Car, MapPin, Plane, Ship, TrainFront } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { Globe } from "../components/Globe";
import { Reveal } from "../components/motion";
import { Eyebrow } from "../components/type";
import { GAP_MS } from "../engine/progress";
import { countryName, newPlaces, stateName } from "../../lib/regions";
import { formatNumber, monthName, plural } from "../format";
import { ARC_MS, routeSchedule } from "../globe/route";
import { capitalize, count, insight } from "../insights";

const MODE_ICONS = { flight: Plane, train: TrainFront, bus: Bus, car: Car, ferry: Ship, boat: Ship };

// This year's countries, in the order the trips first reached them.
function countriesThisYear(trips) {
  const codes = [];
  for (const trip of trips ?? []) for (const stop of trip.stops ?? []) if (stop.country_code && !codes.includes(stop.country_code)) codes.push(stop.country_code);
  return codes;
}

// Phones show at most this many place chips, then a "+N more" chip, so a big travel year still
// fits under the globe. Wider screens show them all.
const PHONE_CHIPS = 8;

function Chip({ isNew, delay, phoneHidden = false, phoneOnly = false, children }) {
  return (
    <Reveal
      as="li"
      on="enter"
      at={0.5}
      delay={delay}
      y={10}
      className={`rounded-full border px-2.5 py-1 text-caption font-medium sm:px-3 sm:py-1.5 ${
        isNew ? "border-accent/50 bg-accent/15 text-text-primary" : "border-border text-secondary"
      } ${phoneHidden ? "max-sm:hidden" : ""} ${phoneOnly ? "sm:hidden" : ""}`}
    >
      {children}
      {isNew && <span className="sr-only">, first visit</span>}
    </Reveal>
  );
}

export default function Travel({ data, meta }) {
  const t = data.totals;
  const trips = (data.travel?.trips ?? []).filter((trip) => (trip.stops ?? []).length > 0);
  const firsts = insight(data, "new-regions");
  const shape = insight(data, "trip-shape");
  const visited = countriesThisYear(trips);
  const fresh = newPlaces(data);
  const newCountries = new Set(fresh.countries);
  // Long routes switch to a smaller type size so every stop still fits the stage on a phone.
  const stopCount = trips.reduce((total, trip) => total + trip.stops.length, 0);
  const compact = stopCount > 6;
  const stopText = stopCount > 10 ? "text-[0.9375rem] leading-snug" : compact ? "text-lede" : "text-title";
  const places = [
    ...visited.map((code) => ({ key: code, name: countryName(code), isNew: newCountries.has(code) })),
    ...fresh.states.map((code) => ({ key: `us-${code}`, name: stateName(code), isNew: true })),
  ];
  const overflow = Math.max(0, places.length - PHONE_CHIPS);
  // Each city in the text appears as its arc lands on the globe.
  const schedule = useMemo(() => routeSchedule(data.travel?.trips), [data.travel]);
  const timing = (tripIndex, stopIndex) => schedule.find((s) => s.tripIndex === tripIndex && s.stopIndex === stopIndex);

  return (
    <Chapter {...meta}>
      {/* Phones and tablets: the globe fills a band above the text. Desktop: the right side. */}
      <Globe
        travel={data.travel}
        className="pointer-events-none absolute inset-x-0 top-14 h-[36svh] lg:inset-x-auto lg:right-0 lg:top-0 lg:h-full lg:w-[56%]"
      />

      <Frame>
        {/* The spacer keeps the text below the globe band on phones, whatever the beat's height. */}
        <div className="mt-[calc(36svh-2.5rem)] lg:mt-0 lg:max-w-[42%]">
          <Beats>
            <Reveal on="enter" at={0.5} out={0.42}>
              <Eyebrow number={meta.number} className="mb-8 sm:mb-10">
                {meta.label}
              </Eyebrow>
              {/* Sentence-led: the count reads as a word, then the places themselves. */}
              <p className="text-[clamp(2.75rem,10vw,6rem)] font-bold leading-[0.95] tracking-[-0.045em] text-text-primary">
                {capitalize(count(t.countries))} {plural(t.countries, "country", "countries")}.
              </p>
              {places.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-1.5 sm:gap-2" aria-label="Places this year">
                  {places.map((place, i) => (
                    <Chip key={place.key} isNew={place.isNew} delay={250 + i * 60} phoneHidden={i >= PHONE_CHIPS}>
                      {place.name}
                    </Chip>
                  ))}
                  {overflow > 0 && (
                    <Chip delay={250 + PHONE_CHIPS * 60} phoneOnly>
                      <span aria-hidden="true">+{overflow} more</span>
                    </Chip>
                  )}
                </ul>
              )}
              {firsts && <p className="mt-6 max-w-xl text-lede text-secondary">{firsts}</p>}
            </Reveal>

            <Reveal at={0.46}>
              {shape && <p className="max-w-3xl text-headline text-text-primary">{shape}</p>}
              <p className="mt-4 text-lede text-secondary">
                <span className="font-semibold text-accent">{formatNumber(t.days_traveled)}</span>{" "}
                {plural(t.days_traveled, "day")} on the road.
              </p>
              <div className={compact ? "mt-6 space-y-4" : "mt-8 space-y-6"}>
                {trips.map((trip, tripIndex) => (
                  <div key={`${trip.month}-${tripIndex}`}>
                    {trips.length > 1 && (
                      <p className="mb-2 text-eyebrow uppercase text-text-muted">{monthName(trip.month)}</p>
                    )}
                    <ol
                      className={`flex flex-wrap items-center ${compact ? "gap-x-2.5 gap-y-1.5" : "gap-x-4 gap-y-5 sm:gap-x-5"}`}
                      aria-label={trips.length > 1 ? `Route in ${monthName(trip.month)}` : "Route"}
                    >
                      {trip.stops.map((stop, i) => {
                        const Icon = MODE_ICONS[stop.mode_in] ?? MapPin;
                        const when = timing(tripIndex, i);
                        const at = when?.at ?? 0.46;
                        const landsAfter = when?.from ? ARC_MS - GAP_MS : 0;
                        return (
                          <Fragment key={`${stop.city}-${i}`}>
                            {i > 0 && (
                              <Reveal as="li" aria-hidden="true" at={at} y={12} className="text-text-muted">
                                <Icon size={compact ? 13 : 18} />
                              </Reveal>
                            )}
                            <Reveal
                              as="li"
                              at={at}
                              delay={landsAfter}
                              y={16}
                              className={`${stopText} text-text-primary`}
                            >
                              {stop.city}
                            </Reveal>
                          </Fragment>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            </Reveal>
          </Beats>
        </div>
      </Frame>
    </Chapter>
  );
}
