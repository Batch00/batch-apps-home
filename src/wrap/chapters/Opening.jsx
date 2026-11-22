import { Clapperboard, Dumbbell, Plane } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { CountUp, Reveal, Scrub } from "../components/motion";
import { NavHint } from "../components/NavHint";
import { formatNumber, plural } from "../format";
import { insight } from "../insights";

// The three apps behind most of the year, as a ledger under the headline number.
function ledger(t) {
  return [
    { icon: Dumbbell, value: t.workouts, label: plural(t.workouts, "workout") },
    { icon: Clapperboard, value: t.titles, label: plural(t.titles, "title") },
    { icon: Plane, value: t.days_traveled, label: `${plural(t.days_traveled, "day")} away` },
  ].filter((row) => typeof row.value === "number" && row.value > 0);
}

export default function Opening({ data, meta, state }) {
  const t = data.totals;
  const rate = insight(data, "data-rate");
  const rows = ledger(t);

  return (
    <Chapter {...meta}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_70%_60%_at_30%_100%,rgba(59,130,246,0.14),transparent_70%)]"
      />
      <Frame>
        <Beats>
          <Reveal out={0.36} y={0}>
            <Scrub at={0.02} span={0.34} y={[0, -90]} scale={[1, 0.9]} origin="0% 60%">
              <div className="wrap-intro">
                <p className="mb-6 text-eyebrow uppercase text-accent sm:mb-8">BatchWrap</p>
                <h1 className="text-mega text-text-primary">
                  {data.year}
                  <span className="sr-only"> {state.isFinal ? "in review" : "so far"}</span>
                </h1>
                <p className="mt-8 max-w-xl text-lede text-secondary sm:mt-10">
                  A year in data, from five apps I built to track it.
                </p>
              </div>
            </Scrub>
          </Reveal>

          <Reveal at={0.4}>
            <p className="mb-6 text-eyebrow uppercase text-text-muted">
              {state.isFinal ? `Logged in ${data.year}` : "Logged so far"}
            </p>
            <p className="text-display text-text-primary">
              <CountUp value={t.data_points} at={0.4} />
            </p>
            <Reveal as="p" at={0.4} delay={200} className="mt-5 text-headline text-text-primary">
              data <span className="text-accent">points</span>
            </Reveal>
            {rate && (
              <Reveal as="p" at={0.4} delay={400} className="mt-6 max-w-xl text-lede text-secondary">
                {rate}
              </Reveal>
            )}
            {rows.length > 0 && (
              <ul className="mt-10 grid max-w-2xl grid-cols-3 border-t border-border">
                {rows.map(({ icon: Icon, value, label }, i) => (
                  <Reveal
                    as="li"
                    key={label}
                    at={0.4}
                    delay={600 + i * 120}
                    y={16}
                    className="border-r border-border pr-3 pt-5 last:border-r-0 sm:pr-6 [&:not(:first-child)]:pl-3 sm:[&:not(:first-child)]:pl-6"
                  >
                    <Icon size={16} className="mb-3 text-accent" aria-hidden="true" />
                    <p className="text-title tabular-nums text-text-primary">{formatNumber(value)}</p>
                    <p className="mt-1 text-caption text-secondary">{label}</p>
                  </Reveal>
                ))}
              </ul>
            )}
          </Reveal>
        </Beats>
      </Frame>

      <NavHint />
    </Chapter>
  );
}
