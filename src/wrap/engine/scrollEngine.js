// The wrap's single scroll engine: one passive scroll listener, one resize listener and at
// most one requestAnimationFrame per frame, shared by every registered element.
//
// For each registered element it computes:
//   p  0 to 1 across the element's scroll-through (top at viewport top to bottom at viewport bottom)
//   e  0 to 1 while the element enters (top at viewport bottom to top at viewport top)
// and calls the element's onFrame(p, e) only when either value changed.
// Under reduced motion both values are pinned to 1, so every consumer renders its final state.

const entries = new Set();
let frame = 0;
let reduced = false;
let listening = false;

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function measure() {
  frame = 0;
  const viewport = window.innerHeight || 1;
  for (const entry of entries) {
    let p = 1;
    let e = 1;
    if (!reduced) {
      const rect = entry.el.getBoundingClientRect();
      const travel = rect.height - viewport;
      p = travel > 0 ? clamp01(-rect.top / travel) : rect.top <= 0 ? 1 : 0;
      e = clamp01(1 - rect.top / viewport);
    }
    if (p !== entry.p || e !== entry.e) {
      entry.p = p;
      entry.e = e;
      entry.onFrame(p, e);
    }
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(measure);
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
}

function unlisten() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

export function registerProgress(el, onFrame) {
  const entry = { el, onFrame, p: -1, e: -1 };
  entries.add(entry);
  listen();
  schedule();
  return () => {
    entries.delete(entry);
    if (!entries.size) unlisten();
  };
}

export function setReducedMotion(value) {
  if (reduced === value) return;
  reduced = value;
  for (const entry of entries) {
    entry.p = -1;
    entry.e = -1;
  }
  schedule();
}

export function isReducedMotion() {
  return reduced;
}

// Layout changed without a scroll (fonts loaded, data arrived): measure again.
export function refreshProgress() {
  schedule();
}
