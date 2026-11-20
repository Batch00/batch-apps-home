import { Medal } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { Grow, Reveal } from "../components/motion";
import { Eyebrow } from "../components/type";
import { formatNumber, monthName, plural } from "../format";
import { insight, longestWeekStreak } from "../insights";

// Beat 1: where the hours went, one ranked bar per activity.
function ActivityBars({ types, at }) {
  const ranked = [...types].filter((t) => t.hours > 0).sort((a, b) => b.hours - a.hours).slice(0, 6);
  const max = Math.max(1, ...ranked.map((t) => t.hours));
  return (
    <ul className="mt-8 max-w-2xl space-y-3 sm:space-y-4">
      {ranked.map((type, i) => (
        <li key={type.type} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[10rem_1fr_4rem]">
          <span className="truncate text-caption text-secondary">{type.type}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-faint" aria-hidden="true">
            <Grow
              at={at}
              on="enter"
              delay={250 + i * 70}
              axis="x"
              className={`block h-full rounded-full ${i === 0 ? "bg-accent" : "bg-[#3a3a3a]"}`}
              style={{ width: `${Math.max(2, (type.hours / max) * 100)}%` }}
            />
          </span>
          <span className="text-right text-caption tabular-nums text-text-primary">{formatNumber(type.hours, 1)}h</span>
        </li>
      ))}
    </ul>
  );
}

// Beat 2: every calendar week as a thin bar, with the longest streak picked out in blue.
function WeekStrip({ weekly, at, lastWeek }) {
  const byWeek = new Map((weekly ?? []).map((w) => [w.week, w.workouts ?? 0]));
  const max = Math.max(1, ...byWeek.values());
  const streak = longestWeekStreak(weekly);
  // Find where the (first) longest streak ends, so its weeks can be highlighted.
  let streakEnd = 0;
  for (let week = 1, run = 0; week <= 53; week++) {
    run = (byWeek.get(week) ?? 0) > 0 ? run + 1 : 0;
    if (streak > 0 && run === streak && !streakEnd) streakEnd = week;
  }
  const inStreak = (week) => streak >= 4 && week <= streakEnd && week > streakEnd - streak;
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <div className="mt-8" aria-hidden="true">
      <div className="flex h-[16svh] items-end gap-[2px] sm:gap-1">
        {weeks.map((week, i) => {
          const value = byWeek.get(week);
          if (week > lastWeek || value == null) {
            return <span key={week} className="h-px flex-1 border-t border-dashed border-dim" />;
          }
          return (
            <span key={week} className="flex h-full flex-1 flex-col justify-end">
              <Grow
                at={at}
                delay={150 + i * 12}
                className={`w-full rounded-t-[1px] ${inStreak(week) ? "bg-accent" : "bg-[#3a3a3a]"}`}
                style={{ height: `${value > 0 ? Math.max(6, (value / max) * 100) : 2}%` }}
              />
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-caption text-text-muted">
        <span>Week 1</span>
        <span>Week 52</span>
      </div>
    </div>
  );
}

export default function Fitness({ data, meta }) {
  const t = data.totals;
  const races = data.fitness?.races ?? [];
  const weekly = data.weekly ?? [];
  const lastWeek = Math.max(0, ...weekly.map((w) => w.week));
  const topActivity = insight(data, "top-activity");
  const streak = insight(data, "week-streak");
  const busiest = insight(data, "busiest-workout-month");
  const runPeak = insight(data, "run-peak");
  const raceLine = insight(data, "races");

  return (
    <Chapter {...meta}>
      <Frame>
        <Beats>
          <Reveal on="enter" at={0.5} out={0.36}>
            <Eyebrow number={meta.number} className="mb-8 sm:mb-10">
              {meta.label}
            </Eyebrow>
            <p className="max-w-3xl text-headline text-text-primary">
              {formatNumber(t.workouts)} {plural(t.workouts, "workout")},{" "}
              <span className="text-secondary">{formatNumber(t.active_hours, 1)} hours.</span>
            </p>
            {topActivity && <p className="mt-5 max-w-2xl text-lede text-secondary">{topActivity}</p>}
            <ActivityBars types={data.fitness?.by_type ?? []} at={0.5} />
          </Reveal>

          <Reveal at={0.36} out={0.72}>
            <p className="text-eyebrow uppercase text-text-muted">Week by week</p>
            {streak && <p className="mt-5 max-w-5xl text-headline text-text-primary">{streak}</p>}
            <WeekStrip weekly={weekly} at={0.36} lastWeek={lastWeek} />
            {(busiest || runPeak) && (
              <p className="mt-6 max-w-2xl text-lede text-secondary">{[busiest, runPeak].filter(Boolean).join(" ")}</p>
            )}
            <p className="sr-only">
              Workouts by week: {weekly.map((w) => `week ${w.week} ${formatNumber(w.workouts ?? 0)}`).join(", ")}.
            </p>
          </Reveal>

          {races.length > 0 && (
            <Reveal at={0.72}>
              {raceLine && <p className="max-w-5xl text-headline text-text-primary">{raceLine}</p>}
              <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4">
                {races.map((race, i) => (
                  <Reveal
                    as="li"
                    key={`${race.label}-${race.month}-${i}`}
                    at={0.72}
                    delay={250 + i * 140}
                    y={20}
                    className="rounded-xl border border-border bg-surface p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-caption uppercase tracking-widest text-text-muted">{monthName(race.month)}</span>
                      {race.is_pr && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-caption font-semibold text-accent">
                          <Medal size={14} aria-hidden="true" />
                          PR
                        </span>
                      )}
                    </div>
                    <p className="mt-6 text-title text-text-primary">{race.label}</p>
                    {race.distance_miles != null && (
                      <p className="mt-1 text-caption tabular-nums text-secondary">{formatNumber(race.distance_miles, 1)} miles</p>
                    )}
                  </Reveal>
                ))}
              </ul>
            </Reveal>
          )}
        </Beats>
      </Frame>
    </Chapter>
  );
}
