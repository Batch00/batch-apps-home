import { ArrowLeft } from "lucide-react";
import { Chapter, Frame } from "../components/Chapter";
import { Reveal } from "../components/motion";
import { formatAsOf } from "../../lib/ytd";

export default function Closing({ data, meta, state }) {
  const asOf = formatAsOf(data.as_of);
  const usesTmdb = (data.media?.top_titles ?? []).length > 0;

  return (
    <Chapter {...meta}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-3/4 bg-[radial-gradient(ellipse_60%_55%_at_70%_0%,rgba(59,130,246,0.12),transparent_70%)]"
      />
      <Frame>
        <Reveal on="enter" at={0.5}>
          <p className="mb-8 text-eyebrow uppercase text-accent">{state.label}</p>
          <h2 className="max-w-5xl text-headline text-text-primary sm:text-[clamp(3rem,8vw,7rem)]">
            {state.isFinal ? `That was ${data.year}.` : `That's ${data.year} so far.`}
          </h2>
        </Reveal>
        <Reveal on="enter" at={0.5} delay={250}>
          <p className="mt-8 max-w-xl text-lede text-secondary">
            {state.isFinal
              ? `Every number here is final. See you in ${data.year + 1}.`
              : "The story keeps writing itself until the year is out. The final cut lands in January."}
          </p>
          <p className="mt-10 text-caption text-secondary">
            {asOf ? `Updated ${asOf}. ` : ""}Trips appear two weeks after they end. Counts only, no amounts.
          </p>
          {usesTmdb && (
            <p className="mt-3 max-w-xl text-caption text-text-muted">
              Film and TV posters and data from{" "}
              <a
                href="https://www.themoviedb.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-border underline-offset-4 transition-colors hover:text-text-primary"
              >
                TMDB
              </a>
              . This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          )}
          <a
            href="/"
            className="mt-12 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-caption font-medium text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Batch Apps
          </a>
        </Reveal>
      </Frame>
    </Chapter>
  );
}
