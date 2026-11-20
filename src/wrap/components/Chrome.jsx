import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { registerProgress } from "../engine/scrollEngine";

// The chapter whose section crosses the middle of the viewport.
function useActiveChapter(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(",");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const id of key.split(",")) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}

// Thin page progress line, home link, year state and the current chapter (phones).
export function TopBar({ label, chapters }) {
  const barRef = useRef(null);
  const active = useActiveChapter(chapters.map((c) => c.id));
  const current = chapters.find((c) => c.id === active);
  const pastOpening = Boolean(current && current.id !== chapters[0].id);

  useEffect(
    () =>
      registerProgress(document.documentElement, (p) => {
        barRef.current?.style.setProperty("--page", p.toFixed(4));
      }),
    [],
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-background via-background/70 to-transparent">
      <div data-motion-only className="absolute inset-x-0 top-0 h-px bg-faint">
        <div ref={barRef} className="wrap-progress h-full w-full bg-accent" />
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
        <a
          href="/"
          className="flex items-center gap-2 rounded text-caption font-medium text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Batch Apps
        </a>
        {/* Phones swap the year label for the current chapter once past the opening. */}
        <p className="text-eyebrow uppercase">
          <span className={`text-text-primary ${pastOpening ? "hidden md:inline" : ""}`}>{label}</span>
          {pastOpening && (
            <span className="text-text-muted md:hidden" aria-hidden="true">
              {current.label}
            </span>
          )}
        </p>
      </div>
    </header>
  );
}

// Chapter dots down the right edge on wider screens. The active chapter stretches into a bar.
export function ChapterRail({ chapters }) {
  const active = useActiveChapter(chapters.map((c) => c.id));

  return (
    <nav aria-label="Chapters" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 md:block lg:right-8">
      <ol className="flex flex-col items-end gap-3">
        {chapters.map((chapter) => {
          const isActive = chapter.id === active;
          return (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                aria-current={isActive ? "step" : undefined}
                className="group flex items-center gap-3 rounded py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span
                  className={`text-eyebrow uppercase transition-opacity duration-300 ${
                    isActive ? "text-text-primary opacity-100" : "text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  }`}
                >
                  {chapter.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full transition-all duration-500 ${
                    isActive ? "w-6 bg-accent" : "w-1.5 bg-dim group-hover:bg-text-muted"
                  }`}
                />
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
