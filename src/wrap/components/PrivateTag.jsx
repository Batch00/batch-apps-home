import { Lock } from "lucide-react";

// Marks a private chapter, so a shared screen always shows which parts are owner only.
export function PrivateTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.18em] text-accent">
      <Lock size={11} aria-hidden="true" />
      Private
    </span>
  );
}
