import { useFadeIn } from "../hooks/useFadeIn";

const stats = [
  { label: "apps shipped", value: "3" },
  { label: "stacks learned", value: "3" },
];

export default function About() {
  const ref = useFadeIn();

  return (
    <section id="about" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="fade-in-section">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
            About
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] mb-12">
            The person behind it
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Bio */}
            <div>
              <p className="text-[#888888] leading-relaxed text-base mb-4">
                By trade, I am a Business Intelligence Analyst with a focus on enterprise
                reporting, data modeling, and BI development. Day to day that means Power BI,
                SQL, and Snowflake, translating complex data into dashboards and insights that
                actually get used.
              </p>
              <p className="text-[#888888] leading-relaxed text-base">
                Outside of work, I build. Batch Apps is where that analytical mindset meets a
                personal drive to create things from scratch. Each app starts as a real problem
                I wanted solved, gets built with whatever stack fits best, and ships when it is
                ready. The goal is not perfection on day one. It is learning something new with
                every project and putting useful tools into the world.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 rounded-xl bg-[#111111] border border-[#222222]"
                >
                  <div className="text-2xl font-bold text-[#f5f5f5] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#888888] uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
