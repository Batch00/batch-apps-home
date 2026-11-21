import { pad2 } from "../format";

// Chapter label and the chapter's heading. The number is visual only, so screen readers hear
// just the label ("Travel").
export function Eyebrow({ number, children, className = "" }) {
  return (
    <h2 className={`flex items-center gap-3 text-eyebrow uppercase text-text-muted ${className}`}>
      {number != null && (
        <span aria-hidden="true" className="tabular-nums text-accent">
          {pad2(number)}
        </span>
      )}
      {number != null && <span aria-hidden="true" className="h-px w-8 bg-border" />}
      <span>{children}</span>
    </h2>
  );
}

// A headline number with its unit set beside it (stacked on phones).
export function Figure({ number, unit, className = "" }) {
  return (
    <p className={`flex flex-col gap-y-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6 ${className}`}>
      <span className="text-display text-text-primary">{number}</span>
      <span className="text-headline text-text-primary">{unit}</span>
    </p>
  );
}
