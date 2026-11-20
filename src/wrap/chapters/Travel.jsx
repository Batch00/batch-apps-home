import { Fragment, useMemo } from "react";
import { Bus, Car, MapPin, Plane, Ship, TrainFront } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { Globe } from "../components/Globe";
import { Reveal } from "../components/motion";
import { Eyebrow } from "../components/type";
import { GAP_MS } from "../engine/progress";
import { formatNumber, plural } from "../format";
import { ARC_MS, routeSchedule } from "../globe/route";
import { capitalize, count, insight } from "../insights";

const MODE_ICONS = { flight: Plane, train: TrainFront, bus: Bus, car: Car, ferry: Ship, boat: Ship };

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code) {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

// This year's countries, in the order the trips first reached them.
function countriesThisYear(trips) {
  const codes = [];
  for (const trip of trips ?? []) for (const stop of trip.stops ?? []) if (stop.country_code && !codes.includes(stop.country_code)) codes.push(stop.country_code);
  return codes;
}

export default function Travel({ data, meta }) {
  const t = data.totals;
  const trip = data.travel?.trips?.[0];
  const firsts = insight(data, "new-regions");
  const shape = insight(data, "trip-shape");
  const visited = countriesThisYear(data.travel?.trips);
  // Each city in the text appears as its arc lands on the globe.
  const schedule = useMemo(() => routeSchedule(data.travel?.trips), [data.travel]);
  const timing = (stopIndex) => schedule.find((s) => s.tripIndex === 0 && s.stopIndex === stopIndex);

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
              {/* Sentence-led: the count reads as a word, then the countries themselves. */}
              <p className="text-[clamp(2.75rem,10vw,6rem)] font-bold leading-[0.95] tracking-[-0.045em] text-text-primary">
                {capitalize(count(t.countries))} {plural(t.countries, "country", "countries")}.
              </p>
              {visited.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="Countries this year">
                  {visited.map((code, i) => (
                    <Reveal
                      as="li"
                      key={code}
                      on="enter"
                      at={0.5}
                      delay={250 + i * 90}
                      y={10}
                      className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-caption font-medium text-text-primary"
                    >
                      {countryName(code)}
                    </Reveal>
                  ))}
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
              {trip && (
                <ol className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-5 sm:gap-x-5" aria-label="Route">
                  {trip.stops.map((stop, i) => {
                    const Icon = MODE_ICONS[stop.mode_in] ?? MapPin;
                    const when = timing(i);
                    const at = when?.at ?? 0.46;
                    const landsAfter = when?.from ? ARC_MS - GAP_MS : 0;
                    return (
                      <Fragment key={`${stop.city}-${i}`}>
                        {i > 0 && (
                          <Reveal as="li" aria-hidden="true" at={at} y={12} className="text-text-muted">
                            <Icon size={18} />
                          </Reveal>
                        )}
                        <Reveal as="li" at={at} delay={landsAfter} y={16} className="text-title text-text-primary">
                          {stop.city}
                        </Reveal>
                      </Fragment>
                    );
                  })}
                </ol>
              )}
            </Reveal>
          </Beats>
        </div>
      </Frame>
    </Chapter>
  );
}
