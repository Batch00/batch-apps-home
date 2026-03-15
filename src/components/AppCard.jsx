import { ExternalLink } from "lucide-react";

const statusConfig = {
  Live: {
    dot: "bg-green-400",
    text: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    label: "Live",
  },
  Beta: {
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    label: "Beta",
  },
  "Coming Soon": {
    dot: "bg-[#888888]",
    text: "text-[#888888]",
    bg: "bg-[#888888]/10",
    border: "border-[#888888]/20",
    label: "Coming Soon",
  },
};

export default function AppCard({ app }) {
  const status = statusConfig[app.status] ?? statusConfig["Coming Soon"];

  return (
    <div className="card-hover flex flex-col p-6 rounded-xl bg-[#111111] border border-[#222222] h-full">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{app.icon}</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Name & description */}
      <h3 className="text-base font-bold text-[#f5f5f5] mb-1">{app.name}</h3>
      <p className="text-sm text-[#888888] leading-relaxed flex-1 mb-4">
        {app.description}
      </p>

      {/* Tags */}
      {app.tags && app.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {app.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs text-[#888888] bg-[#1a1a1a] border border-[#222222]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-[#3b82f6] hover:text-[#60a5fa] transition-colors group"
      >
        Open App
        <ExternalLink
          size={14}
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </a>
    </div>
  );
}
