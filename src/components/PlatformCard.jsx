import { Brain, ExternalLink } from "lucide-react";
import { apps, platform } from "../data/apps";
import { statusConfig } from "./AppCard";

export default function PlatformCard() {
  const status = statusConfig[platform.status] ?? statusConfig["Coming Soon"];
  const connected = platform.connects
    .map((name) => apps.find((app) => app.name === name))
    .filter(Boolean);

  return (
    <div className="card-hover relative overflow-hidden rounded-xl bg-[#0d1b2e] border border-[#162740] p-6 md:p-8 mb-5">
      {/* Blue glow top-right */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#3b82f6]/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: identity */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6]">
                <Brain size={22} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
                Platform
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>

          <h3 className="text-2xl font-extrabold text-[#f5f5f5] mb-1">{platform.name}</h3>
          <p className="text-[#f5f5f5]/80 font-medium mb-3">{platform.tagline}</p>
          <p className="text-sm text-[#888888] leading-relaxed mb-5">{platform.description}</p>

          <div className="flex flex-wrap gap-1.5 mb-6">
            {platform.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs text-[#888888] bg-[#1a1a1a] border border-[#222222]"
              >
                {tag}
              </span>
            ))}
          </div>

          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#3b82f6] hover:text-[#60a5fa] transition-colors group"
          >
            Open BatchBrain
            <ExternalLink
              size={14}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </div>

        {/* Right: connected apps */}
        <div className="lg:col-span-2 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888] mb-3">
            Connected apps
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
            {connected.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0a0a]/60 border border-[#162740] hover:border-[#3b82f6]/40 transition-colors"
              >
                <span className="text-lg">{app.icon}</span>
                <span className="text-sm font-medium text-[#f5f5f5]">{app.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
