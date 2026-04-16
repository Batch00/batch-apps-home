import { useFadeIn } from "../hooks/useFadeIn";

const stats = [
  { label: "Apps Shipped", value: "2" },
  { label: "Problems Solved", value: "Real ones" },
  { label: "Status", value: "Building" },
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
              <p className="text-[#888888] leading-relaxed text-base">
                Professionally I work in data. Personally I build things. Batch Apps is where
                those two overlap - a growing set of tools I made because I wanted them to exist,
                each one a chance to learn something new and ship something real.
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
