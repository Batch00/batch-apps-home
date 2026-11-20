import { Beats, Chapter, Frame } from "../components/Chapter";
import { CountUp, Grow, Reveal } from "../components/motion";
import { Eyebrow, Figure } from "../components/type";
import { formatNumber, monthInitial, monthName, plural } from "../format";

function MonthBars({ monthly, lastMonth }) {
  const byMonth = new Map(monthly.map((m) => [m.month, m.workouts ?? 0]));
  const max = Math.max(1, ...byMonth.values());
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="mt-10">
      <div className="flex h-[30svh] items-end gap-1.5 sm:gap-3" aria-hidden="true">
        {months.map((month, i) => {
          const value = byMonth.get(month);
          const isFuture = month > lastMonth;
          const isMax = value === max;
          return (
            <div key={month} className="flex h-full flex-1 flex-col justify-end">
              {isFuture || value == null ? (
                <div className="h-px w-full border-t border-dashed border-dim" />
              ) : (
                <Grow
                  at={0.38 + i * 0.012}
                  span={0.1}
                  className={`w-full rounded-t-sm ${isMax ? "bg-accent" : "bg-[#2e2e2e]"}`}
                  style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-1.5 sm:gap-3" aria-hidden="true">
        {months.map((month) => (
          <span key={month} className="flex-1 text-center text-caption tabular-nums text-dim">
            {monthInitial(month)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Fitness({ data, meta, state }) {
  const t = data.totals;
  const monthly = data.monthly ?? [];
  const races = data.fitness?.races ?? [];
  const busiest = monthly.reduce((best, m) => ((m.workouts ?? 0) > (best?.workouts ?? -1) ? m : best), null);

  return (
    <Chapter {...meta}>
      <Frame>
        <Beats>
          <Reveal on="enter" at={0.5} span={0.45} out={0.36}>
            <Eyebrow number={meta.number} className="mb-8 sm:mb-10">
              {meta.label}
            </Eyebrow>
            <Figure
              number={<CountUp value={t.workouts} on="enter" at={0.55} span={0.45} />}
              unit={plural(t.workouts, "workout")}
            />
            <p className="mt-8 max-w-xl text-lede text-text-muted">
              {formatNumber(t.active_hours, 1)} active hours and {formatNumber(t.miles_run, 1)} miles run.
            </p>
          </Reveal>

          <Reveal at={0.36} span={0.1} out={0.74}>
            <p className="text-title text-text-primary">Month by month</p>
            {busiest && (
              <p className="mt-3 text-lede text-text-muted">
                The busiest was {monthName(busiest.month)}, with {formatNumber(busiest.workouts)}.
              </p>
            )}
            <MonthBars monthly={monthly} lastMonth={state.lastMonth} />
            <p className="sr-only">
              Workouts by month:{" "}
              {monthly.map((m) => `${monthName(m.month)} ${formatNumber(m.workouts ?? 0)}`).join(", ")}.
            </p>
          </Reveal>

          {races.length > 0 && (
            <div>
              <Reveal at={0.76} span={0.1}>
                <p className="text-headline text-text-primary">
                  {formatNumber(t.races)} {plural(t.races, "race")}.{" "}
                  {t.race_prs > 0 && (
                    <span className="text-accent">
                      {formatNumber(t.race_prs)} {plural(t.race_prs, "PR")}.
                    </span>
                  )}
                </p>
              </Reveal>
              <Reveal as="ul" at={0.78} span={0.1} y={0} className="mt-10 max-w-2xl divide-y divide-border border-y border-border">
                {races.map((race, i) => (
                  <Reveal
                    as="li"
                    key={`${race.label}-${race.month}-${i}`}
                    at={0.8 + i * 0.04}
                    span={0.1}
                    y={20}
                    className="flex items-baseline justify-between gap-4 py-5"
                  >
                    <span className="text-title text-text-primary">{race.label}</span>
                    <span className="flex items-baseline gap-4 text-caption uppercase tracking-widest text-text-muted">
                      {monthName(race.month)}
                      {race.is_pr && <span className="font-semibold text-accent">PR</span>}
                    </span>
                  </Reveal>
                ))}
              </Reveal>
            </div>
          )}
        </Beats>
      </Frame>
    </Chapter>
  );
}
