import { createContext, useContext, useEffect, useRef } from "react";

// Shared timings for triggered motion. wrap.css uses the same numbers (keep them in step).
//   EXIT_MS   how long a beat takes to leave
//   GAP_MS    how long an entering beat waits, so the leaving beat is gone before it shows
//   PLAY_MS   how long a count-up or bar grow runs once triggered
export const EXIT_MS = 280;
export const GAP_MS = 320;
export const PLAY_MS = 900;

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

// Scroll triggers, time animates. Sets data-state on ref's element:
//   "before"  progress has not reached `at` yet
//   "in"      at or past `at` (and before `out`, when given)
//   "after"   pinned progress reached `out`
// wrap.css turns each state into a timed transition, so a paused page never shows a half state.
export function useTrigger(ref, { at = 0, out, on }) {
  useChapterProgress((p, e) => {
    const el = ref.current;
    if (!el) return;
    const src = on === "enter" ? e : p;
    const state = src < at ? "before" : out != null && p >= out ? "after" : "in";
    if (el.dataset.state !== state) el.dataset.state = state;
  });
}

export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}
