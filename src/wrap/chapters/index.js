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
//   A chapter whose data is too thin to show (CHAPTER_GATES in insights.js) is left out and the
//   rest are renumbered.
export const CHAPTERS = [
  { id: "opening", label: "Opening", length: 2.6, Component: Opening },
  { id: "travel", label: "Travel", length: 3.6, Component: Travel },
  { id: "fitness", label: "Fitness", length: 3.4, Component: Fitness },
  { id: "film-tv", label: "Film and TV", length: 3.6, Component: FilmTv },
  { id: "patterns", label: "Patterns", length: 2.2, Component: Patterns },
  { id: "closing", label: "Closing", length: 1.2, Component: Closing },
];

export function chaptersFor(data) {
  return CHAPTERS.filter((chapter) => isChapterEligible(chapter.id, data)).map((chapter, i) => ({ ...chapter, number: i + 1 }));
}
