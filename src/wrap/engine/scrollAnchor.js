import { refreshProgress } from "./scrollEngine";

// Keeps the reader in place when chapters are added or removed under them (the private view
// turning on or off). Capture right before the change, restore once the new chapters are laid out.

let pending = null;

export function captureScrollAnchor() {
  pending = null;
  const y = window.scrollY;
  for (const section of document.querySelectorAll("[data-chapter]")) {
    const top = section.getBoundingClientRect().top + y;
    const height = section.offsetHeight;
    if (y >= top - 1 && y < top + height) {
      pending = { id: section.id, fraction: height ? (y - top) / height : 0 };
      return;
    }
  }
}

// order: every chapter id in story order, so a removed chapter hands over to the next one.
export function restoreScrollAnchor(order) {
  if (!pending) return;
  const { id, fraction } = pending;
  pending = null;
  let el = document.getElementById(id);
  let offset = fraction;
  if (!el) {
    offset = 0;
    for (const next of order.slice(order.indexOf(id) + 1)) {
      el = document.getElementById(next);
      if (el) break;
    }
  }
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.round(top + offset * el.offsetHeight), behavior: "instant" });
  refreshProgress();
}
