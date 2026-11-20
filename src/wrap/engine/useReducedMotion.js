import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// ?motion=reduce forces the reduced-motion layout, for checking it without changing OS settings.
function forcedByUrl() {
  try {
    return new URLSearchParams(window.location.search).get("motion") === "reduce";
  } catch {
    return false;
  }
}

function subscribe(onChange) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return forcedByUrl() || window.matchMedia(QUERY).matches;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
