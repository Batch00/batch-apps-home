import { useFadeIn } from "../hooks/useFadeIn";

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

          {/* Bento grid */}
          <div
            className="grid grid-cols-3 items-start"
            style={{ gap: "10px", gridAutoRows: "auto" }}
          >
            {/* Row 1, Card 1 — Identity (span 2) */}
            <div
              className="col-span-2 rounded-xl p-6"
              style={{ background: "#0d1b2e", border: "1px solid #162740" }}
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

            {/* Row 1, Card 2 — Apps shipped */}
            <div
              className="rounded-xl p-6 flex flex-col items-center justify-center"
              style={{ background: "#3b82f6", border: "1px solid #3b82f6", minHeight: "140px" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">
                Apps shipped
              </p>
              <span
                className="font-bold text-white leading-none"
                style={{ fontSize: "42px" }}
              >
                4
              </span>
            </div>

            {/* Row 2, Card 3 — Analytics stack */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#111111", border: "1px solid #1f1f1f" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
                Analytics stack
              </p>
              <ul className="text-[#888888] text-[14px]" style={{ lineHeight: 2 }}>
                <li>Power BI</li>
                <li>SQL</li>
                <li>Snowflake</li>
                <li>DAX</li>
              </ul>
            </div>

            {/* Row 2, Card 4 — Builder stack */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#111111", border: "1px solid #1f1f1f" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
                Builder stack
              </p>
              <ul className="text-[#888888] text-[14px]" style={{ lineHeight: 2 }}>
                <li>React</li>
                <li>Next.js</li>
                <li>Supabase</li>
                <li>Tailwind</li>
              </ul>
            </div>

            {/* Row 2, Card 5 — Currently planning */}
            <div
              className="rounded-xl p-4"
              style={{ background: "#111111", border: "1px solid #1f1f1f" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
                Currently planning
              </p>
              <p className="text-[#f5f5f5] font-bold text-[15px] mb-2">TBD</p>
              <p className="text-[#888888] text-[13px] leading-relaxed mb-4">
                Travel tracker with world map and trip history
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[#888888] text-xs">Planning</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
