import { ArrowRight } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { Reveal } from "../components/motion";
import { PrivateTag } from "../components/PrivateTag";
import { Eyebrow } from "../components/type";
import { formatDayRange, formatMoney, formatNumber, plural } from "../format";
import { capitalize, count, insight } from "../insights";

// Private chapter: every trip that started this year, completed or ongoing, with no 14-day lag.
// Trip spend sits beside budget spend only as a share (trip_spend_share), never added to it.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function TripRow({ trip, index, compact }) {
  const stops = (trip.stops ?? []).map((s) => s.city);
  return (
    <Reveal
      as="li"
      on="enter"
      at={0.5}
      delay={250 + index * 120}
      y={18}
      className={`grid gap-x-6 gap-y-3 border-t border-border sm:grid-cols-[minmax(0,1fr)_auto] ${compact ? "py-3" : "py-5"}`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`${compact ? "text-lede font-semibold" : "text-title"} text-text-primary`}>{trip.name ?? "Untitled trip"}</span>
          {trip.status === "ongoing" && (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-caption font-semibold text-accent">Ongoing</span>
          )}
        </p>
        <p className="mt-1 text-caption text-secondary">
          {formatDayRange(trip.start_date, trip.end_date)}
          {isNum(trip.days) && ` · ${formatNumber(trip.days)} ${plural(trip.days, "day")}`}
        </p>
        {!compact && stops.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
            {stops.map((city, i) => (
              <span key={`${city}-${i}`} className="inline-flex items-center gap-2">
                {i > 0 && <ArrowRight size={12} aria-hidden="true" />}
                {city}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex gap-6 sm:block sm:text-right">
        {isNum(trip.trip_spend) && (
          <p className="text-lede font-semibold tabular-nums text-text-primary">{formatMoney(trip.trip_spend)}</p>
        )}
        {isNum(trip.spend_per_day) && (
          <p className="text-caption tabular-nums text-secondary sm:mt-1">{formatMoney(trip.spend_per_day)} a day</p>
        )}
      </div>
    </Reveal>
  );
}

export default function Trips({ data, meta }) {
  const travel = data.private.travel_private;
  const trips = travel.trips ?? [];
  const days = trips.reduce((total, t) => total + (isNum(t.days) ? t.days : 0), 0);
  const share = travel.trip_spend_share;
  const shareLine = insight(data, "trip-share");
  const perDay = insight(data, "trip-per-day");
  const compact = trips.length > 4;

  return (
    <Chapter {...meta}>
      <Frame>
        <Beats>
          <Reveal on="enter" at={0.5} out={0.42}>
            <Eyebrow number={meta.number} className="mb-8 sm:mb-10" tag={<PrivateTag />}>
              {meta.label}
            </Eyebrow>
            <p className="max-w-4xl text-headline text-text-primary">
              {capitalize(count(trips.length))} {plural(trips.length, "trip")},{" "}
              <span className="text-secondary">
                {formatNumber(days)} {plural(days, "day")}.
              </span>
            </p>
            <ol className="mt-8 max-w-4xl border-b border-border">
              {trips.map((trip, i) => (
                <TripRow key={`${trip.start_date}-${i}`} trip={trip} index={i} compact={compact} />
              ))}
            </ol>
          </Reveal>

          <Reveal at={0.46}>
            <p className="text-eyebrow uppercase text-text-muted">Trips beside the budget</p>
            {isNum(share) && share > 0 ? (
              <>
                {/* A ratio of two views of the same purchases: shown side by side, never summed. */}
                <p className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <span className="text-display text-text-primary">{formatNumber(share * 100, share < 0.1 ? 1 : 0)}%</span>
                  <span className="text-title text-secondary">of budget spend</span>
                </p>
                <div className="mt-8 h-2.5 max-w-2xl overflow-hidden rounded-full bg-faint" aria-hidden="true">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(1, share * 100))}%` }} />
                </div>
                {shareLine && <p className="mt-6 max-w-2xl text-lede text-secondary">{shareLine}</p>}
              </>
            ) : (
              <p className="mt-6 max-w-2xl text-lede text-secondary">No trip spending to compare with the budget yet.</p>
            )}
            {perDay && <p className="mt-4 max-w-2xl text-lede text-text-primary">{perDay}</p>}
          </Reveal>
        </Beats>
      </Frame>
    </Chapter>
  );
}
