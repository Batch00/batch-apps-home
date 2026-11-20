import { useEffect, useState } from "react";
import { Clapperboard, Database, Dumbbell, Globe, Plane, Timer } from "lucide-react";
import { useFadeIn } from "../hooks/useFadeIn";
import { currentYear, formatAsOf, isUsable, loadYtd } from "../lib/ytd";

const FETCH_TIMEOUT_MS = 8000;

const TILES = [
  { key: "workouts", label: "Workouts", icon: Dumbbell },
  { key: "active_hours", label: "Active hours", icon: Timer, decimals: 1 },
  { key: "titles", label: "Titles watched", icon: Clapperboard },
  { key: "countries", label: "Countries", icon: Globe },
  { key: "days_traveled", label: "Days traveled", icon: Plane },
  { key: "data_points", label: "Data points", icon: Database },
];

function formatValue(value, decimals = 0) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function Tile({ label, icon: Icon, value, decimals, isPartial }) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="rounded-xl bg-[#111111] border border-[#1f1f1f] p-4 sm:p-5">
      <div className="flex items-center gap-1.5 sm:gap-2 text-[#888888] mb-3">
        <Icon size={16} className="text-[#3b82f6] flex-shrink-0" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide sm:tracking-wider leading-tight">
          {label}
        </span>
      </div>
      {hasValue ? (
        <p className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] tabular-nums leading-none">
          {formatValue(value, decimals)}
        </p>
      ) : (
        <p className="text-sm text-[#888888] leading-9">{isPartial ? "None yet" : "None"}</p>
      )}
    </div>
  );
}

function YtdTiles({ data }) {
  const ref = useFadeIn();
  const asOf = formatAsOf(data.as_of);

  return (
    <section id="ytd" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="fade-in-section">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
            {data.is_partial ? `${data.year} so far` : `${data.year} in review`}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] mb-2">
            The year in numbers
          </h2>
          <p className="text-[#888888] mb-12 max-w-lg">
            Pulled from the Batch Apps through BatchBrain. Real data, counts only.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {TILES.map((tile) => (
              <Tile
                key={tile.key}
                label={tile.label}
                icon={tile.icon}
                decimals={tile.decimals}
                value={data.totals[tile.key]}
                isPartial={data.is_partial}
              />
            ))}
          </div>

          <p className="text-xs text-[#888888] mt-5">
            {asOf ? `Updated ${asOf}. ` : ""}Trips appear two weeks after they end.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function YtdSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    loadYtd(currentYear(), controller.signal)
      .then((json) => {
        if (isUsable(json)) setData(json);
      })
      .catch(() => {
        // Hidden on any error: the section simply does not render.
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  if (!data) return null;
  return <YtdTiles data={data} />;
}
