import { Chapter, Frame } from "../components/Chapter";
import { Grow, Reveal } from "../components/motion";
import { PrivateTag } from "../components/PrivateTag";
import { Eyebrow } from "../components/type";
import { formatNumber, monthInitial, monthName } from "../format";
import { insights } from "../insights";

// Private chapter: everything logged across the apps, month by month, stacked by app.
// Null means the app had no data that month (drawn as nothing), 0 means data but no events.

const APPS = [
  { key: "batchburn", label: "BatchBurn", color: "bg-accent", swatch: "bg-accent" },
  { key: "batchflix", label: "BatchFlix", color: "bg-[#b3b3b3]", swatch: "bg-[#b3b3b3]" },
  { key: "batchport", label: "BatchPort", color: "bg-[#555555]", swatch: "bg-[#555555]" },
];

const value = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export default function Timeline({ data, meta, state }) {
  const rows = data.private.timeline ?? [];
  const byMonth = new Map(rows.map((m) => [m.month, m]));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const totals = months.map((month) => APPS.reduce((sum, app) => sum + value(byMonth.get(month)?.[app.key]), 0));
  const max = Math.max(1, ...totals);
  const lines = insights(data, "timeline");

  return (
    <Chapter {...meta}>
      <Frame>
        <Reveal on="enter" at={0.5}>
          <Eyebrow number={meta.number} className="mb-8 sm:mb-10" tag={<PrivateTag />}>
            {meta.label}
          </Eyebrow>
          <p className="max-w-4xl text-headline text-text-primary">
            One year, <span className="text-accent">three apps,</span> one timeline.
          </p>
        </Reveal>

        <div className="mt-8 max-w-3xl sm:mt-10" aria-hidden="true">
          <div className="flex h-[19svh] items-end gap-1.5 sm:h-[24svh] sm:gap-2.5">
            {months.map((month, i) => {
              const row = byMonth.get(month);
              if (!row || month > state.lastMonth || totals[i] === 0) {
                return <span key={month} className="h-px flex-1 border-t border-dashed border-dim" />;
              }
              return (
                <span key={month} className="flex h-full flex-1 flex-col justify-end">
                  <Grow
                    on="enter"
                    at={0.5}
                    delay={250 + i * 55}
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-[3px]"
                    style={{ height: `${Math.max(3, (totals[i] / max) * 100)}%` }}
                  >
                    {APPS.map((app) => {
                      const n = value(row[app.key]);
                      return n > 0 ? <span key={app.key} className={app.color} style={{ flexGrow: n, flexBasis: 0 }} /> : null;
                    })}
                  </Grow>
                </span>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5 sm:gap-2.5">
            {months.map((month) => (
              <span key={month} className="flex-1 text-center text-caption text-text-muted">
                {monthInitial(month)}
              </span>
            ))}
          </div>
        </div>

        <Reveal on="enter" at={0.5} delay={950}>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption text-secondary sm:mt-5">
            {APPS.map((app) => (
              <span key={app.key} className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${app.swatch}`} aria-hidden="true" />
                {app.label}
              </span>
            ))}
          </p>
          {lines.length > 0 && (
            <div className="mt-6 max-w-3xl space-y-2 border-t border-border pt-5 sm:mt-8 sm:space-y-3 sm:pt-6">
              {lines.map((line) => (
                <p key={line.id} className="text-[0.9375rem] leading-snug text-text-primary sm:text-lede">
                  {line.text}
                </p>
              ))}
            </div>
          )}
        </Reveal>

        <p className="sr-only">
          Logged events by month:{" "}
          {rows
            .map((m) => `${monthName(m.month)}: ${APPS.map((app) => `${app.label} ${formatNumber(value(m[app.key]))}`).join(", ")}`)
            .join("; ")}
          .
        </p>
      </Frame>
    </Chapter>
  );
}
