import { ArrowDown } from "lucide-react";
import { useFadeIn } from "../hooks/useFadeIn";

export default function Hero() {
  const ref = useFadeIn();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden dot-grid">
      {/* Radial gradient overlay to fade out the dot grid toward center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,_#0a0a0a_60%,_transparent_100%)]" />

      {/* Blue glow top-center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#3b82f6]/5 blur-3xl rounded-full pointer-events-none" />

      <div ref={ref} className="fade-in-section relative z-10 text-center px-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#222222] bg-[#111111] text-xs text-[#888888] mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
          Building in public
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-[#f5f5f5] leading-[1.1] tracking-tight mb-6">
          Building tools that{" "}
          <span className="text-[#3b82f6]">make life simpler.</span>
        </h1>

        <p className="text-lg text-[#888888] leading-relaxed max-w-xl mx-auto mb-10">
          Batch Apps is a personal collection of web tools built to solve everyday problems.
        </p>

        <a
          href="#apps"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#3b82f6] hover:bg-[#60a5fa] text-white font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.45)]"
        >
          Explore Apps
          <ArrowDown size={16} />
        </a>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40">
        <div className="w-px h-8 bg-[#444444]" />
      </div>
    </section>
  );
}
