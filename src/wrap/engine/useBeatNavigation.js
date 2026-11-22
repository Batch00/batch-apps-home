import { useEffect, useRef } from "react";

// Tap or click the right half of the screen for the next beat and the left half for the previous
// one; on a keyboard, Right arrow and Space go forward, Left arrow and Shift+Space go back. Each
// move is a smooth scroll to the beat's position, so the scroll engine plays it exactly as if the
// reader had scrolled there, and ordinary scrolling keeps working. Up and Down arrows, Page Up and
// Page Down keep their native scrolling. Under reduced motion the page jumps instead.
//
// Only real interactive elements keep a tap for themselves: links, buttons, form fields, and
// anything with a button role or a tabindex. Images, posters, cards and text all navigate, so no
// part of a beat (a poster wall filling a phone screen, say) can trap the reader. Selecting text
// is left alone too.

const IGNORE_CLICKS = "a, button, input, select, textarea, [role='button'], [tabindex]";
const IGNORE_KEYS = "a, button, input, select, textarea, [contenteditable]";
// Space under the fixed top bar when jumping to a beat on the flattened (reduced motion) page.
const TOP_BAR = 72;
// A second tap while a smooth scroll is still running continues from where that scroll is going.
const IN_FLIGHT_MS = 900;
// A stop this close to where the reader already is counts as "here", not as the next beat.
const SAME_PLACE_PX = 40;

export const MOVE_EVENT = "wrap:move";

// Scroll positions of every beat, in page order.
export function beatStops(chapters, data, reduced) {
  const viewport = window.innerHeight;
  const positions = [];
  for (const chapter of chapters) {
    const section = document.getElementById(chapter.id);
    if (!section) continue;
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (reduced) {
      // Flattened page: each beat sits in the normal flow, so go to its top.
      const beats = [...section.querySelectorAll(".wrap-beats > *")];
      if (!beats.length) positions.push(top);
      for (const beat of beats) positions.push(beat.getBoundingClientRect().top + window.scrollY - TOP_BAR);
    } else {
      const travel = Math.max(0, section.offsetHeight - viewport);
      for (const p of chapter.stops?.(data) ?? [0]) positions.push(top + p * travel);
    }
  }
  const end = document.documentElement.scrollHeight - viewport;
  return [...new Set(positions.map((p) => Math.round(Math.min(end, Math.max(0, p)))))].sort((a, b) => a - b);
}

export function useBeatNavigation({ chapters, data, reduced }) {
  const latest = useRef({ chapters, data, reduced });
  const flight = useRef({ target: null, at: 0 });

  useEffect(() => {
    latest.current = { chapters, data, reduced };
  });

  useEffect(() => {
    const go = (direction) => {
      const { chapters: list, data: payload, reduced: still } = latest.current;
      const stops = beatStops(list, payload, still);
      const now = performance.now();
      const from = flight.current.target !== null && now - flight.current.at < IN_FLIGHT_MS ? flight.current.target : window.scrollY;
      const target =
        direction > 0 ? stops.find((s) => s > from + SAME_PLACE_PX) : [...stops].reverse().find((s) => s < from - SAME_PLACE_PX);
      if (target === undefined) return false;
      flight.current = { target, at: now };
      window.scrollTo({ top: target, behavior: still ? "instant" : "smooth" });
      window.dispatchEvent(new Event(MOVE_EVENT));
      return true;
    };

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element) || event.target.closest(IGNORE_CLICKS)) return;
      if (window.getSelection()?.toString()) return;
      go(event.clientX >= window.innerWidth / 2 ? 1 : -1);
    };

    const onKey = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest(IGNORE_KEYS)) return;
      let direction = 0;
      if (event.key === "ArrowRight") direction = 1;
      else if (event.key === "ArrowLeft") direction = -1;
      else if (event.key === " ") direction = event.shiftKey ? -1 : 1;
      if (direction && go(direction)) event.preventDefault();
    };

    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
}
