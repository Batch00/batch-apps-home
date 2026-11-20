import { Chapter, Frame } from "../components/Chapter";
import { Reveal } from "../components/motion";
import { Eyebrow } from "../components/type";
import { formatNumber, monthInitial, monthName } from "../format";

const ROWS = [
  { key: "workouts", label: "Workouts" },
  { key: "titles", label: "Titles" },
  { key: "days_traveled", label: "Travel days" },
];

export default function Patterns({ data, meta, state }) {
  const byMonth = new Map((data.monthly ?? []).map((m) => [m.month, m]));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Chapter {...meta}>
      <Frame>
        <Reveal on="enter" at={0.5} span={0.45}>
          <Eyebrow number={meta.number} className="mb-8 sm:mb-10">
            {meta.label}
          </Eyebrow>
          <p className="max-w-3xl text-headline text-text-primary">
            Every month, <span className="text-accent">every app.</span>
          </p>
        </Reveal>

        <div className="mt-12 grid max-w-4xl grid-cols-[auto_repeat(12,minmax(0,1fr))] items-center gap-1 sm:gap-2" aria-hidden="true">
          <span />
          {months.map((month) => (
            <span key={month} className="pb-1 text-center text-caption text-dim">
              {monthInitial(month)}
            </span>
          ))}
          {ROWS.map((row) => {
            const max = Math.max(1, ...months.map((m) => byMonth.get(m)?.[row.key] ?? 0));
            return [
              <span key={`${row.key}-label`} className="pr-2 text-caption text-text-muted sm:pr-4">
                {row.label}
              </span>,
              ...months.map((month, i) => {
                const value = byMonth.get(month)?.[row.key];
                const isFuture = month > state.lastMonth || value == null;
                const strength = isFuture ? 0 : value / max;
                return (
                  <Reveal key={`${row.key}-${month}`} at={0.05 + i * 0.03} span={0.12} y={12}>
                    <div
                      className={`aspect-square w-full rounded-[3px] ${
                        isFuture ? "border border-dashed border-faint" : value === max ? "bg-accent" : ""
                      }`}
                      style={
                        isFuture || value === max
                          ? undefined
                          : { backgroundColor: `rgba(245, 245, 245, ${0.05 + strength * 0.55})` }
                      }
                    />
                  </Reveal>
                );
              }),
            ];
          })}
        </div>

        <Reveal at={0.45} span={0.12}>
          <p className="mt-8 max-w-xl text-caption text-text-muted">
            Brighter means busier. Each row is scaled to its own peak, marked in blue.
          </p>
        </Reveal>

        <div className="sr-only">
          {ROWS.map((row) => (
            <p key={row.key}>
              {row.label} by month:{" "}
              {(data.monthly ?? []).map((m) => `${monthName(m.month)} ${formatNumber(m[row.key] ?? 0, 1)}`).join(", ")}.
            </p>
          ))}
        </div>
      </Frame>
    </Chapter>
  );
}
