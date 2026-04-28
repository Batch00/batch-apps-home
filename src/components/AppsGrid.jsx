import { apps } from "../data/apps";
import AppCard from "./AppCard";
import { useFadeIn } from "../hooks/useFadeIn";

export default function AppsGrid() {
  const ref = useFadeIn();

  return (
    <section id="apps" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="fade-in-section">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
            Apps
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] mb-2">
            What I&apos;ve built
          </h2>
          <p className="text-[#888888] mb-12 max-w-lg">
            Built for real use. Shipped one batch at a time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {apps.map((app) => (
              <AppCard key={app.name} app={app} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
