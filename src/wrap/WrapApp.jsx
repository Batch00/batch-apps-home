import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCw } from "lucide-react";
import "./wrap.css";
import { isUsable, loadYtd } from "../lib/ytd";
import { setReducedMotion } from "./engine/scrollEngine";
import { useReducedMotion } from "./engine/useReducedMotion";
import { useBeatNavigation } from "./engine/useBeatNavigation";
import { CHAPTERS, chaptersFor } from "./chapters";
import { ChapterRail, TopBar } from "./components/Chrome";
import { restoreScrollAnchor } from "./engine/scrollAnchor";
import { yearState } from "./format";
import { OwnerProvider } from "./owner/OwnerProvider";
import { SignInDialog } from "./owner/SignInDialog";
import { useOwner } from "./owner/ownerContext";

const STORY_ORDER = CHAPTERS.map((chapter) => chapter.id);

const FETCH_TIMEOUT_MS = 10000;

// Development only: ?state=final previews the frozen-year copy on the open year's data.
function withPreviewState(data) {
  if (!import.meta.env.DEV) return data;
  const forced = new URLSearchParams(window.location.search).get("state");
  return forced === "final" ? { ...data, is_partial: false } : data;
}

// The public payload alone, or, in the owner's private view, with the private block added.
// The public chapters read the same public payload either way.
function Story({ data: publicData, reduced }) {
  const owner = useOwner();
  const data = useMemo(
    () => (owner.showPrivate ? { ...publicData, private: owner.block } : publicData),
    [publicData, owner.showPrivate, owner.block],
  );
  const state = useMemo(() => yearState(data), [data]);
  const chapters = useMemo(() => chaptersFor(data), [data]);
  const chapterKey = chapters.map((c) => c.id).join(",");
  useBeatNavigation({ chapters, data, reduced });

  // Chapters came or went (the private view turned on or off): put the reader back where they were.
  useLayoutEffect(() => {
    restoreScrollAnchor(STORY_ORDER);
  }, [chapterKey]);

  return (
    <>
      <TopBar label={state.label} chapters={chapters} />
      <ChapterRail chapters={chapters} />
      <main>
        {chapters.map(({ Component, id, label, length, number }) => (
          <Component key={id} data={data} state={state} meta={{ id, label, length, number }} />
        ))}
      </main>
    </>
  );
}

function Unavailable({ year, onRetry }) {
  return (
    <main className="flex min-h-stage flex-col justify-center px-6 sm:px-10 lg:px-16">
      <p className="mb-6 text-eyebrow uppercase text-accent">{year}</p>
      <h1 className="max-w-3xl text-headline text-text-primary">This year in review is not available right now.</h1>
      <p className="mt-6 max-w-xl text-lede text-secondary">The numbers could not be loaded. Try again in a moment.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-caption font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <RotateCw size={16} aria-hidden="true" />
          Try again
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-caption font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Batch Apps
        </a>
      </div>
    </main>
  );
}

function Loading({ year }) {
  return (
    <main className="flex min-h-stage items-center px-6 sm:px-10 lg:px-16" aria-busy="true">
      <p className="text-mega text-faint motion-safe:animate-pulse" aria-hidden="true">
        {year}
      </p>
      <p className="sr-only" role="status">
        Loading {year} in review
      </p>
    </main>
  );
}

// Waits for a stored owner session to be checked before the story first shows, so the owner's
// private view does not rebuild itself under them. Visitors without a session never wait.
function Content({ year, result, reduced, onRetry }) {
  const owner = useOwner();
  if (result.status === "error") return <Unavailable year={year} onRetry={onRetry} />;
  if (result.status === "loading" || !owner.settled) return <Loading year={year} />;
  return <Story data={result.data} reduced={reduced} />;
}

export default function WrapApp({ year }) {
  const [result, setResult] = useState({ status: "loading", data: null });
  const [attempt, setAttempt] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    setReducedMotion(reduced);
  }, [reduced]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let cancelled = false;

    loadYtd(year, controller.signal)
      .then((json) => {
        if (cancelled) return;
        if (isUsable(json) && json.year === year) setResult({ status: "ready", data: withPreviewState(json) });
        else setResult({ status: "error", data: null });
      })
      .catch(() => {
        if (!cancelled) setResult({ status: "error", data: null });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [year, attempt]);

  const retry = () => {
    setResult({ status: "loading", data: null });
    setAttempt((n) => n + 1);
  };

  const label = result.data ? yearState(result.data).label : String(year);
  useEffect(() => {
    document.title = `${label} · Batch Apps`;
  }, [label]);

  return (
    <div className="wrap-root min-h-stage bg-background font-sans text-text-primary" data-motion={reduced ? "reduce" : "full"}>
      <OwnerProvider year={year}>
        <Content year={year} result={result} reduced={reduced} onRetry={retry} />
        <SignInDialog />
      </OwnerProvider>
    </div>
  );
}
