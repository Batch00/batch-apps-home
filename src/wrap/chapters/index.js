import Opening from "./Opening";
import Travel from "./Travel";
import Fitness from "./Fitness";
import FilmTv from "./FilmTv";
import Patterns from "./Patterns";
import Closing from "./Closing";
import { isChapterEligible } from "../insights";

// The story, in order. Each chapter gets { data, meta, state } where meta is
// { id, label, length, number } (spread it onto <Chapter>) and state comes from yearState().
//   length      how many screens the chapter stays pinned for; more screens = slower motion
//   stops(data) where each beat is fully on stage, as the chapter's pinned progress (0 to 1).
//               Tap, click and arrow-key navigation (engine/useBeatNavigation.js) moves between
//               these. Keep them in step with the chapter's Reveal at/out values.
//   A chapter whose data is too thin to show (CHAPTER_GATES in insights.js) is left out and the
//   rest are renumbered.
export const CHAPTERS = [
  // Year, then data points (beat B triggers at 0.4).
  { id: "opening", label: "Opening", length: 2.6, Component: Opening, stops: () => [0, 0.55] },
  // Countries, then the route once every arc has been reached (stops trigger up to 0.8) and
  // before the camera eases out at 0.86.
  { id: "travel", label: "Travel", length: 3.6, Component: Travel, stops: () => [0.15, 0.82] },
  // Activity bars, week strip (0.36 to 0.72), then races (from 0.72) when there are any.
  {
    id: "fitness",
    label: "Fitness",
    length: 3.4,
    Component: Fitness,
    stops: (d) => ((d.fitness?.races ?? []).length ? [0.15, 0.52, 0.88] : [0.15, 0.55]),
  },
  // Poster wall, ratings (0.36 to 0.7) when there is an average, spotlight (from 0.7).
  {
    id: "film-tv",
    label: "Film and TV",
    length: 3.6,
    Component: FilmTv,
    stops: (d) => [
      0.15,
      ...(d.totals?.avg_rating != null ? [0.52] : []),
      ...((d.media?.top_titles ?? []).length ? [0.88] : []),
    ],
  },
  { id: "patterns", label: "Patterns", length: 2.2, Component: Patterns, stops: () => [0.5] },
  { id: "closing", label: "Closing", length: 1.2, Component: Closing, stops: () => [1] },
];

export function chaptersFor(data) {
  return CHAPTERS.filter((chapter) => isChapterEligible(chapter.id, data)).map((chapter, i) => ({ ...chapter, number: i + 1 }));
}
