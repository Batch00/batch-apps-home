import Opening from "./Opening";
import Travel from "./Travel";
import Fitness from "./Fitness";
import FilmTv from "./FilmTv";
import Patterns from "./Patterns";
import Closing from "./Closing";

// The story, in order. Each chapter gets { data, meta, state } where meta is
// { id, label, length, number } (spread it onto <Chapter>) and state comes from yearState().
//   length      how many screens the chapter stays pinned for; more screens = slower motion
//   isEligible  false hides the chapter and renumbers the rest. Session 5 replaces these
//               placeholder checks with the real "too thin to show" rules.
export const CHAPTERS = [
  { id: "opening", label: "Opening", length: 2.6, Component: Opening, isEligible: () => true },
  { id: "travel", label: "Travel", length: 3, Component: Travel, isEligible: (d) => (d.totals.trips ?? 0) > 0 },
  { id: "fitness", label: "Fitness", length: 3.4, Component: Fitness, isEligible: (d) => (d.totals.workouts ?? 0) > 0 },
  { id: "film-tv", label: "Film and TV", length: 3.4, Component: FilmTv, isEligible: (d) => (d.totals.titles ?? 0) > 0 },
  { id: "patterns", label: "Patterns", length: 2, Component: Patterns, isEligible: (d) => (d.monthly ?? []).length >= 3 },
  { id: "closing", label: "Closing", length: 1.2, Component: Closing, isEligible: () => true },
];

export function chaptersFor(data) {
  return CHAPTERS.filter((chapter) => chapter.isEligible(data)).map((chapter, i) => ({ ...chapter, number: i + 1 }));
}
