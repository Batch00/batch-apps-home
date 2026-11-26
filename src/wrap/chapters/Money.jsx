import { Beats, Chapter, Frame } from "../components/Chapter";
import { Grow, Reveal } from "../components/motion";
import { PrivateTag } from "../components/PrivateTag";
import { Eyebrow } from "../components/type";
import { formatMoney, formatPercent, monthInitial, monthName } from "../format";
import { insight } from "../insights";

// Private chapter. Spending is budget_spend (Savings excluded) against the month's plan.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// Beat 1: one column per month, spend as the bar and the plan as a line across it.
function SpendColumns({ monthly, lastMonth }) {
  const byMonth = new Map(monthly.map((m) => [m.month, m]));
  const max = Math.max(1, ...monthly.flatMap((m) => [m.spend ?? 0, m.planned ?? 0]));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="mt-8 max-w-3xl" aria-hidden="true">
      <div className="flex h-[22svh] items-end gap-1 sm:h-[26svh] sm:gap-2">
        {months.map((month, i) => {
          const m = byMonth.get(month);
          if (!m || !isNum(m.spend) || month > lastMonth) {
            return <span key={month} className="h-px flex-1 border-t border-dashed border-dim" />;
          }
          const over = isNum(m.planned) && m.planned > 0 && m.spend > m.planned;
          return (
            <span key={month} className="relative flex h-full flex-1 flex-col justify-end">
              <Grow
                at={0.5}
                on="enter"
                delay={250 + i * 50}
                className={`w-full rounded-t-[3px] ${over ? "bg-accent" : "bg-[#3a3a3a]"}`}
                style={{ height: `${Math.max(2, (m.spend / max) * 100)}%` }}
              />
              {isNum(m.planned) && m.planned > 0 && (
                <span
                  className="absolute inset-x-[-2px] h-0.5 rounded-full bg-text-primary"
                  style={{ bottom: `${(m.planned / max) * 100}%` }}
                />
              )}
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-2">
        {months.map((month) => (
          <span key={month} className="flex-1 text-center text-caption text-text-muted">
            {monthInitial(month)}
          </span>
        ))}
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-secondary">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-text-primary" />
          Plan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#3a3a3a]" />
          Spent
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
          Over plan
        </span>
      </p>
    </div>
  );
}

// Beat 2: the top categories, each with its spend and its percent of plan.
function CategoryRows({ categories }) {
  const top = categories.filter((c) => isNum(c.spend) && c.spend > 0).slice(0, 6);
  const max = Math.max(1, ...top.map((c) => c.spend));
  return (
    <ul className="mt-8 max-w-3xl space-y-4">
      {top.map((c, i) => {
        const over = isNum(c.pct_of_plan) && Math.round(c.pct_of_plan) > 100;
        return (
          <li key={c.category}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-lede text-text-primary">{c.category}</span>
              <span className="shrink-0 text-caption tabular-nums text-secondary">
                {formatMoney(c.spend)}
                {isNum(c.pct_of_plan) && (
                  <span className={`ml-2 font-semibold ${over ? "text-accent" : "text-text-primary"}`}>
                    {formatPercent(Math.round(c.pct_of_plan))} of plan
                  </span>
                )}
              </span>
            </div>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-faint" aria-hidden="true">
              <Grow
                at={0.34}
                delay={200 + i * 70}
                axis="x"
                className={`block h-full rounded-full ${over ? "bg-accent" : "bg-[#4a4a4a]"}`}
                style={{ width: `${Math.max(2, (c.spend / max) * 100)}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Beat 3: net worth month by month, as one line.
function NetWorthLine({ monthly }) {
  const points = monthly.filter((m) => isNum(m.value));
  if (points.length < 2) return null;
  const values = points.map((m) => m.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (month) => ((month - 1) / 11) * 100;
  const y = (value) => 36 - ((value - min) / span) * 32;
  const path = points.map((m, i) => `${i ? "L" : "M"}${x(m.month).toFixed(2)},${y(m.value).toFixed(2)}`).join(" ");
  const last = points.at(-1);

  return (
    <div className="mt-6" aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-[14svh] w-full overflow-visible">
        <path d={`${path} L${x(last.month).toFixed(2)},40 L${x(points[0].month).toFixed(2)},40 Z`} fill="rgba(59,130,246,0.12)" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-caption text-text-muted">
        <span>{monthName(points[0].month)}</span>
        <span>{monthName(last.month)}</span>
      </div>
    </div>
  );
}

export default function Money({ data, meta, state }) {
  const money = data.private.money;
  const monthly = money.monthly ?? [];
  const spendLine = insight(data, "spend-vs-plan");
  const underPlan = insight(data, "months-under-plan");
  const topCategory = insight(data, "top-category");
  const overPlan = insight(data, "over-plan-categories");
  const savings = insight(data, "savings-rate");
  const netWorth = insight(data, "net-worth");
  const rate = money.totals?.savings_rate_pct;
  const nw = money.net_worth ?? {};

  return (
    <Chapter {...meta}>
      <Frame>
        <Beats>
          <Reveal on="enter" at={0.5} out={0.34}>
            <Eyebrow number={meta.number} className="mb-8 sm:mb-10" tag={<PrivateTag />}>
              {meta.label}
            </Eyebrow>
            <p className="max-w-4xl text-headline text-text-primary">
              {formatMoney(money.totals.spend)} <span className="text-secondary">spent.</span>
            </p>
            {spendLine && <p className="mt-5 max-w-2xl text-lede text-secondary">{spendLine}</p>}
            <SpendColumns monthly={monthly} lastMonth={state.lastMonth} />
            {underPlan && <p className="mt-5 max-w-2xl text-caption text-secondary">{underPlan}</p>}
            <p className="sr-only">
              Spend and plan by month:{" "}
              {monthly
                .map((m) => `${monthName(m.month)} ${formatMoney(m.spend)} spent of ${formatMoney(m.planned)} planned`)
                .join(", ")}
              .
            </p>
          </Reveal>

          <Reveal at={0.34} out={0.68}>
            <p className="text-eyebrow uppercase text-text-muted">Where it went</p>
            {topCategory && <p className="mt-5 max-w-4xl text-title text-text-primary">{topCategory}</p>}
            <CategoryRows categories={money.top_categories ?? []} />
            {overPlan && <p className="mt-6 max-w-2xl text-lede text-secondary">{overPlan}</p>}
          </Reveal>

          <Reveal at={0.68}>
            <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <div>
                <p className="text-eyebrow uppercase text-text-muted">Saved</p>
                {isNum(rate) && (
                  <p className="mt-5 text-[clamp(3.5rem,14vw,8rem)] font-extrabold leading-[0.9] tracking-[-0.05em] text-text-primary">
                    {formatPercent(rate, 1)}
                  </p>
                )}
                {savings && <p className="mt-5 max-w-md text-lede text-secondary">{savings}</p>}
              </div>
              {isNum(nw.latest) && (
                <div>
                  <p className="text-eyebrow uppercase text-text-muted">Net worth</p>
                  <p className="mt-5 text-title tabular-nums text-text-primary">
                    {formatMoney(nw.latest)}
                    {isNum(nw.change) && (
                      <span className={`ml-3 text-lede ${nw.change >= 0 ? "text-accent" : "text-secondary"}`}>
                        {nw.change >= 0 ? "+" : ""}
                        {formatMoney(nw.change)}
                      </span>
                    )}
                  </p>
                  <NetWorthLine monthly={nw.monthly ?? []} />
                  {netWorth && <p className="mt-4 max-w-md text-caption text-secondary">{netWorth}</p>}
                </div>
              )}
            </div>
          </Reveal>
        </Beats>
      </Frame>
    </Chapter>
  );
}
