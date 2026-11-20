import { createContext, useContext, useEffect, useRef } from "react";

// A chapter's progress store. Chapter.jsx creates one and feeds it from the scroll engine;
// anything inside the chapter can subscribe without re-rendering React on every frame.
export function createProgressStore() {
  const listeners = new Set();
  const store = {
    // null until the engine's first measurement, so subscribers keep their rendered
    // (final) state instead of flashing a zero state before the first frame.
    p: null,
    e: null,
    set(p, e) {
      store.p = p;
      store.e = e;
      for (const fn of listeners) fn(p, e);
    },
    subscribe(fn) {
      listeners.add(fn);
      if (store.p !== null) fn(store.p, store.e);
      return () => listeners.delete(fn);
    },
  };
  return store;
}

export const ChapterProgressContext = createContext(null);

// The one progress hook. Calls onProgress(p, e) whenever the enclosing chapter's progress changes.
//   p  0 to 1 while the chapter's stage is pinned
//   e  0 to 1 while the chapter scrolls into view
// Use it for anything CSS variables cannot do: count-ups, canvas drawing (the globe), text swaps.
// Under reduced motion it reports p = 1 and e = 1 once, so draw a complete static frame for that.
export function useChapterProgress(onProgress) {
  const store = useContext(ChapterProgressContext);
  const callback = useRef(onProgress);

  useEffect(() => {
    callback.current = onProgress;
  });

  useEffect(() => {
    if (!store) return undefined;
    return store.subscribe((p, e) => callback.current(p, e));
  }, [store]);
}

export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// Local 0 to 1 progress for a window [at, at + span] of the chapter's progress.
export function windowed(p, at, span) {
  return clamp01((p - at) / span);
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}
