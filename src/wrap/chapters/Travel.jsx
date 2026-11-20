import { Fragment, useMemo } from "react";
import { Bus, Car, MapPin, Plane, Ship, TrainFront } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { Globe } from "../components/Globe";
import { CountUp, Reveal } from "../components/motion";
import { Eyebrow, Figure } from "../components/type";
import { GAP_MS } from "../engine/progress";
import { formatNumber, monthName, plural } from "../format";
import { ARC_MS, routeSchedule } from "../globe/route";

const MODE_ICONS = { flight: Plane, train: TrainFront, bus: Bus, car: Car, ferry: Ship, boat: Ship };

function firstsLine(t) {
  const parts = [];
  if (t.new_countries > 0) {
    parts.push(
      t.new_countries === t.countries
        ? `All ${t.countries} for the first time`
        : `${formatNumber(t.new_countries)} of them for the first time`,
    );
  }
  if (t.new_us_states > 0) {
    parts.push(`${formatNumber(t.new_us_states)} new US ${plural(t.new_us_states, "state")}`);
  }
  return parts.length ? `${parts.join(", plus ")}.` : null;
}

export default function Travel({ data, meta }) {
  const t = data.totals;
  const trip = data.travel?.trips?.[0];
  const firsts = firstsLine(t);
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
              <Figure
                number={<CountUp value={t.countries} on="enter" at={0.5} />}
                unit={plural(t.countries, "country", "countries")}
              />
              {firsts && <p className="mt-8 max-w-xl text-lede text-secondary">{firsts}</p>}
            </Reveal>

            <Reveal at={0.46}>
              <p className="max-w-3xl text-headline text-text-primary">
                {formatNumber(t.days_traveled)} {plural(t.days_traveled, "day")} on the road
                {trip ? (
                  <>
                    , in <span className="text-accent">{monthName(trip.month)}</span>.
                  </>
                ) : (
                  "."
                )}
              </p>
              {trip && (
                <ol className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-5 sm:gap-x-5" aria-label="Route">
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
