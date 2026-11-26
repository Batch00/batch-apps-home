import { StretchHorizontal } from "lucide-react";
import { Chapter, Frame } from "../components/Chapter";
import { Reveal } from "../components/motion";
import { PrivateTag } from "../components/PrivateTag";
import { Eyebrow } from "../components/type";
import { formatNumber, plural } from "../format";
import { capitalize, count, insight } from "../insights";

// Private chapter: strength sessions by routine (the workout's note), and stretching, which is
// counted apart from workouts.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
// Each routine card shows a row of ticks scaled to the busiest routine, which gets this many
// (one row on a phone card).
const MAX_TICKS = 16;

function hours(minutes) {
  return isNum(minutes) ? formatNumber(minutes / 60, 1) : null;
}

function RoutineCard({ routine, max, index }) {
  const ticks = Math.max(1, Math.round((routine.sessions / max) * MAX_TICKS));
  return (
    <Reveal
      as="li"
      on="enter"
      at={0.5}
      delay={250 + index * 110}
      y={18}
      className={`min-w-0 rounded-xl border p-3 sm:p-5 ${index === 0 ? "border-accent/50 bg-accent/10" : "border-border bg-surface"}`}
    >
      <p className={`truncate text-caption font-medium ${routine.routine ? "text-text-primary" : "italic text-text-muted"}`}>
        {routine.routine ?? "Unnamed"}
      </p>
      {/* Phones stack the count over its unit, so three cards fit in a row. */}
      <p className="mt-2 flex flex-col text-title tabular-nums text-text-primary sm:mt-4 sm:block">
        {formatNumber(routine.sessions)}
        <span className="text-caption font-normal text-secondary sm:ml-2">{plural(routine.sessions, "session")}</span>
      </p>
      {hours(routine.minutes) && <p className="mt-1 text-caption tabular-nums text-text-muted">{hours(routine.minutes)} hours</p>}
      <div className="mt-4 flex gap-[3px] overflow-hidden max-sm:hidden" aria-hidden="true">
        {Array.from({ length: ticks }, (_, i) => (
          <span key={i} className={`h-3 w-1 shrink-0 rounded-full ${index === 0 ? "bg-accent" : "bg-[#4a4a4a]"}`} />
        ))}
      </div>
    </Reveal>
  );
}

export default function Training({ data, meta }) {
  const fit = data.private.fitness_private;
  const routines = [...(fit.strength ?? [])].filter((r) => r.sessions > 0).sort((a, b) => b.sessions - a.sessions);
  const total = routines.reduce((sum, r) => sum + r.sessions, 0);
  const max = Math.max(1, ...routines.map((r) => r.sessions));
  const topRoutine = insight(data, "top-routine");
  const stretchLine = insight(data, "stretching");
  const stretchSessions = fit.stretch_sessions;

  return (
    <Chapter {...meta}>
      <Frame>
        <Reveal on="enter" at={0.5}>
          <Eyebrow number={meta.number} className="mb-8 sm:mb-10" tag={<PrivateTag />}>
            {meta.label}
          </Eyebrow>
          <p className="max-w-4xl text-headline text-text-primary">
            {total > 0 ? (
              <>
                {capitalize(count(total))} strength {plural(total, "session")}.
              </>
            ) : (
              "Stretching, on its own."
            )}
          </p>
          {topRoutine && <p className="mt-5 max-w-2xl text-lede text-secondary">{topRoutine}</p>}
        </Reveal>

        {routines.length > 0 && (
          <ul className="mt-6 grid max-w-4xl grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
            {routines.slice(0, 6).map((routine, i) => (
              <RoutineCard key={`${routine.routine ?? "unnamed"}-${i}`} routine={routine} max={max} index={i} />
            ))}
          </ul>
        )}

        {isNum(stretchSessions) && stretchSessions > 0 && (
          <Reveal on="enter" at={0.5} delay={250 + Math.min(routines.length, 6) * 110 + 150}>
            <p className="mt-6 flex max-w-2xl items-start gap-3 border-t border-border pt-5 text-lede text-text-primary sm:mt-8 sm:pt-6">
              <StretchHorizontal size={22} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
              {stretchLine}
            </p>
          </Reveal>
        )}
      </Frame>
    </Chapter>
  );
}
