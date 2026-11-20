import { Star } from "lucide-react";
import { Beats, Chapter, Frame } from "../components/Chapter";
import { CountUp, Grow, Reveal } from "../components/motion";
import { Eyebrow, Figure } from "../components/type";
import { formatNumber, plural } from "../format";

function RatingSpread({ dist, at }) {
  const max = Math.max(1, ...dist.map((d) => d.count));
  return (
    <div className="mt-10 max-w-xl" aria-hidden="true">
      <div className="flex h-[18svh] items-end gap-1.5 sm:gap-2">
        {dist.map((d, i) => (
          <div key={d.stars} className="flex h-full flex-1 flex-col justify-end">
            <Grow
              at={at}
              delay={250 + i * 35}
              className={`w-full rounded-t-sm ${d.count === max ? "bg-accent" : "bg-[#2e2e2e]"}`}
              style={{ height: `${Math.max(1.5, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-caption text-secondary">
        <span>{dist[0]?.stars} stars</span>
        <span>{dist[dist.length - 1]?.stars} stars</span>
      </div>
    </div>
  );
}

export default function FilmTv({ data, meta }) {
  const t = data.totals;
  const media = data.media ?? {};
  const [top, ...rest] = media.top_titles ?? [];
  const genres = (media.genres ?? []).slice(0, 3).map((g) => g.genre);
  const dist = media.rating_dist ?? [];

  return (
    <Chapter {...meta}>
      <Frame>
        <Beats>
          <Reveal on="enter" at={0.5} out={0.36}>
            <Eyebrow number={meta.number} className="mb-8 sm:mb-10">
              {meta.label}
            </Eyebrow>
            <Figure
              number={<CountUp value={t.titles} on="enter" at={0.5} />}
              unit={plural(t.titles, "title")}
            />
            <p className="mt-8 max-w-xl text-lede text-secondary">
              {formatNumber(t.movies)} {plural(t.movies, "movie")} and {formatNumber(t.shows)} {plural(t.shows, "show")}
              {genres.length > 0 && `, mostly ${genres.slice(0, -1).join(", ")}${genres.length > 1 ? " and " : ""}${genres.at(-1)}`}.
            </p>
          </Reveal>

          {t.avg_rating != null && (
            <Reveal at={0.36} out={0.7}>
              <p className="flex items-baseline gap-4 text-display text-text-primary">
                {formatNumber(t.avg_rating, 1, true)}
                <Star className="size-[0.4em] self-center fill-accent text-accent" aria-hidden="true" />
              </p>
              <p className="mt-3 text-headline text-text-primary">average rating</p>
              {dist.length > 0 && <RatingSpread dist={dist} at={0.36} />}
            </Reveal>
          )}

          {top && (
            <Reveal at={0.7}>
              <p className="mb-6 text-eyebrow uppercase text-text-muted">Top rated this year</p>
              <p className="text-headline text-text-primary">{top.title}</p>
              <p className="mt-4 flex items-center gap-3 text-caption uppercase tracking-widest text-secondary">
                <span>{top.media_type === "tv" ? "TV" : "Film"}</span>
                <span aria-hidden="true" className="h-px w-4 bg-border" />
                <span>{top.release_year}</span>
                <span aria-hidden="true" className="h-px w-4 bg-border" />
                <span className="text-accent">{formatNumber(top.rating, 1)} stars</span>
              </p>
              {rest.length > 0 && (
                <ol className="mt-10 grid max-w-3xl gap-x-10 gap-y-3 sm:grid-cols-2">
                  {rest.slice(0, 4).map((title, i) => (
                    <Reveal
                      as="li"
                      key={title.tmdb_id ?? title.title}
                      at={0.7}
                      delay={300 + i * 110}
                      y={16}
                      className="flex items-baseline gap-4 text-lede"
                    >
                      <span className="text-caption tabular-nums text-text-muted">{i + 2}</span>
                      <span className="text-text-primary">{title.title}</span>
                    </Reveal>
                  ))}
                </ol>
              )}
            </Reveal>
          )}
        </Beats>
      </Frame>
    </Chapter>
  );
}
