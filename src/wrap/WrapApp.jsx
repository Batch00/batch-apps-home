import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import "./wrap.css";
import { isUsable, loadYtd } from "../lib/ytd";
import { setReducedMotion } from "./engine/scrollEngine";
import { useReducedMotion } from "./engine/useReducedMotion";
import { chaptersFor } from "./chapters";
import { ChapterRail, TopBar } from "./components/Chrome";
import { yearState } from "./format";

const FETCH_TIMEOUT_MS = 10000;

// Development only: ?state=final previews the frozen-year copy on the open year's data.
function withPreviewState(data) {
  if (!import.meta.env.DEV) return data;
  const forced = new URLSearchParams(window.location.search).get("state");
  return forced === "final" ? { ...data, is_partial: false } : data;
}

function Story({ data }) {
  const state = useMemo(() => yearState(data), [data]);
  const chapters = useMemo(() => chaptersFor(data), [data]);

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

function Unavailable({ year }) {
  return (
    <main className="flex min-h-stage flex-col justify-center px-6 sm:px-10 lg:px-16">
      <p className="mb-6 text-eyebrow uppercase text-accent">{year}</p>
      <h1 className="max-w-3xl text-headline text-text-primary">This year in review is not available right now.</h1>
      <a
        href="/"
        className="mt-10 inline-flex w-fit items-center gap-2 text-caption font-medium text-text-muted transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Batch Apps
      </a>
    </main>
  );
}

function Loading({ year }) {
  return (
    <main className="flex min-h-stage items-center px-6 sm:px-10 lg:px-16" aria-busy="true">
      <p className="text-mega text-faint motion-safe:animate-pulse">{year}</p>
    </main>
  );
}

export default function WrapApp({ year }) {
  const [result, setResult] = useState({ status: "loading", data: null });
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
  }, [year]);

  const label = result.data ? yearState(result.data).label : String(year);
  useEffect(() => {
    document.title = `${label} · Batch Apps`;
  }, [label]);

  return (
    <div className="wrap-root min-h-stage bg-background font-sans text-text-primary" data-motion={reduced ? "reduce" : "full"}>
      {result.status === "ready" && <Story data={result.data} />}
      {result.status === "error" && <Unavailable year={year} />}
      {result.status === "loading" && <Loading year={year} />}
    </div>
  );
}
