import { Fragment } from "react";
import { Bus, Car, MapPin, Plane, Ship, TrainFront } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { CountUp, Reveal, Scrub } from "../components/motion";
import { Eyebrow, Figure } from "../components/type";
import { formatNumber, monthName, plural } from "../format";

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

  return (
    <Chapter {...meta}>
      {/* Globe slot: session 4 replaces this ring with the d3-geo globe, driven by useChapterProgress. */}
      <div
        aria-hidden="true"
        data-slot="globe"
        className="pointer-events-none absolute right-[-45vmin] top-1/2 -translate-y-1/2 sm:right-[-25vmin] lg:right-[-10vmin]"
      >
        <Scrub at={0} span={1} scale={[0.92, 1.08]} opacity={[0.6, 1]}>
          <div className="relative size-[90vmin] rounded-full border border-faint bg-[radial-gradient(circle_at_35%_35%,rgba(59,130,246,0.10),transparent_60%)]">
            <div className="absolute inset-[12%] rounded-full border border-faint" />
            <div className="absolute inset-[30%] rounded-full border border-faint" />
          </div>
        </Scrub>
      </div>

      <Frame>
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
                  return (
                    <Fragment key={`${stop.city}-${i}`}>
                      {i > 0 && (
                        <Reveal as="li" aria-hidden="true" at={0.46} delay={250 + i * 140} y={12} className="text-text-muted">
                          <Icon size={18} />
                        </Reveal>
                      )}
                      <Reveal as="li" at={0.46} delay={250 + i * 140} y={16} className="text-title text-text-primary">
                        {stop.city}
                      </Reveal>
                    </Fragment>
                  );
                })}
              </ol>
            )}
          </Reveal>
        </Beats>
      </Frame>
    </Chapter>
  );
}
