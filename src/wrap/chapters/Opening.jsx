import { ChevronDown } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { CountUp, Reveal, Scrub } from "../components/motion";
import { formatNumber, plural } from "../format";

export default function Opening({ data, meta, state }) {
  const t = data.totals;

  return (
    <Chapter {...meta}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[radial-gradient(ellipse_70%_60%_at_30%_100%,rgba(59,130,246,0.14),transparent_70%)]"
      />
      <Frame>
        <Beats>
          <Scrub at={0.04} span={0.4} opacity={[1, 0]} y={[0, -140]} scale={[1, 0.86]} origin="0% 60%">
            <div className="wrap-intro">
              <p className="mb-6 text-eyebrow uppercase text-accent sm:mb-8">BatchWrap</p>
              <h1 className="text-mega text-text-primary">{data.year}</h1>
              <p className="mt-8 max-w-xl text-lede text-text-muted sm:mt-10">
                A year in data, logged one workout, one title and one stop at a time across the Batch Apps.
              </p>
            </div>
          </Scrub>

          <div>
            <Reveal at={0.44} span={0.14}>
              <p className="mb-6 text-eyebrow uppercase text-text-muted">
                {state.isFinal ? `Logged in ${data.year}` : "Logged so far"}
              </p>
            </Reveal>
            <Reveal at={0.47} span={0.16}>
              <p className="text-display text-text-primary">
                <CountUp value={t.data_points} at={0.47} span={0.3} />
              </p>
            </Reveal>
            <Reveal at={0.56} span={0.14}>
              <p className="mt-5 text-headline text-text-primary">
                data <span className="text-accent">points</span>
              </p>
            </Reveal>
            <Reveal at={0.66} span={0.14}>
              <p className="mt-8 max-w-xl text-lede text-text-muted">
                {formatNumber(t.workouts)} {plural(t.workouts, "workout")}. {formatNumber(t.titles)}{" "}
                {plural(t.titles, "title")}. {formatNumber(t.countries)} {plural(t.countries, "country", "countries")}.
                Here is how it all adds up.
              </p>
            </Reveal>
          </div>
        </Beats>
      </Frame>

      <div data-motion-only aria-hidden="true" className="absolute inset-x-0 bottom-8 flex justify-center">
        <Scrub at={0} span={0.1} opacity={[1, 0]}>
          <div className="wrap-bob flex flex-col items-center gap-2 text-eyebrow uppercase text-dim">
            Scroll
            <ChevronDown size={16} />
          </div>
        </Scrub>
      </div>
    </Chapter>
  );
}
