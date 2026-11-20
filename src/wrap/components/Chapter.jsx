import { useEffect, useRef, useState } from "react";
import { registerProgress } from "../engine/scrollEngine";
import { ChapterProgressContext, createProgressStore } from "../engine/progress";

// A full-screen chapter. The section is `length` screens tall and its stage stays pinned while
// the reader scrolls through it, so `length` sets how long the chapter lasts (more = slower).
// The scroll engine writes --p and --e on the section; primitives inside read them.
export function Chapter({ id, label, length = 3, className = "", children }) {
  const ref = useRef(null);
  const [store] = useState(createProgressStore);

  useEffect(() => {
    const el = ref.current;
    return registerProgress(el, (p, e) => {
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--e", e.toFixed(4));
      store.set(p, e);
    });
  }, [store]);

  return (
    <ChapterProgressContext.Provider value={store}>
      <section
        id={id}
        ref={ref}
        aria-label={label}
        data-chapter={id}
        className="wrap-chapter"
        style={{ "--len": length }}
      >
        <div className={`wrap-stage ${className}`}>{children}</div>
      </section>
    </ChapterProgressContext.Provider>
  );
}

// The content column inside a stage: centered vertically, with the wrap's side gutters.
export function Frame({ className = "", children }) {
  return (
    <div
      className={`relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-16 pt-24 sm:px-10 lg:px-16 ${className}`}
    >
      {children}
    </div>
  );
}

// Beats share the stage: each child occupies the same space and takes over in turn as its
// Reveal window comes up. Under reduced motion they stack in reading order instead.
export function Beats({ className = "", children }) {
  return <div className={`wrap-beats ${className}`}>{children}</div>;
}
