import { useFadeIn } from "../hooks/useFadeIn";

const analyticsStack = [
  "Power BI", "SQL", "Snowflake", "DAX", "Power Query", "Python", "Claude", "AI",
];

const builderStack = [
  "React", "Next.js", "Supabase", "Tailwind", "TypeScript", "REST APIs", "Vercel", "shadcn/ui",
];

function Pills({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#999",
            fontSize: "12px",
            padding: "4px 10px",
            borderRadius: "9999px",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function About() {
  const ref = useFadeIn();

  return (
    <section id="about" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="fade-in-section">
          {/* Section header */}
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
            About
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] mb-8">
            The person behind it
          </h2>

          {/* Bento grid: 3 cols, right col spans 2 rows */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "auto auto",
              gap: "10px",
              alignItems: "stretch",
            }}
          >
            {/* Row 1, Col 1-2 — Identity card */}
            <div
              style={{
                gridColumn: "1 / 3",
                gridRow: "1",
                background: "#0d1b2e",
                border: "1px solid #162740",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <h3 className="text-2xl md:text-3xl font-extrabold text-[#f5f5f5] leading-tight mb-4">
                Turning data into insights.{" "}
                <br className="hidden sm:block" />
                Turning problems into apps.
              </h3>
              <p className="text-[#888888] text-[13px] leading-relaxed">
                Business Intelligence Analyst by trade. Builder by habit. Each Batch App
                started as something I wanted to exist, got built with whatever stack fit
                best, and shipped when it was ready.
              </p>
            </div>

            {/* Col 3, rows 1-2 — Right column (flex stack) */}
            <div
              style={{
                gridColumn: "3",
                gridRow: "1 / 3",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Apps shipped */}
              <div
                style={{
                  flex: 1,
                  background: "#3b82f6",
                  border: "1px solid #3b82f6",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">
                  Apps shipped
                </p>
                <span className="font-bold text-white leading-none" style={{ fontSize: "42px" }}>
                  5
                </span>
              </div>

              {/* Currently planning */}
              <div
                style={{
                  flex: 1,
                  background: "#111111",
                  border: "1px solid #1f1f1f",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
                  Currently planning
                </p>
                <p className="text-[#f5f5f5] font-bold text-[15px] mb-2">BatchOdds</p>
                <p className="text-[#888888] text-[13px] leading-relaxed mb-4">
                  Sports bet tracker and prediction models with performance analytics
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-[#888888] text-xs">Planning</span>
                </div>
              </div>
            </div>

            {/* Row 2, Col 1 — Analytics stack */}
            <div
              style={{
                gridColumn: "1",
                gridRow: "2",
                background: "#111111",
                border: "1px solid #1f1f1f",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
                Analytics stack
              </p>
              <Pills items={analyticsStack} />
            </div>

            {/* Row 2, Col 2 — Builder stack */}
            <div
              style={{
                gridColumn: "2",
                gridRow: "2",
                background: "#111111",
                border: "1px solid #1f1f1f",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
                Builder stack
              </p>
              <Pills items={builderStack} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
