import { Star } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { Grow, Reveal } from "../components/motion";
import { Poster } from "../components/Poster";
import { Eyebrow } from "../components/type";
import { formatNumber, plural } from "../format";
import { insight } from "../insights";

function RatingSpread({ dist, at }) {
  const max = Math.max(1, ...dist.map((d) => d.count));
  return (
    <div className="mt-8 max-w-xl" aria-hidden="true">
      <div className="flex h-[16svh] items-end gap-1.5 sm:gap-2">
        {dist.map((d, i) => (
          <div key={d.stars} className="flex h-full flex-1 flex-col justify-end">
            <Grow
              at={at}
              delay={250 + i * 35}
              className={`w-full rounded-t-sm ${d.count === max ? "bg-accent" : "bg-[#3a3a3a]"}`}
              style={{ height: `${Math.max(1.5, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-caption text-text-muted">
        <span>{dist[0]?.stars} stars</span>
        <span>{dist[dist.length - 1]?.stars} stars</span>
      </div>
    </div>
  );
}

export default function FilmTv({ data, meta }) {
  const t = data.totals;
  const media = data.media ?? {};
  const titles = media.top_titles ?? [];
  const [top] = titles;
  const genres = (media.genres ?? []).slice(0, 6);
  const dist = media.rating_dist ?? [];
  const watchPeak = insight(data, "busiest-watch-month");
  const habit = insight(data, "rating-habit");
  const genreLine = insight(data, "top-genre");
  const oldest = insight(data, "oldest-favorite");
  const hasRating = t.avg_rating != null;

  return (
    <Chapter {...meta}>
      <Frame>
        <Beats>
          {/* Beat 1: image-led. The year's favorites as a poster wall, the count as one line. */}
          {/* A beat leaves only when a later beat exists to take the stage. */}
          <Reveal on="enter" at={0.5} out={hasRating ? 0.36 : top ? 0.68 : undefined}>
            <Eyebrow number={meta.number} className="mb-6 sm:mb-8">
              {meta.label}
            </Eyebrow>
            <p className="max-w-3xl text-title text-text-primary">
              {formatNumber(t.titles)} {plural(t.titles, "title")}:{" "}
              <span className="text-secondary">
                {formatNumber(t.movies)} {plural(t.movies, "movie")} and {formatNumber(t.shows)} {plural(t.shows, "show")}.
              </span>
            </p>
            {titles.length > 0 && (
              <ol className="mt-6 grid max-w-3xl grid-cols-5 gap-1.5 sm:mt-8 sm:gap-3" aria-label="Favorites this year">
                {titles.slice(0, 10).map((title, i) => (
                  <Reveal as="li" key={title.tmdb_id ?? title.title} on="enter" at={0.5} delay={200 + i * 60} y={18}>
                    <Poster title={title.title} path={title.poster_path} year={title.release_year} />
                  </Reveal>
                ))}
              </ol>
            )}
            {watchPeak && <p className="mt-6 max-w-2xl text-lede text-secondary">{watchPeak}</p>}
          </Reveal>

          {/* Beat 2: chart-led. How the ratings fell, and what the genres leaned toward. */}
          {hasRating && (
            <Reveal at={0.36} out={top ? 0.7 : undefined}>
              <p className="text-eyebrow uppercase text-text-muted">How it rated</p>
              <p className="mt-5 flex items-center gap-3 text-headline text-text-primary">
                {formatNumber(t.avg_rating, 1, true)}
                <Star className="size-[0.6em] fill-accent text-accent" aria-hidden="true" />
                <span className="text-secondary">average</span>
              </p>
              {habit && <p className="mt-4 max-w-2xl text-lede text-secondary">{habit}</p>}
              {dist.length > 0 && <RatingSpread dist={dist} at={0.36} />}
              {genres.length > 0 && (
                <>
                  {genreLine && <p className="mt-8 max-w-2xl text-lede text-secondary">{genreLine}</p>}
                  <ul className="mt-4 flex max-w-2xl flex-wrap gap-2" aria-label="Top genres">
                    {genres.map((g, i) => (
                      <Reveal
                        as="li"
                        key={g.genre}
                        at={0.36}
                        delay={500 + i * 60}
                        y={10}
                        className={`rounded-full border px-3 py-1.5 text-caption ${
                          i === 0 ? "border-accent/40 bg-accent/10 text-text-primary" : "border-border text-secondary"
                        }`}
                      >
                        {g.genre} <span className="tabular-nums text-text-muted">{formatNumber(g.count)}</span>
                      </Reveal>
                    ))}
                  </ul>
                </>
              )}
            </Reveal>
          )}

          {/* Beat 3: spotlight. One poster, large, beside its title. */}
          {top && (
            <Reveal at={0.7}>
              <div className="grid max-w-3xl grid-cols-[minmax(0,9rem)_1fr] items-end gap-5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-10">
                <Reveal at={0.7} delay={100} y={24}>
                  <Poster title={top.title} path={top.poster_path} year={top.release_year} />
                </Reveal>
                <div>
                  <p className="text-eyebrow uppercase text-text-muted">Top rated this year</p>
                  <p className="mt-4 text-headline text-text-primary">{top.title}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption uppercase tracking-widest text-secondary">
                    <span>{top.media_type === "tv" ? "TV" : "Film"}</span>
                    <span aria-hidden="true" className="h-px w-4 bg-border" />
                    <span>{top.release_year}</span>
                    <span aria-hidden="true" className="h-px w-4 bg-border" />
                    <span className="text-accent">{formatNumber(top.rating, 1)} stars</span>
                  </p>
                </div>
              </div>
              {oldest && <p className="mt-8 max-w-2xl text-lede text-secondary">{oldest}</p>}
            </Reveal>
          )}
        </Beats>
      </Frame>
    </Chapter>
  );
}
